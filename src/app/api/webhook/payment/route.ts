import crypto from 'crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { db } from '@/db';
import { env } from '@/config/env';
import { grantCreditsForOrder } from '@/lib/credits';
import { RAZORPAY_APP_TAG } from '@/config/plans';

/** Constant-time compare so the secret can't be probed by timing. */
const signaturesMatch = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const POST = async (req: Request) => {
  const WEBHOOK_SECRET = env.RAZORPAY_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      new ApiResponse(500, null, 'Razorpay webhook secret not configured'),
      { status: 500 },
    );
  }

  const headerPayload = await headers();
  const razorpaySignature = headerPayload.get('x-razorpay-signature');

  if (!razorpaySignature) {
    return NextResponse.json(
      new ApiResponse(400, null, 'Missing Razorpay signature'),
      { status: 400 },
    );
  }

  const body = await req.text();

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (!signaturesMatch(razorpaySignature, expectedSignature)) {
    return NextResponse.json(new ApiResponse(400, null, 'Invalid signature'), {
      status: 400,
    });
  }

  const payload = JSON.parse(body);
  const event = payload.event;
  const payment = payload.payload?.payment?.entity;
  const razorpayOrderId: string | undefined = payment?.order_id;

  // The Razorpay account is shared with another project, so this webhook also
  // receives its payments. Skip anything our checkout didn't tag. (Razorpay
  // sends empty notes as [], hence the optional chaining.)
  if (payment?.notes?.app !== RAZORPAY_APP_TAG.app) {
    return NextResponse.json(
      new ApiResponse(200, null, `Ignored payment from another app: ${event}`),
      { status: 200 },
    );
  }

  if (!razorpayOrderId) {
    return NextResponse.json(
      new ApiResponse(200, null, `Ignored event without order id: ${event}`),
      { status: 200 },
    );
  }

  let statusToUpdate: 'paid' | 'failed' | null = null;
  if (event === 'payment.captured') {
    statusToUpdate = 'paid';
  } else if (event === 'payment.failed') {
    statusToUpdate = 'failed';
  }

  if (!statusToUpdate) {
    return NextResponse.json(
      new ApiResponse(200, null, `Unhandled event type: ${event}`),
      { status: 200 },
    );
  }

  try {
    // updateMany rather than update: update throws when no row matches, and
    // the Razorpay account also sees payments whose order isn't ours (other
    // apps, payment links). That throw became a 500, Razorpay retried it for
    // 24h and then disabled the webhook. A late payment.failed must also not
    // overwrite an order that has already been paid.
    const updated = await db.order.updateMany({
      where: {
        razorpayOrderId,
        ...(statusToUpdate === 'failed' && { status: { not: 'paid' } }),
      },
      data: {
        status: statusToUpdate,
        razorpayPaymentId: payment.id,
        razorpaySignature,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        new ApiResponse(200, null, `No matching order for ${event}`),
        { status: 200 },
      );
    }

    // The webhook is the authoritative grant path: it arrives even if the
    // buyer closed the tab right after paying.
    if (statusToUpdate === 'paid') {
      await grantCreditsForOrder(razorpayOrderId);
    }

    return NextResponse.json(
      new ApiResponse(200, { success: true }, 'Webhook processed'),
      { status: 200 },
    );
  } catch (err) {
    console.error('Razorpay webhook processing failed:', err);
    // 500 so Razorpay retries; grantCreditsForOrder is idempotent.
    return NextResponse.json(
      new ApiResponse(500, null, 'Webhook processing failed'),
      { status: 500 },
    );
  }
};
