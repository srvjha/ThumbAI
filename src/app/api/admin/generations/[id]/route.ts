import { adminRoute } from '@/server/adminRoute';
import { getGenerationDetail } from '@/server/admin';

export const GET = adminRoute<{ id: string }>(({ params }) =>
  getGenerationDetail(params.id),
);
