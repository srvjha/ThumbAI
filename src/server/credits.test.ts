import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import {
  deductCredits,
  grantCreditsForOrder,
  refundCredits,
} from '@/server/credits';
import {
  createOrder,
  createUser,
  creditsOf,
  resetDb,
} from '../../test/factories';

beforeEach(resetDb);

describe('deductCredits', () => {
  it('charges the balance', async () => {
    const user = await createUser({ credits: 5 });
    await deductCredits(user.id, 3);
    expect(await creditsOf(user.id)).toBe(2);
  });

  it('refuses with 402 when the balance is short, and charges nothing', async () => {
    const user = await createUser({ credits: 2 });
    await expect(deductCredits(user.id, 3)).rejects.toMatchObject({
      statusCode: 402,
    });
    expect(await creditsOf(user.id)).toBe(2);
  });

  it('never overdraws under concurrent charges', async () => {
    const user = await createUser({ credits: 3 });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => deductCredits(user.id, 1)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect(await creditsOf(user.id)).toBe(0);
  });

  it.each([0, -1, 1.5])('rejects a cost of %s', async (cost) => {
    const user = await createUser({ credits: 5 });
    await expect(deductCredits(user.id, cost)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('refundCredits', () => {
  it('returns credits', async () => {
    const user = await createUser({ credits: 0 });
    await refundCredits(user.id, 2);
    expect(await creditsOf(user.id)).toBe(2);
  });

  it('never throws, even for an unknown user', async () => {
    await expect(refundCredits('missing', 2)).resolves.toBeUndefined();
  });
});

describe('grantCreditsForOrder', () => {
  it('tops up the buyer and marks them paid', async () => {
    const user = await createUser({ credits: 1 });
    const order = await createOrder(user.id, { credits: 8 });

    const result = await grantCreditsForOrder(order.razorpayOrderId!);

    expect(result).toEqual({ granted: true, credits: 8 });
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.credits).toBe(9);
    expect(after.plan).toBe('PAID');
  });

  it('grants exactly once when called concurrently', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id, { credits: 8 });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        grantCreditsForOrder(order.razorpayOrderId!),
      ),
    );

    expect(results.filter((r) => r.granted)).toHaveLength(1);
    expect(await creditsOf(user.id)).toBe(8);
  });

  it('ignores an unknown order', async () => {
    await expect(grantCreditsForOrder('order_missing')).resolves.toEqual({
      granted: false,
      credits: 0,
    });
  });
});
