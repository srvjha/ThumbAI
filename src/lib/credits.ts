import { db } from '@/db';

/**
 * Tops up the buyer for a paid order. Safe to call more than once.
 *
 * Both signature-verified payment paths call this — the Razorpay webhook and
 * the checkout's verify call — because either one can be the only one that
 * arrives: the webhook fires even if the browser closed mid-checkout, and the
 * verify call still works if webhook delivery is delayed or not configured.
 *
 * Idempotency comes from a conditional update on credits_granted, which is an
 * atomic compare-and-set: whichever caller flips the flag first is the one
 * that grants, and concurrent callers see a zero row count and stop.
 */
export const grantCreditsForOrder = async (
  razorpayOrderId: string,
): Promise<{ granted: boolean; credits: number }> => {
  const order = await db.order.findUnique({
    where: { razorpayOrderId },
  });

  if (!order) {
    console.error('grantCreditsForOrder: unknown order', razorpayOrderId);
    return { granted: false, credits: 0 };
  }

  if (!order.user_id) {
    // Predates the user_id column; nobody to credit.
    console.error('grantCreditsForOrder: order has no user', order.id);
    return { granted: false, credits: 0 };
  }

  if (order.credits_granted) {
    return { granted: false, credits: order.credits };
  }

  return db.$transaction(async (tx) => {
    // Claim the grant. Losing this race means another caller already did it.
    const claimed = await tx.order.updateMany({
      where: { id: order.id, credits_granted: false },
      data: { credits_granted: true },
    });

    if (claimed.count === 0) {
      return { granted: false, credits: order.credits };
    }

    await tx.user.update({
      where: { id: order.user_id! },
      data: {
        credits: { increment: order.credits },
        plan: 'PAID',
      },
    });

    return { granted: true, credits: order.credits };
  });
};
