import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { apiErrorResponse } from '@/server/errors';
import { requireUser } from '@/server/auth';
import { cancelGeneration } from '@/server/generations/results';

/**
 * POST /api/me/generations/[id]/cancel — stops one of the signed-in user's
 * open generations and refunds its credits. 409 once it has finished.
 */
export const POST = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const user = await requireUser();
    const { id } = await params;
    await cancelGeneration(user.id, id);
    return NextResponse.json(
      new ApiResponse(200, { cancelled: true }, 'Generation cancelled'),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
