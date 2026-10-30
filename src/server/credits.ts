import 'server-only';
import { CREDIT_TX_TYPE, Prisma } from '@prisma/client';
import { db } from '@/db';
import { creditsPerImageForEndpoint } from '@/config/models';
import { ApiError } from '@/server/errors';

/**
 * The credit ledger.
 *
 * Every balance change is a CreditTransaction row, written in the same
 * database transaction as the change to User.credits, so the cached balance
 * and the ledger can never disagree. Nothing else may write User.credits.
 *
 * Idempotency comes from the schema, not from checks in code: the unique
 * (type, order_id) and (type, thumbnail_id) constraints reject a second
 * PURCHASE for one order or a second refund for one generation, and the
 * rejected insert rolls back its balance change with it.
 */

type Tx = Prisma.TransactionClient;

interface CreditChange {
  userId: string;
  type: CREDIT_TX_TYPE;
  /** Signed: positive adds credits, negative removes them. */
  amount: number;
  orderId?: string;
  thumbnailId?: string;
  note?: string;
  /**
   * Refuse a debit the balance cannot cover. Off for clawbacks, which are
   * allowed to take a balance negative.
   */
  requireBalance?: boolean;
}

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

/**
 * Applies one change inside an existing transaction. Returns the new balance.
 * Prefer recordCreditChange unless the change must commit with other writes.
 */
export const applyCreditChange = async (
  tx: Tx,
  change: CreditChange,
): Promise<number> => {
  const { userId, amount, requireBalance } = change;

  if (requireBalance && amount < 0) {
    // The guard lives in the WHERE clause rather than in a read-then-write,
    // so two concurrent charges cannot both pass it and overdraw.
    const charged = await tx.user.updateMany({
      where: { id: userId, credits: { gte: -amount } },
      data: { credits: { increment: amount } },
    });
    if (charged.count === 0) {
      throw new ApiError('Not enough credits', 402);
    }
  } else {
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    });
  }

  const { credits } = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { credits: true },
  });

  await tx.creditTransaction.create({
    data: {
      user_id: userId,
      type: change.type,
      amount,
      balance_after: credits,
      order_id: change.orderId,
      thumbnail_id: change.thumbnailId,
      note: change.note,
    },
  });

  return credits;
};

/**
 * Applies a change in its own transaction.
 *
 * Returns null when the ledger already holds this change (the unique
 * constraint fired): the caller lost a race or is a retry, and nothing moved.
 */
export const recordCreditChange = async (
  change: CreditChange,
): Promise<number | null> => {
  try {
    return await db.$transaction((tx) => applyCreditChange(tx, change));
  } catch (err) {
    if (isUniqueViolation(err)) return null;
    throw err;
  }
};

/** Charges a generation. Throws 402 when the balance cannot cover it. */
export const chargeGeneration = async (
  userId: string,
  thumbnailId: string,
  cost: number,
): Promise<void> => {
  if (!Number.isInteger(cost) || cost < 1) {
    throw new ApiError('Invalid credit cost', 400);
  }

  const applied = await recordCreditChange({
    userId,
    type: CREDIT_TX_TYPE.GENERATION_CHARGE,
    amount: -cost,
    thumbnailId,
    requireBalance: true,
  });

  if (applied === null) {
    throw new ApiError('This generation was already charged', 409);
  }
};

/**
 * Returns exactly what a generation was charged. Safe to call from every
 * failure path at once: only the first refund is recorded.
 *
 * Generations from before the ledger have no charge row; those are refunded
 * at their endpoint's per-image price, as they always were.
 */
export const refundGeneration = async (
  thumbnailId: string,
): Promise<boolean> => {
  const thumbnail = await db.thumbnail.findUnique({
    where: { id: thumbnailId },
    select: {
      user_id: true,
      num_of_images: true,
      model_endpoint: true,
      CreditTransaction: {
        where: { type: CREDIT_TX_TYPE.GENERATION_CHARGE },
        select: { amount: true },
      },
    },
  });
  if (!thumbnail) return false;

  const [charge] = thumbnail.CreditTransaction;
  const amount = charge
    ? -charge.amount
    : (thumbnail.num_of_images ?? 1) *
      creditsPerImageForEndpoint(thumbnail.model_endpoint);

  if (amount <= 0) return false;

  const applied = await recordCreditChange({
    userId: thumbnail.user_id,
    type: CREDIT_TX_TYPE.GENERATION_REFUND,
    amount,
    thumbnailId,
    note: charge ? undefined : 'Pre-ledger generation, refunded at list price',
  });
  return applied !== null;
};

/**
 * Tops up the buyer for a paid order. Safe to call more than once.
 *
 * Both signature-verified payment paths call this — the Razorpay webhook and
 * the checkout's verify call — because either one can be the only one that
 * arrives. The PURCHASE row's unique constraint decides which one grants.
 */
export const grantCreditsForOrder = async (
  razorpayOrderId: string,
): Promise<{ granted: boolean; credits: number }> => {
  const order = await db.order.findUnique({ where: { razorpayOrderId } });

  if (!order) {
    console.error('grantCreditsForOrder: unknown order', razorpayOrderId);
    return { granted: false, credits: 0 };
  }

  if (!order.user_id) {
    // Predates the user_id column; nobody to credit.
    console.error('grantCreditsForOrder: order has no user', order.id);
    return { granted: false, credits: 0 };
  }

  const userId = order.user_id;

  try {
    await db.$transaction(async (tx) => {
      await applyCreditChange(tx, {
        userId,
        type: CREDIT_TX_TYPE.PURCHASE,
        amount: order.credits,
        orderId: order.id,
      });
      await tx.user.update({ where: { id: userId }, data: { plan: 'PAID' } });
    });
    return { granted: true, credits: order.credits };
  } catch (err) {
    if (isUniqueViolation(err))
      return { granted: false, credits: order.credits };
    throw err;
  }
};

/**
 * Takes back the credits of a refunded order. May leave the balance
 * negative: credits already spent are still owed, and a negative balance
 * blocks generation until the user tops up.
 */
export const clawBackOrder = async (orderId: string): Promise<boolean> => {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.user_id || order.credits <= 0) return false;

  const userId = order.user_id;

  try {
    await db.$transaction(async (tx) => {
      await applyCreditChange(tx, {
        userId,
        type: CREDIT_TX_TYPE.ORDER_REFUND_CLAWBACK,
        amount: -order.credits,
        orderId,
      });

      const stillPaid = await tx.order.count({
        where: { user_id: userId, status: 'paid', id: { not: orderId } },
      });
      if (stillPaid === 0) {
        await tx.user.update({ where: { id: userId }, data: { plan: 'FREE' } });
      }
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
};
