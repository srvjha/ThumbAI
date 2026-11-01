import { randomUUID } from 'crypto';
import { Webhook } from 'standardwebhooks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import {
  createCheckoutForPlan,
  processDodoWebhook,
  refundPayment,
  verifyCheckout,
} from '@/server/payments';
import {
  createOrder,
  createUser,
  creditsOf,
  expectLedgerBalanced,
  resetDb,
} from '../../test/factories';

const { createSession, retrievePayment, createRefund } = vi.hoisted(() => ({
  createSession: vi.fn(),
  retrievePayment: vi.fn(),
  createRefund: vi.fn(),
}));
vi.mock('@/config/dodo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/dodo')>()),
  dodo: () => ({
    checkoutSessions: { create: createSession },
    payments: { retrieve: retrievePayment },
    refunds: { create: createRefund },
  }),
}));

const signer = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY!);

const webhookBody = (
  type: string,
  orderId: string,
  metadata: Record<string, string> = { app: 'thumbai', orderId },
) =>
  JSON.stringify({
    business_id: 'bus_1',
    timestamp: new Date().toISOString(),
    type,
    data: { payment_id: 'pay_1', metadata, status: 'succeeded' },
  });

const signedHeaders = (body: string) => {
  const id = `msg_${randomUUID()}`;
  const now = new Date();
  return {
    'webhook-id': id,
    'webhook-timestamp': String(Math.floor(now.getTime() / 1000)),
    'webhook-signature': signer.sign(id, now, body),
  };
};

const deliver = (body: string, headers = signedHeaders(body)) =>
  processDodoWebhook(body, headers);

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

describe('createCheckoutForPlan', () => {
  it('prices from the catalogue and tags the checkout with the order', async () => {
    const user = await createUser();
    createSession.mockResolvedValue({
      session_id: 'cks_1',
      checkout_url: 'https://checkout.test/cks_1',
    });

    const { orderId, checkoutUrl } = await createCheckoutForPlan(
      user,
      'business-elite',
      'https://app.test',
    );

    expect(checkoutUrl).toBe('https://checkout.test/cks_1');
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({
      amount: 499,
      currency: 'USD',
      credits: 20,
      provider: 'dodo',
      providerOrderId: 'cks_1',
      status: 'created',
    });
    const params = createSession.mock.calls[0][0];
    expect(params.product_cart).toEqual([
      { product_id: 'pdt_business_elite_test', quantity: 1 },
    ]);
    expect(params.metadata).toMatchObject({ app: 'thumbai', orderId });
    expect(params.return_url).toBe(`https://app.test/billing?order=${orderId}`);
  });

  it('rejects an unknown plan without calling Dodo', async () => {
    const user = await createUser();
    await expect(
      createCheckoutForPlan(user, 'free', 'https://app.test'),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('marks the order failed when Dodo errors', async () => {
    const user = await createUser();
    createSession.mockRejectedValue(new Error('down'));
    await expect(
      createCheckoutForPlan(user, 'creator-pro', 'https://app.test'),
    ).rejects.toThrow('down');
    const [order] = await db.order.findMany({ where: { user_id: user.id } });
    expect(order.status).toBe('failed');
  });
});

describe('processDodoWebhook', () => {
  it('rejects a missing or wrong signature', async () => {
    const body = webhookBody('payment.succeeded', 'order_x');
    const headers = signedHeaders(body);
    expect(
      (await deliver(body, { ...headers, 'webhook-signature': '' })).status,
    ).toBe(400);
    expect(
      (await deliver(body, { ...headers, 'webhook-signature': 'v1,bad' }))
        .status,
    ).toBe(400);
  });

  it('ignores payments not tagged as ours', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id);

    const outcome = await deliver(
      webhookBody('payment.succeeded', order.id, { orderId: order.id }),
    );

    expect(outcome.status).toBe(200);
    expect(await creditsOf(user.id)).toBe(0);
  });

  it('grants once across duplicate deliveries', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id, { credits: 8 });
    const body = webhookBody('payment.succeeded', order.id);

    await Promise.all([deliver(body), deliver(body), deliver(body)]);

    expect(await creditsOf(user.id)).toBe(8);
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe('paid');
    expect(saved.providerPaymentId).toBe('pay_1');
  });

  it('does not let a late payment.failed overwrite a paid order', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id);

    await deliver(webhookBody('payment.succeeded', order.id));
    await deliver(webhookBody('payment.failed', order.id));

    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe('paid');
  });

  it('answers 200 for an order that does not exist, so Dodo stops retrying', async () => {
    const outcome = await deliver(
      webhookBody('payment.succeeded', randomUUID()),
    );
    expect(outcome.status).toBe(200);
  });
});

describe('verifyCheckout', () => {
  const paymentFor = (orderId: string, status = 'succeeded') => ({
    payment_id: 'pay_1',
    status,
    metadata: { app: 'thumbai', orderId },
  });

  it("hides another user's order", async () => {
    const owner = await createUser();
    const other = await createUser();
    const order = await createOrder(owner.id);

    await expect(
      verifyCheckout(other.id, { orderId: order.id, paymentId: 'pay_1' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(retrievePayment).not.toHaveBeenCalled();
  });

  it('refuses a payment that belongs to a different order', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id);
    retrievePayment.mockResolvedValue(paymentFor('someone-elses-order'));

    await expect(
      verifyCheckout(user.id, { orderId: order.id, paymentId: 'pay_1' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await creditsOf(user.id)).toBe(0);
  });

  it('reports a processing payment as pending and grants nothing', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id);
    retrievePayment.mockResolvedValue(paymentFor(order.id, 'processing'));

    await expect(
      verifyCheckout(user.id, { orderId: order.id, paymentId: 'pay_1' }),
    ).resolves.toMatchObject({ status: 'pending' });
    expect(await creditsOf(user.id)).toBe(0);
  });

  it('grants once when both the return page and the webhook confirm', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id, { credits: 8 });
    retrievePayment.mockResolvedValue(paymentFor(order.id));

    await Promise.all([
      verifyCheckout(user.id, { orderId: order.id, paymentId: 'pay_1' }),
      deliver(webhookBody('payment.succeeded', order.id)),
    ]);

    expect(await creditsOf(user.id)).toBe(8);
  });
});

describe('refundPayment', () => {
  it('refunds through Dodo and takes the credits back, once', async () => {
    createRefund.mockResolvedValue({ refund_id: 'rfnd_1' });
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id, { credits: 8 });
    await deliver(webhookBody('payment.succeeded', order.id));
    expect(await creditsOf(user.id)).toBe(8);

    await refundPayment('pay_1');

    expect(createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ payment_id: 'pay_1' }),
    );
    expect(await creditsOf(user.id)).toBe(0);
    await expect(refundPayment('pay_1')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(createRefund).toHaveBeenCalledTimes(1);
    await expectLedgerBalanced(user.id);
  });
});
