import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { ApiResponse } from "@/utils/ApiResponse";
import { generateThumbnailPrompt } from "@/utils/userFinalPrompt";

function getDimensions(aspectRatio?: string) {
  switch (aspectRatio) {
    case "16:9":
      return { width: 1920, height: 1080 };
    case "9:16":
      return { width: 1080, height: 1920 };
    default:
      return { width: 1024, height: 1024 };
  }
}

export const POST = async (req: NextRequest) => {
  const {
    prompt,
    numImages = 1,
    outputFormat = "jpeg",
    aspectRatio,
    userChoices="",
  } = await req.json();

  const { width, height } = getDimensions(aspectRatio[0]);

  const finalPrompt = generateThumbnailPrompt(
    prompt,
    userChoices,
    aspectRatio[0]
  );

  const result = await fal.subscribe("fal-ai/nano-banana/", {
    input: {
      prompt: finalPrompt,
      num_images: numImages,
      output_format: outputFormat,
      aspect_ratio: aspectRatio,
      width,
      height,
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
