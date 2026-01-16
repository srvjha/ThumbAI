import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { ApiResponse } from '@/utils/ApiResponse';
import { generateThumbnailPrompt } from '@/agent/generateThumbnailPrompt';
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
    choices="random",
    userChoices,
    userId,
    type = 'youtube',
  } = await req.json();

   let userPayload = {
    prompt,
    isValidPrompt: false,
  };

  if(choices === "random" && mode === "normal"){
    userPayload.isValidPrompt = true;
    userPayload.prompt = prompt;
  } else{
    const finalPrompt: FinalPrompt =
    mode === 'normal'
      ? await generateThumbnailPrompt(prompt,"Image-to-Image", userChoices, type)
      : await generateChatPrompt(prompt);

  if (!finalPrompt.valid_prompt) {
    return NextResponse.json(
      new ApiResponse(200, finalPrompt, 'valid prompt not provided'),
    );
  }
  userPayload.isValidPrompt = true;
  userPayload.prompt = finalPrompt.response;
  }
  
  const { request_id } = await fal.queue.submit('fal-ai/nano-banana/edit', {
    input: {
      prompt: userPayload.prompt,
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
        user_original_prompt: prompt,
        input: {
          prompt: userPayload.prompt,
          image_urls: images_urls,
          num_images: mode === "chat" ? numImages[numImages.length-1] : numImages,
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
        requestId: request_id
      },
      'Request Submitted Successfully',
    ),
    { status: 200 },
  );
};
