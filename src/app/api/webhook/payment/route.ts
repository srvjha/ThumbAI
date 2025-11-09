import crypto from 'crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import { db } from '@/db'; // assuming Prisma is used
import { env } from '@/config/env';

export const POST = async (req: Request) => {
  const WEBHOOK_SECRET = env.RAZORPAY_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new ApiError('Razorpay webhook secret required', 404);
  }

  const headerPayload = await headers();
  const razorpaySignature = headerPayload.get('x-razorpay-signature');

  if (!razorpaySignature) {
    throw new ApiError('No Razorpay signature found in headers', 400);
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // console.log("🔔 Razorpay webhook received!");

  // ✅ Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (razorpaySignature !== expectedSignature) {
    // console.error('❌ Invalid Razorpay signature!');
    return NextResponse.json(new ApiResponse(400, null, 'Invalid signature'), {
      status: 400,
    });
  }

  // ✅ Extract event + payment
  const event = payload.event;
  const payment = payload.payload?.payment?.entity;

  // console.log("📦 Event type:", event);

  let statusToUpdate: 'paid' | 'failed' | null = null;

  if (event === 'payment.captured') {
    statusToUpdate = 'paid';
  } else if (event === 'payment.failed') {
    statusToUpdate = 'failed';
  }

  if (statusToUpdate && payment?.order_id) {
    try {
      const updatedOrder = await db.order.update({
        where: { razorpayOrderId: payment.order_id },
        data: {
          status: statusToUpdate,
          razorpayPaymentId: payment.id,
          razorpaySignature,
        },
      });

      // console.log(`✅ Order updated with status: ${statusToUpdate}`, updatedOrder);

      return NextResponse.json(
        new ApiResponse(200, updatedOrder, 'Order updated successfully'),
        { status: 200 },
      );
    } catch (err: any) {
      // console.error('💥 DB update error:', err.message);
      return NextResponse.json(
        new ApiResponse(500, null, 'Database update failed'),
        { status: 500 },
      );
    }
  } else {
    console.warn('⚠️ Unhandled event type or missing payment.order_id:', event);
  }

  return NextResponse.json(new ApiResponse(200, null, 'Webhook received'), {
    status: 200,
  });
};
