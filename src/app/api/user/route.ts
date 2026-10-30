import { apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';

export const GET = async (req: NextRequest) => {
  try {
    const existingUser = await requireUser();

    return NextResponse.json(
      new ApiResponse(200, existingUser, 'User fetched successfully'),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
