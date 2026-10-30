import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  scheduleGenerationSync,
  scheduleStaleReconcile,
} from '@/server/generations/results';
import { ApiResponse } from '@/utils/ApiResponse';
import { ApiError, apiErrorResponse } from '@/server/errors';
import type { GenerationDetail } from '@/components/dashboard/types';
import {
  estimateCredits,
  generationSelect,
  toGenerationItem,
} from '@/server/generations/queries';
import { requireUser } from '@/server/auth';

/** GET /api/me/generations/[id] — one of the signed-in user's generations. */
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Scoped by user_id so another user's id reads as not found.
    const row = await db.thumbnail.findFirst({
      where: { id, user_id: user.id },
      select: {
        ...generationSelect,
        enhanced_ai_prompt: true,
        seed: true,
        content_type: true,
        model_endpoint: true,
        request_id: true,
        CreditTransaction: { select: { amount: true } },
      },
    });

    if (!row) throw new ApiError('Generation not found', 404);

    // This is the endpoint the studio polls; it also nudges a job whose
    // webhook hasn't landed, and settles anything else left open.
    scheduleGenerationSync(row);
    scheduleStaleReconcile(user.id);

    // What it actually cost: the charge net of any refund. Generations from
    // before the ledger have no rows and fall back to the estimate.
    const ledger = row.CreditTransaction;
    const credits = ledger.length
      ? -ledger.reduce((sum, t) => sum + t.amount, 0)
      : estimateCredits(row);

    const detail: GenerationDetail = {
      ...toGenerationItem(row),
      enhanced_prompt: row.enhanced_ai_prompt,
      seed: row.seed,
      content_type: row.content_type,
      estimated_credits: credits,
    };

    return NextResponse.json(
      new ApiResponse(200, detail, 'Generation fetched successfully'),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
