import { db } from '@/db';
import { razorpay } from '@/config/razorpay';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { getPlan, toPaise } from '@/config/plans';
import { requireUser } from '@/lib/auth';
import { grantCreditsForOrder } from '@/lib/credits';
import { apiErrorResponse } from '@/utils/ApiError';

/** Constant-time compare so the secret can't be probed by timing. */
const signaturesMatch = (a: string, b: unknown): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const createOrder = async (req: NextRequest) => {
  try {
    const user = await requireUser();

    const { productId } = await req.json();

    // Price and credits come from the server catalogue, never the request.
    const plan = getPlan(productId);
    if (!plan) {
      return NextResponse.json(
        { success: false, message: 'Unknown plan' },
        { status: 400 },
      );
    }

    const amount = toPaise(plan.priceInRupees);
    const receiptNo = `receipt_${Date.now()}`;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: receiptNo,
      payment_capture: true,
    });

    // Save order in DB
    const order = await db.order.create({
      data: {
        user_id: user.id,
        productId: plan.id,
        productName: plan.name,
        amount,
        credits: plan.credits,
        currency: 'INR',
        razorpayOrderId: razorpayOrder.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        order,
        message: 'Order created successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
};

export const refundOrder = async (req: NextRequest) => {
  try {
    const { paymentId, amount } = await req.json();

    if (!paymentId || !amount) {
      return NextResponse.json(
        { success: false, message: 'Payment ID and amount are required' },
        { status: 400 },
      );
    }
    const razorpayResponse = await razorpay.payments.refund(paymentId, {
      amount: parseInt(amount), // amount in paise
    });

    // Mark order as refunded in DB (best-effort)
    await db.order.updateMany({
      where: { razorpayPaymentId: paymentId },
      data: { status: 'refunded' },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully refunded',
        data: razorpayResponse,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unable to issue refund',
        error: error?.error?.description || error.message,
      },
      { status: 500 },
    );
  }
};

export const verifyPayment = async (req: NextRequest) => {
  try {
    await requireUser();

    const { orderId, paymentId, signature } = await req.json();

    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET as string)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (signaturesMatch(expectedSignature, signature)) {
      // Update order in DB
      await db.order.update({
        where: { razorpayOrderId: orderId },
        data: {
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          status: 'paid',
        },
      });

      // Idempotent, and also driven by the webhook. Doing it here too means
      // credits land immediately instead of waiting on webhook delivery.
      const { credits } = await grantCreditsForOrder(orderId);

      return NextResponse.json({ status: 'success', credits }, { status: 200 });
    } else {
      // Mark order as failed if signature is invalid
      await db.order.updateMany({
        where: { razorpayOrderId: orderId },
        data: { status: 'failed' },
      });

      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 },
    );
  }
};

export const cancelOrder = async (req: NextRequest) => {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 },
      );
    }

    await db.order.updateMany({
      where: { razorpayOrderId: orderId },
      data: { status: 'cancelled' },
    });

    return NextResponse.json(
      { success: true, message: 'Order marked as cancelled' },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unable to cancel order',
        error: error?.message,
      },
      { status: 500 },
    );
  }
};
