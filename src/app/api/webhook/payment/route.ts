import { NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { processDodoWebhook } from '@/server/payments';

/** Dodo Payments webhook. Point the Dodo dashboard at /api/webhook/payment. */
export const POST = async (req: Request) => {
  try {
    const { status, message } = await processDodoWebhook(await req.text(), {
      'webhook-id': req.headers.get('webhook-id') ?? '',
      'webhook-signature': req.headers.get('webhook-signature') ?? '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
    });
    return NextResponse.json(new ApiResponse(status, null, message), {
      status,
    });
  } catch (err) {
    console.error('Dodo webhook processing failed:', err);
    // 500 so Dodo retries; settling an order is idempotent.
    return NextResponse.json(
      new ApiResponse(500, null, 'Webhook processing failed'),
      { status: 500 },
    );
  }
};
