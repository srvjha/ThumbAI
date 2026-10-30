import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { EDIT_MODEL } from '@/config/models';
import {
  chargeGeneration,
  clawBackOrder,
  grantCreditsForOrder,
  refundGeneration,
} from '@/server/credits';
import {
  createGeneration,
  createOrder,
  createUser,
  creditsOf,
  expectLedgerBalanced,
  resetDb,
} from '../../test/factories';

beforeEach(resetDb);

describe('chargeGeneration', () => {
  it('charges the balance and records the charge against the generation', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await createGeneration(user.id);

    await chargeGeneration(user.id, gen.id, 3);

    expect(await creditsOf(user.id)).toBe(2);
    const charge = await db.creditTransaction.findFirstOrThrow({
      where: { thumbnail_id: gen.id },
    });
    expect(charge).toMatchObject({
      type: 'GENERATION_CHARGE',
      amount: -3,
      balance_after: 2,
    });
    await expectLedgerBalanced(user.id);
  });

  it('refuses with 402 when the balance is short, and records nothing', async () => {
    const user = await createUser({ credits: 2 });
    const gen = await createGeneration(user.id);

    await expect(chargeGeneration(user.id, gen.id, 3)).rejects.toMatchObject({
      statusCode: 402,
    });

    expect(await creditsOf(user.id)).toBe(2);
    await expectLedgerBalanced(user.id);
  });

  it('never overdraws under concurrent charges', async () => {
    const user = await createUser({ credits: 3 });
    const gens = await Promise.all(
      Array.from({ length: 10 }, () => createGeneration(user.id)),
    );

    const results = await Promise.allSettled(
      gens.map((gen) => chargeGeneration(user.id, gen.id, 1)),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect(await creditsOf(user.id)).toBe(0);
    await expectLedgerBalanced(user.id);
  });

  it('cannot charge one generation twice', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await createGeneration(user.id);

    await chargeGeneration(user.id, gen.id, 1);
    await expect(chargeGeneration(user.id, gen.id, 1)).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(await creditsOf(user.id)).toBe(4);
    await expectLedgerBalanced(user.id);
  });

  it.each([0, -1, 1.5])('rejects a cost of %s', async (cost) => {
    const user = await createUser({ credits: 5 });
    const gen = await createGeneration(user.id);
    await expect(chargeGeneration(user.id, gen.id, cost)).rejects.toMatchObject(
      { statusCode: 400 },
    );
  });
});

describe('refundGeneration', () => {
  it('returns exactly what was charged, once, however many paths try', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await createGeneration(user.id);
    await chargeGeneration(user.id, gen.id, 3);

    const results = await Promise.all([
      refundGeneration(gen.id),
      refundGeneration(gen.id),
      refundGeneration(gen.id),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await creditsOf(user.id)).toBe(5);
    await expectLedgerBalanced(user.id);
  });

  it('refunds a pre-ledger generation at its list price', async () => {
    const user = await createUser({ credits: 0 });
    const gen = await createGeneration(user.id, {
      numImages: 2,
      endpoint: EDIT_MODEL.endpointId,
    });

    await refundGeneration(gen.id);

    expect(await creditsOf(user.id)).toBe(2 * EDIT_MODEL.creditsPerImage);
    await expectLedgerBalanced(user.id);
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
    await expectLedgerBalanced(user.id);
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
    await expectLedgerBalanced(user.id);
  });

  it('does not re-grant an order the backfill marked as already granted', async () => {
    const user = await createUser({ credits: 8 });
    const order = await createOrder(user.id, { credits: 8 });
    await db.creditTransaction.create({
      data: {
        user_id: user.id,
        type: 'PURCHASE',
        amount: 0,
        balance_after: 8,
        order_id: order.id,
      },
    });

    const result = await grantCreditsForOrder(order.razorpayOrderId!);

    expect(result.granted).toBe(false);
    expect(await creditsOf(user.id)).toBe(8);
  });

  it('ignores an unknown order', async () => {
    await expect(grantCreditsForOrder('order_missing')).resolves.toEqual({
      granted: false,
      credits: 0,
    });
  });
});

describe('clawBackOrder', () => {
  it('takes the credits back even if that leaves the balance negative', async () => {
    const user = await createUser({ credits: 0 });
    const order = await createOrder(user.id, { credits: 8 });
    await grantCreditsForOrder(order.razorpayOrderId!);
    await db.user.update({ where: { id: user.id }, data: { credits: 3 } });
    await db.creditTransaction.create({
      data: {
        user_id: user.id,
        type: 'ADMIN_ADJUSTMENT',
        amount: -5,
        balance_after: 3,
        note: 'stands in for credits spent',
      },
    });
    await db.order.update({
      where: { id: order.id },
      data: { status: 'refunded' },
    });

    expect(await clawBackOrder(order.id)).toBe(true);
    expect(await clawBackOrder(order.id)).toBe(false);

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.credits).toBe(-5);
    expect(after.plan).toBe('FREE');
    await expectLedgerBalanced(user.id);
  });

  it('keeps the plan PAID while another paid order stands', async () => {
    const user = await createUser({ credits: 0 });
    const kept = await createOrder(user.id);
    const refunded = await createOrder(user.id);
    await db.order.update({ where: { id: kept.id }, data: { status: 'paid' } });
    await grantCreditsForOrder(kept.razorpayOrderId!);
    await grantCreditsForOrder(refunded.razorpayOrderId!);

    await clawBackOrder(refunded.id);

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.plan).toBe('PAID');
  });
});
