import { NextRequest, NextResponse } from 'next/server';
import { GEN_STATUS, type Prisma } from '@prisma/client';
import { parseWorkflow } from '@/server/generations/input';
import { db } from '@/db';
import { reconcileStaleGenerations } from '@/server/generations/results';
import { ApiResponse } from '@/utils/ApiResponse';
import { ApiError, apiErrorResponse } from '@/server/errors';
import {
  generationSelect,
  toGenerationItem,
} from '@/server/generations/queries';
import { requireUser } from '@/server/auth';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

const STATUS_FILTERS: Record<string, GEN_STATUS[]> = {
  COMPLETED: [GEN_STATUS.COMPLETED],
  FAILED: [GEN_STATUS.FAILED],
  // Queued and running look the same to the user.
  PENDING: [GEN_STATUS.PENDING, GEN_STATUS.IN_PROGRESS],
};

/**
 * GET /api/me/generations — the signed-in user's generations, newest first.
 *
 * Query: cursor (id of the last item seen), limit, workflow, status
 * (COMPLETED | FAILED | PENDING), aspect_ratio, q (prompt search).
 */
export const GET = async (req: NextRequest) => {
  try {
    const user = await requireUser();
    const params = req.nextUrl.searchParams;

    const limit = Math.min(
      Math.max(Number(params.get('limit')) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const cursor = params.get('cursor');
    const workflow = parseWorkflow(params.get('workflow'));
    const status = params.get('status');
    const aspectRatio = params.get('aspect_ratio');
    const q = params.get('q')?.trim();

    // Own keys only: a bare lookup also matched inherited names like
    // 'constructor'.
    if (status && !Object.hasOwn(STATUS_FILTERS, status)) {
      throw new ApiError('Unknown status', 400);
    }

    // user_id is always part of the filter; nothing else can widen it.
    const where: Prisma.ThumbnailWhereInput = {
      user_id: user.id,
      ...(workflow ? { model_used: workflow } : {}),
      ...(status ? { status: { in: STATUS_FILTERS[status] } } : {}),
      ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
      ...(q
        ? { user_prompt: { contains: q.slice(0, 200), mode: 'insensitive' } }
        : {}),
    };

    // Jobs whose webhook never arrived would otherwise read as running
    // forever; settle them before reading.
    await reconcileStaleGenerations(user.id);

    const rows = await db.thumbnail.findMany({
      where,
      select: generationSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return NextResponse.json(
      new ApiResponse(
        200,
        {
          items: page.map(toGenerationItem),
          nextCursor: hasMore ? page[page.length - 1].id : null,
        },
        'Generations fetched successfully',
      ),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
