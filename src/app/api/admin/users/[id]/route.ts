import { adminRoute } from '@/server/adminRoute';
import { getUserDetail } from '@/server/admin';

export const GET = adminRoute<{ id: string }>(({ params }) =>
  getUserDetail(params.id),
);
