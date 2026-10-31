import { adminRoute } from '@/server/adminRoute';
import { listUsers, parseUserListParams } from '@/server/admin';

/** GET /api/admin/users?q=&role=&plan=&status=&sort=&order=&page= */
export const GET = adminRoute(({ req }) =>
  listUsers(parseUserListParams(req.nextUrl.searchParams)),
);
