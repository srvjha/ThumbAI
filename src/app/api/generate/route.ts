import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/agent/generateThumbnailPrompt';
import { FinalPrompt } from '../edit/route';
import { db } from '@/db';
import { GEN_STATUS, TIER } from '@prisma/client';
import { env } from '@/config/env';
import { requireUser } from '@/lib/auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { ApiError, apiErrorResponse } from '@/utils/ApiError';
import {
  MAX_IMAGES_PER_REQUEST,
  getTextToImageModel,
  isAspectRatio,
  isOutputFormat,
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
      numImages = 1,
      choices = 'random',
      outputFormat = 'jpeg',
      aspectRatio = '16:9',
      userChoices = '',
      workflow,
      tier,
    } = body;

    // Validate before spending anything: these values reach a paid API.
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
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

    const resolvedTier = resolveTier(tier);
    const model = getTextToImageModel(resolvedTier);

    // Run through the selected workflow architecture (Random vs Personalized)
    const finalPrompt: FinalPrompt = await generateThumbnailPrompt(
      prompt,
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
        user_prompt: prompt,
        enhanced_ai_prompt: finalPrompt.response,
        num_of_images: numImages,
        status: GEN_STATUS.PENDING,
        image_url: [],
        content_type: outputFormat,
        aspect_ratio: aspectRatio,
        model_used: workflow,
        model_endpoint: model.endpointId,
        model_tier: resolvedTier === 'quality' ? TIER.QUALITY : TIER.DRAFT,
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
