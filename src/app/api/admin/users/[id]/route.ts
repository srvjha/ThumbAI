import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';
import { requireAdmin } from '@/server/auth';
import { getUserDetail } from '@/server/admin';

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const user = await getUserDetail(id);
    return NextResponse.json(
      new ApiResponse(200, user, 'User fetched successfully'),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
