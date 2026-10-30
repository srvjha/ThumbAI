import { randomUUID } from 'crypto';
import { db } from '@/db';

/** Empties every table, children first. Call in beforeEach. */
export const resetDb = async () => {
  await db.$transaction([
    db.thumbnail.deleteMany(),
    db.order.deleteMany(),
    db.user.deleteMany(),
  ]);
};

export const createUser = (overrides: { credits?: number } = {}) =>
  db.user.create({
    data: {
      email: `${randomUUID()}@example.test`,
      fullName: 'Test User',
      clerk_id: `user_${randomUUID()}`,
      credits: overrides.credits ?? 3,
      last_active_at: new Date(),
    },
  });

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
