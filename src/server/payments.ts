import 'server-only';
import crypto from 'crypto';
import { db } from '@/db';
import { razorpay } from '@/config/razorpay';
import { env } from '@/config/env';
import { getPlan, RAZORPAY_APP_TAG, toPaise } from '@/config/plans';
import { clawBackOrder, grantCreditsForOrder } from '@/server/credits';
import { ApiError } from '@/server/errors';

/** Constant-time compare so the secret can't be probed by timing. */
export const signaturesMatch = (expected: string, actual: unknown): boolean => {
  if (typeof actual !== 'string') return false;
  const bufA = Buffer.from(expected, 'utf8');
  const bufB = Buffer.from(actual, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const hmacHex = (secret: string, data: string): string =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

/** Opens a Razorpay order for a catalogue plan and records it against the user. */
export const createOrderForPlan = async (userId: string, planId: unknown) => {
  // Price and credits come from the server catalogue, never the request.
  const plan = getPlan(planId);
  if (!plan) {
    throw new ApiError('Unknown plan', 400);
  }

  const amount = toPaise(plan.priceInRupees);

  const razorpayOrder = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    payment_capture: true,
    notes: { ...RAZORPAY_APP_TAG, planId: plan.id },
  });

  return db.order.create({
    data: {
      user_id: userId,
      productId: plan.id,
      productName: plan.name,
      amount,
      credits: plan.credits,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
    },
  });
};

/**
 * Confirms a checkout the browser reports as paid, and grants its credits.
 *
 * Idempotent with the webhook path: whichever arrives first grants.
 */
export const verifyCheckout = async (
  userId: string,
  { orderId, paymentId, signature }: Record<string, unknown>,
): Promise<{ credits: number }> => {
  if (typeof orderId !== 'string' || typeof paymentId !== 'string') {
    throw new ApiError('orderId and paymentId are required', 400);
  }

  const order = await db.order.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (!order || order.user_id !== userId) {
    throw new ApiError('Order not found', 404);
  }

  const expected = hmacHex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);

  if (!signaturesMatch(expected, signature)) {
    await db.order.updateMany({
      where: { razorpayOrderId: orderId },
      data: { status: 'failed' },
    });
    throw new ApiError('Invalid signature', 400);
  }

  await db.order.update({
    where: { razorpayOrderId: orderId },
    data: {
      razorpayPaymentId: paymentId,
      razorpaySignature: signature as string,
      status: 'paid',
    },
  });

  // Doing it here too means credits land immediately instead of waiting on
  // webhook delivery.
  const { credits } = await grantCreditsForOrder(orderId);
  return { credits };
};

/** Marks one of the caller's own orders cancelled. */
export const cancelOrder = async (userId: string, orderId: unknown) => {
  if (typeof orderId !== 'string' || !orderId) {
    throw new ApiError('Order ID is required', 400);
  }

  await db.order.updateMany({
    where: { razorpayOrderId: orderId, user_id: userId },
    data: { status: 'cancelled' },
  });
};

/** Refunds a payment in full. Callers must have checked for an admin. */
export const refundPayment = async (paymentId: unknown) => {
  if (typeof paymentId !== 'string' || !paymentId) {
    throw new ApiError('Payment ID is required', 400);
  }

  // Refund the amount actually charged, not one supplied by the caller.
  const order = await db.order.findFirst({
    where: { razorpayPaymentId: paymentId },
  });

  if (!order?.amount) {
    throw new ApiError('Order not found for that payment', 404);
  }
  if (order.status === 'refunded') {
    throw new ApiError('That payment was already refunded', 409);
  }

  const refund = await razorpay.payments.refund(paymentId, {
    amount: order.amount, // paise
  });

  await db.order.update({
    where: { id: order.id },
    data: { status: 'refunded' },
  });

  // The money went back, so the credits it bought come back too — spent or
  // not. Once-only via the ledger, and allowed to leave the balance negative.
  await clawBackOrder(order.id);

  return refund;
};

export type WebhookOutcome = { status: number; message: string };

/**
 * Handles one Razorpay webhook delivery.
 *
 * Throws only for failures worth a retry; everything else resolves to a 2xx
 * or 4xx outcome so Razorpay stops redelivering.
 */
export const processRazorpayWebhook = async (
  rawBody: string,
  signature: string | null,
): Promise<WebhookOutcome> => {
  if (!signature) {
    return { status: 400, message: 'Missing Razorpay signature' };
  }

  const expected = hmacHex(env.RAZORPAY_WEBHOOK_SECRET, rawBody);
  if (!signaturesMatch(expected, signature)) {
    return { status: 400, message: 'Invalid signature' };
  }

  const payload = JSON.parse(rawBody);
  const event = payload.event;
  const payment = payload.payload?.payment?.entity;
  const razorpayOrderId: string | undefined = payment?.order_id;

  // The Razorpay account is shared with another project, so this webhook also
  // receives its payments. Skip anything our checkout didn't tag. (Razorpay
  // sends empty notes as [], hence the optional chaining.)
  if (payment?.notes?.app !== RAZORPAY_APP_TAG.app) {
    return {
      status: 200,
      message: `Ignored payment from another app: ${event}`,
    };
  }

  if (!razorpayOrderId) {
    return { status: 200, message: `Ignored event without order id: ${event}` };
  }

  let statusToUpdate: 'paid' | 'failed' | null = null;
  if (event === 'payment.captured') {
    statusToUpdate = 'paid';
  } else if (event === 'payment.failed') {
    statusToUpdate = 'failed';
  }

  if (!statusToUpdate) {
    return { status: 200, message: `Unhandled event type: ${event}` };
  }

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
      razorpaySignature: signature,
    },
  });

  if (updated.count === 0) {
    return { status: 200, message: `No matching order for ${event}` };
  }

  // The webhook is the authoritative grant path: it arrives even if the
  // buyer closed the tab right after paying.
  if (statusToUpdate === 'paid') {
    await grantCreditsForOrder(razorpayOrderId);
  }

  return { status: 200, message: 'Webhook processed' };
};
