import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/utils/userFinalPrompt';
import { FinalPrompt } from '../edit/route';

export const POST = async (req: NextRequest) => {
  const {
    prompt,
    numImages = 1,
    choices = 'random',
    outputFormat = 'jpeg',
    aspectRatio = '16:9',
    userChoices = '',
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
