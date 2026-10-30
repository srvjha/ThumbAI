import 'server-only';
import { fal } from '@fal-ai/client';
import { GEN_STATUS, MODEL, Prisma, TIER, type User } from '@prisma/client';
import { db } from '@/db';
import { env } from '@/config/env';
import {
  EDIT_MODEL,
  MAX_IMAGES_PER_REQUEST,
  MAX_SEED,
  getTextToImageModel,
  isAspectRatio,
  isOutputFormat,
  isValidSeed,
  randomSeed,
  resolveTier,
} from '@/config/models';
import { ArticleFetchError, fetchArticle } from '@/server/articles';
import { chargeGeneration } from '@/server/credits';
import { markGenerationFailed } from '@/server/generations/results';
import { ApiError } from '@/server/errors';
import {
  MAX_URL_CHARS,
  assertCanAfford,
  assertChoicesSize,
  assertImageUrls,
  assertPromptLength,
  parseWorkflow,
} from '@/server/generations/input';
import { generateThumbnailPrompt } from '@/server/prompts/thumbnailPrompt';
import { generateChatPrompt } from '@/server/prompts/chatPrompt';

export interface FinalPrompt {
  valid_prompt: boolean;
  response: string;
  /** Set by the prompt agent when the image has to be factually right. */
  needs_factual_grounding?: boolean;
}

/**
 * What a submission resolves to. A rejected prompt is not an error: the
 * client shows the agent's explanation in the conversation.
 */
export type SubmitResult =
  | { kind: 'rejected'; prompt: FinalPrompt; message: string }
  | {
      kind: 'submitted';
      requestId: string;
      tier?: string;
      creditsCharged: number;
      seed: number | null;
    };

/** nano-banana-2/edit composites at most 14 reference images. */
const MAX_REFERENCE_IMAGES = 14;

const webhookUrl = () => `${env.NEXT_PUBLIC_FAL_WEBHOOK_URL}/api/fal/webhook`;

const rejected = (response: string, message: string): SubmitResult => ({
  kind: 'rejected',
  prompt: { valid_prompt: false, response },
  message,
});

const assertImageCount = (count: unknown): number => {
  if (
    !Number.isInteger(count) ||
    (count as number) < 1 ||
    (count as number) > MAX_IMAGES_PER_REQUEST
  ) {
    throw new ApiError(
      `numImages must be between 1 and ${MAX_IMAGES_PER_REQUEST}`,
      400,
    );
  }
  return count as number;
};

type GenerationRow = Omit<
  Prisma.ThumbnailUncheckedCreateInput,
  'request_id' | 'user_id' | 'status' | 'image_url'
>;

/**
 * Records the generation, charges for it, then queues it at Fal.
 *
 * The row comes first so the charge has something to belong to: every
 * GENERATION_CHARGE in the ledger points at a generation, and every failure
 * after the charge refunds through that same row, exactly once.
 */
const chargeAndQueue = async (
  userId: string,
  cost: number,
  endpointId: string,
  input: Record<string, unknown>,
  row: GenerationRow,
): Promise<string> => {
  const thumbnail = await db.thumbnail.create({
    data: {
      ...row,
      user_id: userId,
      status: GEN_STATUS.PENDING,
      image_url: [],
    },
  });

  try {
    // Charge before submitting so concurrent requests cannot overdraw.
    await chargeGeneration(userId, thumbnail.id, cost);
  } catch (err) {
    // Nothing was charged and nothing will run: the row is just noise.
    await db.thumbnail.delete({ where: { id: thumbnail.id } });
    throw err;
  }

  try {
    // Queue rather than block: quality-tier generations routinely outlast a
    // serverless function's timeout. Completion arrives via the Fal webhook.
    const { request_id } = await fal.queue.submit(endpointId, {
      input,
      webhookUrl: webhookUrl(),
    });

    if (!request_id) {
      throw new ApiError('Image provider did not accept the request', 502);
    }

    await db.thumbnail.update({
      where: { id: thumbnail.id },
      data: { request_id },
    });
    return request_id;
  } catch (err) {
    // Don't keep the user's money if we never produced an image.
    await markGenerationFailed({ id: thumbnail.id });
    throw err;
  }
};

/** Text-to-image and blog-cover generations. */
export const submitGeneration = async (
  user: User,
  body: Record<string, any>,
): Promise<SubmitResult> => {
  const {
    prompt,
    blogUrl,
    numImages = 1,
    choices = 'random',
    outputFormat = 'jpeg',
    aspectRatio = '16:9',
    userChoices = '',
    tier,
    seed,
  } = body;
  const workflow = parseWorkflow(body.workflow);

  // The blog workflow supplies a URL instead of a prompt: the page is read
  // here and authored once, rather than the client authoring a prompt that
  // this route would then re-author.
  const isBlogWorkflow =
    workflow === MODEL.URL_TO_IMAGE && typeof blogUrl === 'string';

  // Validate before spending anything: these values reach a paid API.
  if (!isBlogWorkflow && (typeof prompt !== 'string' || !prompt.trim())) {
    throw new ApiError('A prompt is required', 400);
  }
  if (isBlogWorkflow) {
    if (blogUrl.length > MAX_URL_CHARS) {
      throw new ApiError('That URL is too long', 400);
    }
  } else {
    assertPromptLength(prompt);
  }
  assertChoicesSize(userChoices);
  if (!isAspectRatio(aspectRatio)) {
    throw new ApiError('Unsupported aspect ratio', 400);
  }
  if (!isOutputFormat(outputFormat)) {
    throw new ApiError('Unsupported output format', 400);
  }
  assertImageCount(numImages);
  if (seed !== undefined && !isValidSeed(seed)) {
    throw new ApiError(
      `seed must be an integer between 0 and ${MAX_SEED}`,
      400,
    );
  }

  const resolvedTier = resolveTier(tier);
  const model = getTextToImageModel(resolvedTier);

  // Only pick a seed where the endpoint honours one, so a recorded seed
  // always reflects what was actually sent.
  const usedSeed = model.supportsSeed ? (seed ?? randomSeed()) : undefined;

  // Refuse before the page fetch and the prompt agent, which both run on
  // our account. The atomic charge is still the real guard.
  const cost = numImages * model.creditsPerImage;
  assertCanAfford(user.credits, cost);

  // What the prompt agent is briefed with, and what we record as the user's
  // own input. They differ for the blog workflow.
  let brief: string = prompt;
  let recordedPrompt: string = prompt;

  if (isBlogWorkflow) {
    let article;
    try {
      article = await fetchArticle(blogUrl);
    } catch (err) {
      // Nothing charged yet. Reported in the same shape as an invalid
      // prompt so the client's existing error path handles it.
      return rejected(
        err instanceof ArticleFetchError
          ? err.message
          : 'Could not read that URL.',
        'could not read that url',
      );
    }

    if (article.text.length < 200 && article.headings.length === 0) {
      return rejected(
        'That page has no readable article text.',
        'no readable article text',
      );
    }

    brief = [
      `URL: ${article.url}`,
      `Title: ${article.title || '(none found)'}`,
      `Meta description: ${article.description || '(none found)'}`,
      'Headings:',
      article.headings.map((h) => `- ${h}`).join('\n') || '(none found)',
      '',
      'Article text:',
      article.text,
    ].join('\n');

    recordedPrompt = blogUrl;
  }

  // Run through the selected workflow architecture (Random vs Personalized)
  const finalPrompt: FinalPrompt = await generateThumbnailPrompt(
    brief,
    workflow || 'TEXT_TO_IMAGE',
    choices === 'random' ? 'random' : 'personalized',
    choices === 'random' ? undefined : userChoices,
  );

  if (!finalPrompt.valid_prompt) {
    // Nothing was charged — the prompt never reached the image model.
    return {
      kind: 'rejected',
      prompt: finalPrompt,
      message: 'valid prompt not provided',
    };
  }

  const requestId = await chargeAndQueue(
    user.id,
    cost,
    model.endpointId,
    model.buildInput({
      prompt: finalPrompt.response,
      aspectRatio,
      numImages,
      outputFormat,
      enableWebSearch: finalPrompt.needs_factual_grounding ?? false,
      seed: usedSeed,
    }),
    {
      user_prompt: recordedPrompt,
      enhanced_ai_prompt: finalPrompt.response,
      num_of_images: numImages,
      content_type: outputFormat,
      aspect_ratio: aspectRatio,
      model_used: workflow ?? null,
      model_endpoint: model.endpointId,
      model_tier: resolvedTier === 'quality' ? TIER.QUALITY : TIER.DRAFT,
      seed: usedSeed ?? null,
    },
  );

  return {
    kind: 'submitted',
    requestId,
    tier: resolvedTier,
    creditsCharged: cost,
    seed: usedSeed ?? null,
  };
};

/** Image-to-image generations and conversational edits of a result. */
export const submitEdit = async (
  user: User,
  body: Record<string, any>,
): Promise<SubmitResult> => {
  const {
    mode,
    prompt,
    numImages = 1,
    outputFormat = 'jpeg',
    images_urls = [],
    aspectRatio = '16:9',
    choices = 'random',
    userChoices,
    seed,
  } = body;
  const workflow = parseWorkflow(body.workflow);

  // Validate before spending anything: these values reach a paid API.
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new ApiError('A prompt is required', 400);
  }
  assertPromptLength(prompt);
  assertChoicesSize(userChoices);
  if (!isAspectRatio(aspectRatio)) {
    throw new ApiError('Unsupported aspect ratio', 400);
  }
  if (!isOutputFormat(outputFormat)) {
    throw new ApiError('Unsupported output format', 400);
  }
  if (seed !== undefined && !isValidSeed(seed)) {
    throw new ApiError(
      `seed must be an integer between 0 and ${MAX_SEED}`,
      400,
    );
  }
  if (!Array.isArray(images_urls)) {
    throw new ApiError('images_urls must be an array', 400);
  }
  if (images_urls.length > MAX_REFERENCE_IMAGES) {
    throw new ApiError(
      `At most ${MAX_REFERENCE_IMAGES} reference images are supported`,
      400,
    );
  }
  const imageUrls = assertImageUrls(images_urls);

  // The chat flow historically sent an array here and then read its last
  // element. Normalise once, up front.
  const imageCount = assertImageCount(
    Array.isArray(numImages) ? numImages[numImages.length - 1] : numImages,
  );

  // Refuse before the prompt agent, which runs on our account. The atomic
  // charge is still the real guard.
  const cost = imageCount * EDIT_MODEL.creditsPerImage;
  assertCanAfford(user.credits, cost);

  const finalPrompt: FinalPrompt =
    mode === 'normal'
      ? await generateThumbnailPrompt(
          prompt,
          workflow || 'IMAGE_TO_IMAGE',
          choices === 'random' ? 'random' : 'personalized',
          choices === 'random' ? undefined : userChoices,
        )
      : await generateChatPrompt(prompt);

  if (!finalPrompt.valid_prompt) {
    return {
      kind: 'rejected',
      prompt: finalPrompt,
      message: 'valid prompt not provided',
    };
  }

  const enhancedPrompt = finalPrompt.response;
  const usedSeed = EDIT_MODEL.supportsSeed ? (seed ?? randomSeed()) : undefined;

  const requestId = await chargeAndQueue(
    user.id,
    cost,
    EDIT_MODEL.endpointId,
    EDIT_MODEL.buildInput({
      prompt: enhancedPrompt,
      aspectRatio,
      numImages: imageCount,
      outputFormat,
      imageUrls,
      enableWebSearch:
        mode === 'normal' && (finalPrompt.needs_factual_grounding ?? false),
      seed: usedSeed,
    }),
    {
      user_prompt: prompt,
      enhanced_ai_prompt: enhancedPrompt,
      num_of_images: imageCount,
      content_type: outputFormat,
      aspect_ratio: aspectRatio,
      model_used:
        workflow || (mode === 'chat' ? 'TEXT_TO_IMAGE' : 'IMAGE_TO_IMAGE'),
      model_endpoint: EDIT_MODEL.endpointId,
      seed: usedSeed ?? null,
    },
  );

  return {
    kind: 'submitted',
    requestId,
    creditsCharged: cost,
    seed: usedSeed ?? null,
  };
};
