import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/utils/userFinalPrompt';
import { generateChatPrompt } from '@/utils/userChatPrompt';
import { db } from '@/db';
import { env } from '@/config/env';

export interface FinalPrompt {
  valid_prompt: boolean;
  response: string;
}

export const POST = async (req: NextRequest) => {
  const {
    mode,
    prompt,
    numImages = 1,
    outputFormat = 'jpeg',
    images_urls = [],
    aspectRatio,
    choices,
    userChoices,
    userId,
  } = await req.json();

  const finalPrompt: FinalPrompt =
    mode === 'normal'
      ? await generateThumbnailPrompt(prompt, choices, userChoices)
      : await generateChatPrompt(prompt);

  if (!finalPrompt.valid_prompt) {
    return NextResponse.json(
      new ApiResponse(200, finalPrompt, 'valid prompt not provided'),
    );
  }

  const { request_id } = await fal.queue.submit('fal-ai/nano-banana/edit', {
    input: {
      prompt: finalPrompt.response,
      image_urls: images_urls,
      num_images: numImages,
      output_format: outputFormat,
    },
    webhookUrl: `${env.NEXT_PUBLIC_FAL_WEBHOOK_URL}/api/fal/webhook`,
  });

  if (request_id) {
    await db.thumbnail.create({
      data: {
        request_id,
        status: 'PENDING',
        user_original_prompt:prompt,
        input: {
          prompt: finalPrompt.response,
          image_urls: images_urls,
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
        requestId: request_id,
      },
      'Request Submitted Successfully',
    ),
    { status: 200 },
  );
};
