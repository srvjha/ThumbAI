import { randomUUID } from 'crypto';
import { db } from '@/db';

/** Empties every table, children first. Call in beforeEach. */
export const resetDb = async () => {
  await db.$transaction([
    db.creditTransaction.deleteMany(),
    db.signupCreditAttempt.deleteMany(),
    db.thumbnail.deleteMany(),
    db.order.deleteMany(),
    db.user.deleteMany(),
  ]);
};

/** A user whose balance is backed by an OPENING_BALANCE ledger row. */
export const createUser = (overrides: { credits?: number } = {}) => {
  const credits = overrides.credits ?? 3;
  return db.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      fullName: 'Test User',
      clerk_id: `user_${randomUUID()}`,
      credits,
      last_active_at: new Date(),
      CreditTransaction: {
        create: {
          type: 'OPENING_BALANCE',
          amount: credits,
          balance_after: credits,
        },
      },
    },
  });
};

export const createGeneration = (
  userId: string,
  overrides: { numImages?: number; endpoint?: string } = {},
) =>
  db.thumbnail.create({
    data: {
      request_id: `req_${randomUUID()}`,
      user_id: userId,
      num_of_images: overrides.numImages ?? 1,
      image_url: [],
      model_endpoint: overrides.endpoint ?? 'fal-ai/nano-banana-2/edit',
    },
  });

/**
 * The ledger's invariant: the cached balance equals the sum of the user's
 * transactions. Every money test should end by checking it.
 */
export const expectLedgerBalanced = async (userId: string) => {
  const [user, sum] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.creditTransaction.aggregate({
      where: { user_id: userId },
      _sum: { amount: true },
    }),
  ]);
  if ((sum._sum.amount ?? 0) !== user.credits) {
    throw new Error(
      `Ledger out of balance: sum ${sum._sum.amount} != credits ${user.credits}`,
    );
  }
};

export const createOrder = (
  userId: string,
  overrides: { credits?: number; razorpayOrderId?: string } = {},
) =>
  db.order.create({
    data: {
      user_id: userId,
      productId: 'creator-pro',
      productName: 'Creator Pro',
      amount: 8000,
      credits: overrides.credits ?? 8,
      razorpayOrderId: overrides.razorpayOrderId ?? `order_${randomUUID()}`,
    },
  });

export const creditsOf = async (userId: string) =>
  (await db.user.findUniqueOrThrow({ where: { id: userId } })).credits;
