import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/utils/userFinalPrompt';
import { FinalPrompt } from '../edit/route';
import { db } from '@/db';

export const POST = async (req: NextRequest) => {
  const {
    prompt,
    numImages = 1,
    choices = 'random',
    outputFormat = 'jpeg',
    aspectRatio = '16:9',
    userChoices = '',
    userId,
  } = await req.json();

  const finalPrompt: FinalPrompt = await generateThumbnailPrompt(
    prompt,
    choices,
    userChoices,
  );

  if (!finalPrompt.valid_prompt) {
    return NextResponse.json(
      new ApiResponse(200, finalPrompt, 'valid prompt not provided'),
    );
  }

  const result = await fal.subscribe('fal-ai/nano-banana/', {
    input: {
      prompt: finalPrompt.response,
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
          request_id:result.requestId,
          status: 'PENDING',
          user_original_prompt:prompt,
          input: {
            prompt: finalPrompt.response,
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
        valid_prompt: finalPrompt.valid_prompt,
        success: true,
        requestId: result.requestId,
        data: result.data,
      },
      'Image generated Successfully',
    ),
    { status: 200 },
  );
};
