import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { ApiResponse } from "@/utils/ApiResponse";
import { queryRewrting } from "@/utils/queryRewrting";

export const POST = async (req: NextRequest) => {
  const {
    prompt,
    numImages = 1,
    outputFormat = "jpeg",
    images_urls = [],
  } = await req.json();

  console.log({images_urls})

  const aspectRatio = "16:9"
  // query rewriting
  const updatedPrompt = await queryRewrting(prompt,aspectRatio);
  console.log({ updatedPrompt });
  const result = await fal.subscribe("fal-ai/nano-banana", {
    input: {
      prompt:updatedPrompt,
      image_urls: images_urls,
      num_images: numImages,
      output_format: outputFormat,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        update.logs?.map((log) => log.message).forEach(console.log);
      }
    },
  });

  return NextResponse.json(
    new ApiResponse(
      200,
      {
        success: true,
        requestId: result.requestId,
        data: result.data,
      },
      "Image generated Successfully"
    ),
    { status: 200 }
  );
};
