import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/agent/generateThumbnailPrompt';
import { FinalPrompt } from '../edit/route';
import { db } from '@/db';

export const POST = async (req: NextRequest) => {
  try {
    const {
      prompt,
      numImages = 1,
      choices = 'random',
      outputFormat = 'jpeg',
      aspectRatio = '16:9',
      userChoices = '',
      userId,
      type = 'youtube',
    } = await req.json();

    let userPayload = {
      prompt,
      isValidPrompt: false,
    };

    if (type === "blog" && choices === "random") {
      userPayload.isValidPrompt = true;
      userPayload.prompt = prompt;
    } else {
      const finalPrompt: FinalPrompt = await generateThumbnailPrompt(
        prompt,
        "Text-to-Image",
        userChoices,
        type as 'youtube' | 'blog',
      );

      if (!finalPrompt.valid_prompt) {
        return NextResponse.json(
          new ApiResponse(200, finalPrompt, 'valid prompt not provided'),
        );
      }

      userPayload.isValidPrompt = true;
      userPayload.prompt = finalPrompt.response;
    }



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
          status: 'PENDING',
          user_original_prompt: prompt,
          input: {
            prompt: userPayload.prompt,
            num_images: numImages,
            output_format: outputFormat,
            aspect_ratio: aspectRatio,
          },
          image_url: null,
          user_id: userId,
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
    console.error('Generate API error:', error);
    return NextResponse.json(
      new ApiResponse(500, null, 'Internal server error'),
      { status: 500 },
    );
  }
};
