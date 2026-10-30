import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { ApiResponse } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';
import type { GenerationDetail } from '@/components/dashboard/types';
import {
  errorResponse,
  estimateCredits,
  generationSelect,
  requireUser,
  toGenerationItem,
} from '../shared';

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
      },
    });

    if (!row) throw new ApiError('Generation not found', 404);

    const detail: GenerationDetail = {
      ...toGenerationItem(row),
      enhanced_prompt: row.enhanced_ai_prompt,
      seed: row.seed,
      content_type: row.content_type,
      estimated_credits: estimateCredits(row),
    };

    return NextResponse.json(
      new ApiResponse(200, detail, 'Generation fetched successfully'),
      { status: 200 },
    );
  } catch (err: any) {
    return errorResponse(err);
  }
};
