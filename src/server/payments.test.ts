import crypto from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { processRazorpayWebhook, verifyCheckout } from '@/server/payments';
import {
  createOrder,
  createUser,
  creditsOf,
  resetDb,
} from '../../test/factories';

const sign = (secret: string, data: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

const webhookBody = (
  event: string,
  orderId: string,
  notes: unknown = { app: 'thumbai' },
) =>
  JSON.stringify({
    event,
    payload: {
      payment: { entity: { id: 'pay_1', order_id: orderId, notes } },
    },
  });

const deliver = (body: string, signature?: string | null) =>
  processRazorpayWebhook(
    body,
    signature === undefined
      ? sign(process.env.RAZORPAY_WEBHOOK_SECRET!, body)
      : signature,
  );

beforeEach(resetDb);

describe('processRazorpayWebhook', () => {
  it('rejects a missing or wrong signature', async () => {
    const body = webhookBody('payment.captured', 'order_x');
    expect((await deliver(body, null)).status).toBe(400);
    expect((await deliver(body, 'bad')).status).toBe(400);
  });

  it("ignores payments another app on the account tagged (or didn't)", async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id);

    // Razorpay sends empty notes as [].
    const outcome = await deliver(
      webhookBody('payment.captured', order.razorpayOrderId!, []),
    );

    expect(outcome.status).toBe(200);
    expect(await creditsOf(user.id)).toBe(0);
  });

  it('grants once across duplicate deliveries', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id, { credits: 8 });
    const body = webhookBody('payment.captured', order.razorpayOrderId!);

    await Promise.all([deliver(body), deliver(body), deliver(body)]);

    expect(await creditsOf(user.id)).toBe(8);
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe('paid');
  });

  it('does not let a late payment.failed overwrite a paid order', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id);

    await deliver(webhookBody('payment.captured', order.razorpayOrderId!));
    await deliver(webhookBody('payment.failed', order.razorpayOrderId!));

    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe('paid');
  });

  it('answers 200 for an order that is not ours, so Razorpay stops retrying', async () => {
    const outcome = await deliver(
      webhookBody('payment.captured', 'order_elsewhere'),
    );
    expect(outcome.status).toBe(200);
  });
});

describe('verifyCheckout', () => {
  const checkoutSignature = (orderId: string, paymentId: string) =>
    sign(process.env.RAZORPAY_KEY_SECRET!, `${orderId}|${paymentId}`);

  it("hides another user's order", async () => {
    const owner = await createUser();
    const other = await createUser();
    const order = await createOrder(owner.id);
    const orderId = order.razorpayOrderId!;

    await expect(
      verifyCheckout(other.id, {
        orderId,
        paymentId: 'pay_1',
        signature: checkoutSignature(orderId, 'pay_1'),
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('marks the order failed on a bad signature and grants nothing', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id);

    await expect(
      verifyCheckout(user.id, {
        orderId: order.razorpayOrderId,
        paymentId: 'pay_1',
        signature: 'forged',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe('failed');
    expect(await creditsOf(user.id)).toBe(0);
  });

  it('grants once when both the checkout and the webhook confirm', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id, { credits: 8 });
    const orderId = order.razorpayOrderId!;

    await Promise.all([
      verifyCheckout(user.id, {
        orderId,
        paymentId: 'pay_1',
        signature: checkoutSignature(orderId, 'pay_1'),
      }),
      deliver(webhookBody('payment.captured', orderId)),
    ]);

    expect(await creditsOf(user.id)).toBe(8);
  });
});
