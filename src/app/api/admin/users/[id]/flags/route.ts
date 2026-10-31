import { adminRoute } from '@/server/adminRoute';
import { resetFlags } from '@/server/admin';

/** DELETE /api/admin/users/:id/flags  Marks every open flag reviewed. */
export const DELETE = adminRoute<{ id: string }>(
  ({ admin, params }) => resetFlags({ userId: params.id, admin }),
  'Flags reset',
);
