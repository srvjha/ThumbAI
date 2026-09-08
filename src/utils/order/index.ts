import { db } from '@/db';
import { razorpay } from '@/config/razorpay';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { getPlan, toPaise } from '@/config/plans';
import { requireUser } from '@/lib/auth';
import { Role } from '@prisma/client';
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
    // Refunds move money out. Admin only.
    const user = await requireUser();
    if (user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 },
      );
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: 'Payment ID is required' },
        { status: 400 },
      );
    }

    // Refund the amount actually charged, not one supplied by the caller.
    const order = await db.order.findFirst({
      where: { razorpayPaymentId: paymentId },
    });

    if (!order?.amount) {
      return NextResponse.json(
        { success: false, message: 'Order not found for that payment' },
        { status: 404 },
      );
    }

    const razorpayResponse = await razorpay.payments.refund(paymentId, {
      amount: order.amount, // amount in paise
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
    const user = await requireUser();

    const { orderId, paymentId, signature } = await req.json();

    const order = await db.order.findUnique({
      where: { razorpayOrderId: orderId },
    });

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

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
    const user = await requireUser();

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 },
      );
    }

    // Scoped to the caller's own orders.
    await db.order.updateMany({
      where: { razorpayOrderId: orderId, user_id: user.id },
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
