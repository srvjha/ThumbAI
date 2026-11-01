import 'server-only';
import type { Payment } from 'dodopayments/resources/payments';
import { Webhook } from 'standardwebhooks';
import { db } from '@/db';
import { dodo, dodoProductId } from '@/config/dodo';
import { env } from '@/config/env';
import { getPlan, PAYMENT_APP_TAG, PLAN_CURRENCY } from '@/config/plans';
import { clawBackOrder, grantCreditsForOrder } from '@/server/credits';
import { ApiError } from '@/server/errors';

/**
 * Opens a Dodo checkout for a catalogue plan and records the order.
 *
 * The order row is written first so its id can ride along in the checkout's
 * metadata and return URL; that id is how the webhook and the return page
 * find it again. Returns the hosted checkout URL to redirect to.
 */
export const createCheckoutForPlan = async (
  user: { id: string; email: string; fullName?: string | null },
  planId: unknown,
  origin: string,
): Promise<{ orderId: string; checkoutUrl: string }> => {
  // Price and credits come from the server catalogue, never the request.
  const plan = getPlan(planId);
  if (!plan) {
    throw new ApiError('Unknown plan', 400);
  }
  const productId = dodoProductId(plan.id);

  const order = await db.order.create({
    data: {
      user_id: user.id,
      productId: plan.id,
      productName: plan.name,
      amount: plan.priceCents,
      credits: plan.credits,
      currency: PLAN_CURRENCY,
      provider: 'dodo',
    },
  });

  try {
    const session = await dodo().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email, name: user.fullName || user.email },
      metadata: { ...PAYMENT_APP_TAG, orderId: order.id, planId: plan.id },
      // Dodo appends payment_id and status to the return URL.
      return_url: `${origin}/billing?order=${order.id}`,
      cancel_url: `${origin}/pricing?cancelled=${order.id}`,
      feature_flags: { allow_discount_code: true },
    });

    if (!session.checkout_url) {
      throw new Error('Dodo returned no checkout URL');
    }

    await db.order.update({
      where: { id: order.id },
      data: { providerOrderId: session.session_id },
    });

    return { orderId: order.id, checkoutUrl: session.checkout_url };
  } catch (err) {
    await db.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    });
    throw err;
  }
};

/** The order a Dodo payment belongs to, if it is one of ours. */
const orderIdOf = (payment: Pick<Payment, 'metadata'>): string | null => {
  const { app, orderId } = payment.metadata ?? {};
  return app === PAYMENT_APP_TAG.app && typeof orderId === 'string'
    ? orderId
    : null;
};

/**
 * Applies a payment's final state to its order, granting credits once paid.
 *
 * Idempotent and shared by the webhook and the return page, so whichever
 * arrives first does the work and the other is a no-op.
 */
const settleOrder = async (
  orderId: string,
  paymentId: string,
  status: 'paid' | 'failed' | 'cancelled',
): Promise<{ matched: boolean; credits: number }> => {
  // updateMany: a missing row must not throw (that would 500 the webhook and
  // trigger retries), and a late failure must not overwrite a paid order.
  const updated = await db.order.updateMany({
    where: {
      id: orderId,
      provider: 'dodo',
      ...(status !== 'paid' && { status: { notIn: ['paid', 'refunded'] } }),
    },
    data: { status, providerPaymentId: paymentId },
  });

  if (updated.count === 0) return { matched: false, credits: 0 };

  if (status !== 'paid') return { matched: true, credits: 0 };

  const { credits } = await grantCreditsForOrder(orderId);
  return { matched: true, credits };
};

/**
 * Confirms a checkout the buyer has just returned from, so credits land
 * without waiting on the webhook.
 *
 * Nothing in the return URL is trusted: the payment is fetched from Dodo and
 * must name this user's order in its metadata.
 */
export const verifyCheckout = async (
  userId: string,
  { orderId, paymentId }: Record<string, unknown>,
): Promise<{ status: 'paid' | 'pending' | 'failed'; credits: number }> => {
  if (typeof orderId !== 'string' || typeof paymentId !== 'string') {
    throw new ApiError('orderId and paymentId are required', 400);
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.user_id !== userId) {
    throw new ApiError('Order not found', 404);
  }
  if (order.status === 'paid') {
    return { status: 'paid', credits: order.credits };
  }

  const payment = await dodo().payments.retrieve(paymentId);
  if (orderIdOf(payment) !== order.id) {
    throw new ApiError('Payment does not match this order', 400);
  }

  if (payment.status === 'succeeded') {
    await settleOrder(order.id, payment.payment_id, 'paid');
    return { status: 'paid', credits: order.credits };
  }
  if (payment.status === 'failed' || payment.status === 'cancelled') {
    await settleOrder(
      order.id,
      payment.payment_id,
      payment.status === 'failed' ? 'failed' : 'cancelled',
    );
    return { status: 'failed', credits: 0 };
  }
  // Still processing; the webhook will settle it.
  return { status: 'pending', credits: 0 };
};

/** Marks one of the caller's own unpaid orders cancelled. */
export const cancelOrder = async (userId: string, orderId: unknown) => {
  if (typeof orderId !== 'string' || !orderId) {
    throw new ApiError('Order ID is required', 400);
  }

  await db.order.updateMany({
    where: { id: orderId, user_id: userId, status: 'created' },
    data: { status: 'cancelled' },
  });
};

/** Refunds a Dodo payment in full. Callers must have checked for an admin. */
export const refundPayment = async (paymentId: unknown) => {
  if (typeof paymentId !== 'string' || !paymentId) {
    throw new ApiError('Payment ID is required', 400);
  }

  const order = await db.order.findFirst({
    where: { providerPaymentId: paymentId },
  });

  if (!order) {
    throw new ApiError('Order not found for that payment', 404);
  }
  if (order.provider !== 'dodo') {
    throw new ApiError(
      'Razorpay-era payments are refunded from the Razorpay dashboard',
      400,
    );
  }
  if (order.status === 'refunded') {
    throw new ApiError('That payment was already refunded', 409);
  }

  // No items: Dodo refunds the full amount actually charged, whatever
  // currency the buyer paid in.
  const refund = await dodo().refunds.create({
    payment_id: paymentId,
    reason: 'Refunded by ThumbAI admin',
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

const SETTLING_EVENTS = {
  'payment.succeeded': 'paid',
  'payment.failed': 'failed',
  'payment.cancelled': 'cancelled',
} as const;

/**
 * Handles one Dodo webhook delivery (Standard Webhooks signing).
 *
 * Throws only for failures worth a retry; everything else resolves to a 2xx
 * or 4xx outcome so Dodo stops redelivering.
 */
export const processDodoWebhook = async (
  rawBody: string,
  headers: Record<string, string>,
): Promise<WebhookOutcome> => {
  const key = env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!key) {
    // Misconfiguration, not a bad request: 500 so Dodo retries once it's set.
    throw new Error('DODO_PAYMENTS_WEBHOOK_KEY is not set');
  }

  let event: { type?: string; data?: Payment };
  try {
    // Verified directly rather than via dodo().webhooks.unwrap, which would
    // also demand the API key.
    new Webhook(key).verify(rawBody, headers);
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, message: 'Invalid signature' };
  }

  const type = event.type ?? 'unknown';
  if (!(type in SETTLING_EVENTS)) {
    return { status: 200, message: `Unhandled event type: ${type}` };
  }

  const payment = event.data;
  const orderId = payment ? orderIdOf(payment) : null;
  if (!payment || !orderId) {
    return {
      status: 200,
      message: `Ignored payment from another app: ${type}`,
    };
  }

  const { matched } = await settleOrder(
    orderId,
    payment.payment_id,
    SETTLING_EVENTS[type as keyof typeof SETTLING_EVENTS],
  );

  return {
    status: 200,
    message: matched ? 'Webhook processed' : `No matching order for ${type}`,
  };
};
