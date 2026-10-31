import { apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { signupRefusal } from '@/server/signupCredits';

export const GET = async (req: NextRequest) => {
  try {
    const existingUser = await requireUser({ allowSuspended: true });
    const signupCreditsRefused = await signupRefusal(existingUser.id);

    return NextResponse.json(
      new ApiResponse(
        200,
        { ...existingUser, signupCreditsRefused },
        'User fetched successfully',
      ),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
