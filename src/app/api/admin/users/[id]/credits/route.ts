import { adminRoute } from '@/server/adminRoute';
import { adjustCredits } from '@/server/admin';

/**
 * POST /api/admin/users/:id/credits  { amount: number, reason: string }
 * Positive amounts add credits, negative remove them.
 */
export const POST = adminRoute<{ id: string }>(
  ({ admin, params, body }) =>
    adjustCredits({
      userId: params.id,
      amount: body.amount,
      reason: body.reason,
      admin,
    }),
  'Credits adjusted',
);
