import { adminRoute } from '@/server/adminRoute';
import { listFlags, parseFlagParams } from '@/server/admin';

/** GET /api/admin/flags?state=open|resolved|all&severity=&source=&page= */
export const GET = adminRoute(({ req }) =>
  listFlags(parseFlagParams(req.nextUrl.searchParams)),
);
