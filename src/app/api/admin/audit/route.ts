import { adminRoute } from '@/server/adminRoute';
import { listAdminActions } from '@/server/admin';

/** GET /api/admin/audit?action=&page= */
export const GET = adminRoute(({ req }) =>
  listAdminActions(req.nextUrl.searchParams),
);
