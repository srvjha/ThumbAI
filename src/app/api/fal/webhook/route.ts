import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { db } from '@/db';
import {
  readFalWebhookHeaders,
  verifyFalWebhook,
} from '@/server/generations/falWebhook';
import {
  extractImageUrls,
  markGenerationFailed,
  storeGenerationResult,
  syncGenerationFromFal,
} from '@/server/generations/results';
import { describeError, logGenerationEvent } from '@/server/generations/events';

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
    select: { id: true },
  });

  if (!thumbnail) {
    // Nothing to attach the result to — most often a delivery meant for
    // another environment. 200 so Fal stops retrying.
    return NextResponse.json(
      new ApiResponse(200, null, 'Unknown request_id, ignored'),
      { status: 200 },
    );
  }

  await logGenerationEvent(thumbnail.id, 'WEBHOOK_RECEIVED', {
    status: typeof body.status === 'string' ? body.status : null,
    images: extractImageUrls(body.payload).length,
    ...(body.error && { error: describeError(body.error) }),
  });

  try {
    // Fal includes the result in the delivery, so the happy path needs no
    // follow-up API call. status 'OK' means the generation succeeded.
    if (body.status === 'OK') {
      const imageUrls = extractImageUrls(body.payload);

      if (imageUrls.length > 0) {
        await storeGenerationResult(requestId, imageUrls);

        return NextResponse.json(
          new ApiResponse(200, { images: imageUrls.length }, 'Result stored'),
          { status: 200 },
        );
      }
      // Succeeded but carried no usable images — fall through and ask the
      // queue rather than marking it complete with nothing.
    }

    if (body.status === 'ERROR') {
      console.error('Fal generation failed', { requestId, error: body.error });
      await markGenerationFailed(
        { request_id: requestId },
        `Provider error: ${describeError(body.error ?? body.payload?.detail ?? 'no detail')}`,
      );

      return NextResponse.json(new ApiResponse(200, null, 'Failure recorded'), {
        status: 200,
      });
    }

    // Anything else: reconcile against the queue, using the endpoint that
    // actually served this request. Shared with the read-path sync so both
    // paths record results identically.
    const outcome = await syncGenerationFromFal(requestId);

    return NextResponse.json(
      new ApiResponse(200, { status: outcome.status }, 'Webhook received'),
      { status: 200 },
    );
  } catch (err) {
    console.error('Fal webhook processing failed:', err);
    // 500 so Fal retries; every path above is safe to run again.
    return NextResponse.json(
      new ApiResponse(500, null, 'Webhook processing failed'),
      { status: 500 },
    );
  }
};
