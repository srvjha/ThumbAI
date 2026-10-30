import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';
import { requireAdmin } from '@/server/auth';
import { listUsers, parseUserListParams } from '@/server/admin';

/** GET /api/admin/users?q=&role=&plan=&sort=&order=&page= */
export const GET = async (req: NextRequest) => {
  try {
    await requireAdmin();
    const result = await listUsers(
      parseUserListParams(req.nextUrl.searchParams),
    );
    return NextResponse.json(
      new ApiResponse(200, result, 'Users fetched successfully'),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
