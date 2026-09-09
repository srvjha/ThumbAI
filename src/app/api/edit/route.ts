import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/agent/generateThumbnailPrompt';
import { generateChatPrompt } from '@/utils/userChatPrompt';
import { db } from '@/db';
import { GEN_STATUS } from '@prisma/client';
import { env } from '@/config/env';
import { requireUser } from '@/lib/auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { ApiError, apiErrorResponse } from '@/utils/ApiError';
import {
  EDIT_MODEL,
  MAX_IMAGES_PER_REQUEST,
  isAspectRatio,
  isOutputFormat,
} from '@/config/models';

export interface FinalPrompt {
  valid_prompt: boolean;
  response: string;
}

/** nano-banana-2/edit composites at most 14 reference images. */
const MAX_REFERENCE_IMAGES = 14;

export const POST = async (req: NextRequest) => {
  let charged: { userId: string; cost: number } | null = null;

  try {
    // The acting user comes from the session. A userId in the body is not a
    // credential and is ignored.
    const user = await requireUser();

    const {
      mode,
      prompt,
      numImages = 1,
      outputFormat = 'jpeg',
      images_urls = [],
      aspectRatio = '16:9',
      choices = 'random',
      userChoices,
      workflow,
    } = await req.json();

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
    if (!Array.isArray(images_urls)) {
      throw new ApiError('images_urls must be an array', 400);
    }
    if (images_urls.length > MAX_REFERENCE_IMAGES) {
      throw new ApiError(
        `At most ${MAX_REFERENCE_IMAGES} reference images are supported`,
        400,
      );
    }

    // The chat flow historically sent an array here and then read its last
    // element. Normalise once, up front.
    const imageCount = Array.isArray(numImages)
      ? numImages[numImages.length - 1]
      : numImages;

    if (
      !Number.isInteger(imageCount) ||
      imageCount < 1 ||
      imageCount > MAX_IMAGES_PER_REQUEST
    ) {
      throw new ApiError(
        `numImages must be between 1 and ${MAX_IMAGES_PER_REQUEST}`,
        400,
      );
    }

    let enhancedPrompt: string;

    if (mode === 'normal') {
      const finalPrompt: FinalPrompt = await generateThumbnailPrompt(
        prompt,
        workflow || 'IMAGE_TO_IMAGE',
        choices === 'random' ? 'random' : 'personalized',
        choices === 'random' ? undefined : userChoices,
      );

      if (!finalPrompt.valid_prompt) {
        return NextResponse.json(
          new ApiResponse(200, finalPrompt, 'valid prompt not provided'),
        );
      }
      enhancedPrompt = finalPrompt.response;
    } else {
      const finalPrompt: FinalPrompt = await generateChatPrompt(prompt);

      if (!finalPrompt.valid_prompt) {
        return NextResponse.json(
          new ApiResponse(200, finalPrompt, 'valid prompt not provided'),
        );
      }
      enhancedPrompt = finalPrompt.response;
    }

    // Charge before submitting so concurrent requests cannot overdraw.
    const cost = imageCount * EDIT_MODEL.creditsPerImage;
    await deductCredits(user.id, cost);
    charged = { userId: user.id, cost };

    const { request_id } = await fal.queue.submit(EDIT_MODEL.endpointId, {
      input: EDIT_MODEL.buildInput({
        prompt: enhancedPrompt,
        aspectRatio,
        numImages: imageCount,
        outputFormat,
        imageUrls: images_urls,
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
        enhanced_ai_prompt: enhancedPrompt,
        num_of_images: imageCount,
        status: GEN_STATUS.PENDING,
        image_url: [],
        content_type: outputFormat,
        aspect_ratio: aspectRatio,
        model_used:
          workflow || (mode === 'chat' ? 'TEXT_TO_IMAGE' : 'IMAGE_TO_IMAGE'),
        model_endpoint: EDIT_MODEL.endpointId,
      },
    });

    return NextResponse.json(
      new ApiResponse(
        200,
        {
          valid_prompt: true,
          success: true,
          requestId: request_id,
          creditsCharged: cost,
        },
        'Request Submitted Successfully',
      ),
      { status: 200 },
    );
  } catch (error) {
    // Don't keep the user's money if we never produced an image.
    if (charged) {
      await refundCredits(charged.userId, charged.cost);
    }
    console.error('Edit API error:', error);
    return apiErrorResponse(error);
  }
};
