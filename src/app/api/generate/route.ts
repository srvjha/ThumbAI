import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/agent/generateThumbnailPrompt';
import { FinalPrompt } from '../edit/route';
import { db } from '@/db';
import { requireUser } from '@/lib/auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { apiErrorResponse } from '@/utils/ApiError';

export const POST = async (req: NextRequest) => {
  let charged: { userId: string; cost: number } | null = null;

  try {
    // The acting user comes from the session. A userId in the body is not a
    // credential and is ignored.
    const user = await requireUser();

    const {
      prompt,
      numImages = 1,
      choices = 'random',
      outputFormat = 'jpeg',
      aspectRatio = '16:9',
      userChoices = '',
      workflow,
    } = await req.json();

    let userPayload = {
      prompt,
      isValidPrompt: false,
    };

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

    userPayload.isValidPrompt = true;
    userPayload.prompt = finalPrompt.response;

    // Charge before submitting so concurrent requests cannot overdraw.
    const cost = numImages;
    await deductCredits(user.id, cost);
    charged = { userId: user.id, cost };

    const result = await fal.subscribe('fal-ai/nano-banana/', {
      input: {
        prompt: userPayload.prompt,
        num_images: numImages,
        output_format: outputFormat,
        aspect_ratio: aspectRatio,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs?.map((log) => log.message).forEach(console.log);
        }
      },
    });

    if (result?.requestId) {
      await db.thumbnail.create({
        data: {
          request_id: result.requestId,
          user_id: user.id,
          user_prompt: prompt,
          enhanced_ai_prompt: userPayload.prompt,
          num_of_images: numImages,
          status: ['PENDING'],
          image_url: [],
          content_type: outputFormat,
          aspect_ratio: aspectRatio,
          model_used: workflow,
        },
      });
    }

    return NextResponse.json(
      new ApiResponse(
        200,
        {
          valid_prompt: userPayload.isValidPrompt,
          success: true,
          requestId: result.requestId,
          data: result.data,
        },
        'Image generated Successfully',
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
