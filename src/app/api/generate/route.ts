import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { ApiResponse } from "@/utils/ApiResponse";
import { queryRewrting } from "@/utils/prompts/aspectRatio";

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

function buildStrictPrompt(
  basePrompt: string,
  aspectRatio: string,
  width: number,
  height: number
) {
  if (aspectRatio === "16:9") {
    return `${basePrompt}. The image must strictly be generated in 16:9 widescreen landscape format at exactly ${width}x${height} pixels. The main subject must be horizontally centered with balanced spacing on the left and right, using a wide cinematic frame. The composition should utilize the horizontal width fully, ensuring the scene feels expansive, while keeping the subject in clear focus in the center region of the frame. No cropping, padding, or resizing is allowed.`;
  }
  if (aspectRatio === "9:16") {
    return `${basePrompt}. The image must strictly be generated in 9:16 vertical portrait format at exactly ${width}x${height} pixels. The main subject must be vertically centered, filling the middle portion of the frame, with adequate spacing above and below. The composition should emphasize height and focus on a tall, vertical framing that works naturally for mobile screens. The subject must remain clearly visible in the vertical center without being cut off. No cropping, padding, or resizing is allowed.`;
  }
  return basePrompt;
}

export const POST = async (req: NextRequest) => {
  const {
    prompt,
    numImages = 1,
    outputFormat = "jpeg",
    aspectRatio,
  } = await req.json();

  const { width, height } = getDimensions(aspectRatio[0]);
  const basePrompt = await queryRewrting(prompt, aspectRatio[0]);
  const updatedPrompt = buildStrictPrompt(
    basePrompt,
    aspectRatio[0],
    width,
    height
  );

  console.log({updatedPrompt})

  const result = await fal.subscribe("fal-ai/nano-banana", {
    input: {
      prompt: updatedPrompt,
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
