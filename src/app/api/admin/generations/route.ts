import { adminRoute } from '@/server/adminRoute';
import { listGenerations, parseGenerationParams } from '@/server/admin';

/** GET /api/admin/generations?q=&status=&workflow=&tier=&flagged=&page= */
export const GET = adminRoute(({ req }) =>
  listGenerations(parseGenerationParams(req.nextUrl.searchParams)),
);
