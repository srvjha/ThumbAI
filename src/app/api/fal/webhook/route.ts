import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { fal } from '@fal-ai/client';
import { db } from '@/db';

export const POST = async (req: NextRequest) => {
  const body = await req.json();
  const { request_id } = body;

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
        status: 'COMPLETED',
        image_url: result.data.images[0].url,
      },
    });
  } else {
    await db.thumbnail.update({
      where: { request_id },
      data: { status: requestStatus.status },
    });
  }

  return NextResponse.json(
    new ApiResponse(200, { success: true }, 'Webhook received'),
    { status: 200 },
  );
};
