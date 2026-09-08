import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { fal } from '@fal-ai/client';
import { db } from '@/db';
import { readFalWebhookHeaders, verifyFalWebhook } from '@/lib/falWebhook';

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
  const { request_id } = body;

  if (!request_id) {
    return NextResponse.json(
      new ApiResponse(400, null, 'Missing request_id'),
      { status: 400 },
    );
  }

  const requestStatus = await fal.queue.status('fal-ai/nano-banana/edit', {
    requestId: request_id,
    logs: true,
  });
  if (requestStatus.status === 'COMPLETED') {
    const result = await fal.queue.result('fal-ai/nano-banana/edit', {
      requestId: request_id,
    });

    // save/update Thumbnail in DB
    await db.thumbnail.update({
      where: { request_id },
      data: {
        status: ['COMPLETED'],
        image_url: [result.data.images[0].url],
      },
    });
  } else {
    await db.thumbnail.update({
      where: { request_id },
      data: { status: [requestStatus.status] },
    });
  }

  return NextResponse.json(
    new ApiResponse(200, { success: true }, 'Webhook received'),
    { status: 200 },
  );
};
