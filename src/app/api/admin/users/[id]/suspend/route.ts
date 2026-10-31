import { adminRoute } from '@/server/adminRoute';
import { setSuspended } from '@/server/admin';

/** POST /api/admin/users/:id/suspend  { suspended: boolean, reason?: string } */
export const POST = adminRoute<{ id: string }>(
  ({ admin, params, body }) =>
    setSuspended({
      userId: params.id,
      suspended: body.suspended === true,
      reason: body.reason,
      admin,
    }),
  'Suspension updated',
);
