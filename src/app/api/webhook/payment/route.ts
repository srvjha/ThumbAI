import { NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { processRazorpayWebhook } from '@/server/payments';

export const POST = async (req: Request) => {
  try {
    const { status, message } = await processRazorpayWebhook(
      await req.text(),
      req.headers.get('x-razorpay-signature'),
    );
    return NextResponse.json(new ApiResponse(status, null, message), {
      status,
    });
  } catch (err) {
    console.error('Razorpay webhook processing failed:', err);
    // 500 so Razorpay retries; granting credits is idempotent.
    return NextResponse.json(
      new ApiResponse(500, null, 'Webhook processing failed'),
      { status: 500 },
    );
  }
};
