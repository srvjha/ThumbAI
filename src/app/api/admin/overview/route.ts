import { adminRoute } from '@/server/adminRoute';
import { getOverview, parseRange } from '@/server/adminOverview';

/** GET /api/admin/overview?range=7|30|90 */
export const GET = adminRoute(({ req }) =>
  getOverview(parseRange(req.nextUrl.searchParams.get('range'))),
);
