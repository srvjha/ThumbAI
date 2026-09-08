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
import { apiErrorResponse } from '@/utils/ApiError';

export interface FinalPrompt {
  valid_prompt: boolean;
  response: string;
}

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
      aspectRatio,
      choices = 'random',
      userChoices,
      workflow,
    } = await req.json();

    let userPayload = {
      prompt,
      isValidPrompt: false,
    };

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
      userPayload.isValidPrompt = true;
      userPayload.prompt = finalPrompt.response;
    } else {
      const finalPrompt: FinalPrompt = await generateChatPrompt(prompt);

      if (!finalPrompt.valid_prompt) {
        return NextResponse.json(
          new ApiResponse(200, finalPrompt, 'valid prompt not provided'),
        );
      }
      userPayload.isValidPrompt = true;
      userPayload.prompt = finalPrompt.response;
    }

    const imageCount =
      mode === 'chat' && Array.isArray(numImages)
        ? numImages[numImages.length - 1]
        : numImages;

    // Charge before submitting so concurrent requests cannot overdraw.
    await deductCredits(user.id, imageCount);
    charged = { userId: user.id, cost: imageCount };

    const { request_id } = await fal.queue.submit('fal-ai/nano-banana/edit', {
      input: {
        prompt: userPayload.prompt,
        image_urls: images_urls,
        num_images: imageCount,
        output_format: outputFormat,
      },
      webhookUrl: `${env.NEXT_PUBLIC_FAL_WEBHOOK_URL}/api/fal/webhook`,
    });

    if (request_id) {
      await db.thumbnail.create({
        data: {
          request_id,
          user_id: user.id,
          user_prompt: prompt,
          enhanced_ai_prompt: userPayload.prompt,
          num_of_images: imageCount,
          status: GEN_STATUS.PENDING,
          image_url: [],
          content_type: outputFormat,
          aspect_ratio: aspectRatio ?? '16:9',
          model_used:
            workflow || (mode === 'chat' ? 'TEXT_TO_IMAGE' : 'IMAGE_TO_IMAGE'),
        },
      });
    }

    return NextResponse.json(
      new ApiResponse(
        200,
        {
          valid_prompt: userPayload.isValidPrompt,
          success: true,
          requestId: request_id,
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
