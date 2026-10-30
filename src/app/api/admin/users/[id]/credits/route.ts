import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';
import { requireAdmin } from '@/server/auth';
import { adjustCredits } from '@/server/admin';

/**
 * POST /api/admin/users/:id/credits  { amount: number, reason: string }
 * Positive amounts add credits, negative remove them.
 */
export const POST = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = await req.json().catch(() => {
      throw new ApiError('Invalid JSON body', 400);
    });
    const result = await adjustCredits({
      userId: id,
      amount: body?.amount,
      reason: body?.reason,
      adminEmail: admin.email,
    });
    return NextResponse.json(new ApiResponse(200, result, 'Credits adjusted'), {
      status: 200,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
};
