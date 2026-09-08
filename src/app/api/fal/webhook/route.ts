import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { fal } from '@fal-ai/client';
import { db } from '@/db';
import { readFalWebhookHeaders, verifyFalWebhook } from '@/lib/falWebhook';
import { refundCredits } from '@/lib/credits';
import { GEN_STATUS } from '@prisma/client';

interface FalImage {
  url?: string;
}

const extractImageUrls = (payload: unknown): string[] => {
  const images = (payload as { images?: FalImage[] } | null)?.images;
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => image?.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
};

export const POST = async (req: NextRequest) => {
  // Raw body: the signature covers the exact bytes Fal sent, so this must be
  // read as text and parsed afterwards rather than via req.json().
  const rawBody = await req.text();

  const verified = await verifyFalWebhook(
    readFalWebhookHeaders(req.headers),
    rawBody,
  );

  if (!verified) {
    return NextResponse.json(new ApiResponse(401, null, 'Invalid signature'), {
      status: 401,
    });
  }

  const body = JSON.parse(rawBody);
  const requestId: string | undefined = body?.request_id;

  if (!requestId) {
    return NextResponse.json(new ApiResponse(400, null, 'Missing request_id'), {
      status: 400,
    });
  }

  const thumbnail = await db.thumbnail.findUnique({
    where: { request_id: requestId },
  });

  if (!thumbnail) {
    // Nothing to attach the result to. 200 so Fal stops retrying.
    return NextResponse.json(
      new ApiResponse(200, null, 'Unknown request_id, ignored'),
      { status: 200 },
    );
  }

  try {
    // Fal delivers the result in the webhook body, so the happy path needs no
    // follow-up call. status 'OK' means the generation succeeded.
    if (body.status === 'OK') {
      const imageUrls = extractImageUrls(body.payload);

      if (imageUrls.length > 0) {
        await db.thumbnail.update({
          where: { request_id: requestId },
          data: {
            status: GEN_STATUS.COMPLETED,
            // Every image, not just the first. Asking for 4 previously
            // persisted 1 while charging for all 4.
            image_url: imageUrls,
          },
        });

        return NextResponse.json(
          new ApiResponse(200, { images: imageUrls.length }, 'Result stored'),
          { status: 200 },
        );
      }

      // Succeeded but the payload had no usable images — fall through to the
      // queue lookup below rather than marking it complete with nothing.
    }

    if (body.status === 'ERROR') {
      await db.thumbnail.update({
        where: { request_id: requestId },
        data: { status: GEN_STATUS.FAILED },
      });

      // The user was charged at submit time and got nothing back.
      const cost = thumbnail.num_of_images ?? 1;
      await refundCredits(thumbnail.user_id, cost);

      console.error('Fal generation failed', { requestId, error: body.error });

      return NextResponse.json(
        new ApiResponse(200, null, 'Failure recorded'),
        { status: 200 },
      );
    }

    // Fallback: ask the queue directly, using the endpoint that actually
    // served this request. This previously hardcoded the image-to-image
    // endpoint for every workflow, so text-to-image lookups were wrong.
    const endpointId = thumbnail.model_endpoint;

    if (!endpointId) {
      console.error('No model_endpoint recorded for request', requestId);
      return NextResponse.json(
        new ApiResponse(200, null, 'No endpoint recorded, ignored'),
        { status: 200 },
      );
    }

    const requestStatus = await fal.queue.status(endpointId, {
      requestId,
      logs: true,
    });

    if (requestStatus.status === 'COMPLETED') {
      const result = await fal.queue.result(endpointId, { requestId });
      const imageUrls = extractImageUrls(result.data);

      await db.thumbnail.update({
        where: { request_id: requestId },
        data: {
          status: imageUrls.length
            ? GEN_STATUS.COMPLETED
            : GEN_STATUS.FAILED,
          image_url: imageUrls,
        },
      });

      if (imageUrls.length === 0) {
        await refundCredits(thumbnail.user_id, thumbnail.num_of_images ?? 1);
      }
    } else {
      await db.thumbnail.update({
        where: { request_id: requestId },
        data: { status: GEN_STATUS.IN_PROGRESS },
      });
    }

    return NextResponse.json(
      new ApiResponse(200, { success: true }, 'Webhook received'),
      { status: 200 },
    );
  } catch (err) {
    console.error('Fal webhook processing failed:', err);
    // 500 so Fal retries; the handler is safe to run again.
    return NextResponse.json(
      new ApiResponse(500, null, 'Webhook processing failed'),
      { status: 500 },
    );
  }
};
