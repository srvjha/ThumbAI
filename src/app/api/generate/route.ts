import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/agent/generateThumbnailPrompt';
import { FinalPrompt } from '../edit/route';
import { db } from '@/db';
import { GEN_STATUS, MODEL, TIER } from '@prisma/client';
import { ArticleFetchError, fetchArticle } from '@/lib/fetchArticle';
import { env } from '@/config/env';
import { requireUser } from '@/lib/auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { ApiError, apiErrorResponse } from '@/utils/ApiError';
import {
  MAX_IMAGES_PER_REQUEST,
  getTextToImageModel,
  isAspectRatio,
  isOutputFormat,
  isValidSeed,
  randomSeed,
  resolveTier,
} from '@/config/models';

export const POST = async (req: NextRequest) => {
  let charged: { userId: string; cost: number } | null = null;

  try {
    // The acting user comes from the session. A userId in the body is not a
    // credential and is ignored.
    const user = await requireUser();

    const body = await req.json();
    const {
      prompt,
      blogUrl,
      numImages = 1,
      choices = 'random',
      outputFormat = 'jpeg',
      aspectRatio = '16:9',
      userChoices = '',
      workflow,
      tier,
      seed,
    } = body;

    // The blog workflow supplies a URL instead of a prompt: the page is read
    // here and authored once, rather than the client authoring a prompt that
    // this route would then re-author.
    const isBlogWorkflow =
      workflow === MODEL.URL_TO_IMAGE && typeof blogUrl === 'string';

    // Validate before spending anything: these values reach a paid API.
    if (!isBlogWorkflow && (typeof prompt !== 'string' || !prompt.trim())) {
      throw new ApiError('A prompt is required', 400);
    }
    if (!isAspectRatio(aspectRatio)) {
      throw new ApiError('Unsupported aspect ratio', 400);
    }
    if (!isOutputFormat(outputFormat)) {
      throw new ApiError('Unsupported output format', 400);
    }
    if (
      !Number.isInteger(numImages) ||
      numImages < 1 ||
      numImages > MAX_IMAGES_PER_REQUEST
    ) {
      throw new ApiError(
        `numImages must be between 1 and ${MAX_IMAGES_PER_REQUEST}`,
        400,
      );
    }

    if (seed !== undefined && !isValidSeed(seed)) {
      throw new ApiError('seed must be an integer between 0 and 2^32-1', 400);
    }

    const resolvedTier = resolveTier(tier);
    const model = getTextToImageModel(resolvedTier);

    // Only pick a seed where the endpoint honours one, so a recorded seed
    // always reflects what was actually sent.
    const usedSeed = model.supportsSeed ? (seed ?? randomSeed()) : undefined;

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
        return NextResponse.json(
          new ApiResponse(
            200,
            {
              valid_prompt: false,
              response:
                err instanceof ArticleFetchError
                  ? err.message
                  : 'Could not read that URL.',
            },
            'could not read that url',
          ),
        );
      }

      if (article.text.length < 200 && article.headings.length === 0) {
        return NextResponse.json(
          new ApiResponse(
            200,
            {
              valid_prompt: false,
              response: 'That page has no readable article text.',
            },
            'no readable article text',
          ),
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
      return NextResponse.json(
        new ApiResponse(200, finalPrompt, 'valid prompt not provided'),
      );
    }

    // Charge before submitting so concurrent requests cannot overdraw.
    const cost = numImages * model.creditsPerImage;
    await deductCredits(user.id, cost);
    charged = { userId: user.id, cost };

    // Queue rather than block: quality-tier generations routinely outlast a
    // serverless function's timeout. Completion arrives via the Fal webhook.
    const { request_id } = await fal.queue.submit(model.endpointId, {
      input: model.buildInput({
        prompt: finalPrompt.response,
        aspectRatio,
        numImages,
        outputFormat,
        enableWebSearch: finalPrompt.needs_factual_grounding ?? false,
        seed: usedSeed,
      }),
      webhookUrl: `${env.NEXT_PUBLIC_FAL_WEBHOOK_URL}/api/fal/webhook`,
    });

    if (!request_id) {
      throw new ApiError('Image provider did not accept the request', 502);
    }

    await db.thumbnail.create({
      data: {
        request_id,
        user_id: user.id,
        user_prompt: recordedPrompt,
        enhanced_ai_prompt: finalPrompt.response,
        num_of_images: numImages,
        status: GEN_STATUS.PENDING,
        image_url: [],
        content_type: outputFormat,
        aspect_ratio: aspectRatio,
        model_used: workflow,
        model_endpoint: model.endpointId,
        model_tier: resolvedTier === 'quality' ? TIER.QUALITY : TIER.DRAFT,
        seed: usedSeed ?? null,
      },
    });

    return NextResponse.json(
      new ApiResponse(
        200,
        {
          valid_prompt: true,
          success: true,
          requestId: request_id,
          tier: resolvedTier,
          creditsCharged: cost,
          seed: usedSeed ?? null,
        },
        'Request submitted successfully',
      ),
      { status: 200 },
    );
  } catch (error) {
    // Don't keep the user's money if we never produced an image.
    if (charged) {
      await refundCredits(charged.userId, charged.cost);
    }
    console.error('Generate API error:', error);
    return apiErrorResponse(error);
  }
};
