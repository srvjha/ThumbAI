import 'server-only';
import { after } from 'next/server';
import { fal } from '@fal-ai/client';
import { db } from '@/db';
import { GEN_STATUS } from '@prisma/client';
import { refundGeneration } from '@/server/credits';
import { claimWindow } from '@/server/rateLimit';
import { logGenerationEvent } from '@/server/generations/events';
import { ApiError } from '@/server/errors';

/**
 * Recording generation results.
 *
 * The Fal webhook is the fast path, but it cannot be the only one. If a
 * delivery is lost — a tunnel that is not running in development, a
 * misconfigured NEXT_PUBLIC_FAL_WEBHOOK_URL, a transient failure in
 * production — the row stays PENDING forever and the user has already been
 * charged. syncGenerationFromFal() closes that hole by asking Fal directly.
 */

interface FalImage {
  url?: string;
}

export const extractImageUrls = (payload: unknown): string[] => {
  const images = (payload as { images?: FalImage[] } | null)?.images;
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => image?.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
};

const OPEN: GEN_STATUS[] = [GEN_STATUS.PENDING, GEN_STATUS.IN_PROGRESS];

export const storeGenerationResult = async (
  requestId: string,
  imageUrls: string[],
  via: 'webhook' | 'poll' = 'webhook',
): Promise<void> => {
  const completedAt = new Date();
  // Only an open row completes. A generation already given up on has been
  // refunded; flipping it to COMPLETED would hand out free images.
  const stored = await db.thumbnail.updateMany({
    where: { request_id: requestId, status: { in: OPEN } },
    data: {
      status: GEN_STATUS.COMPLETED,
      // Every image, not just the first.
      image_url: imageUrls,
      completed_at: completedAt,
    },
  });
  if (stored.count === 0) return;

  const row = await db.thumbnail.findUnique({
    where: { request_id: requestId },
    select: { id: true, createdAt: true },
  });
  if (row) {
    await logGenerationEvent(row.id, 'COMPLETED', {
      via,
      images: imageUrls.length,
      latencyMs: completedAt.getTime() - row.createdAt.getTime(),
    });
  }
};

/** Marks a generation failed and returns exactly what it was charged. */
export const markGenerationFailed = async (
  where: { request_id: string } | { id: string },
  reason = 'Unknown failure',
): Promise<void> => {
  const thumbnail = await db.thumbnail.findFirst({
    where,
    select: { id: true },
  });

  if (!thumbnail) return;

  // Conditional on the row still being open, so a completed generation is
  // never failed. The refund itself is once-only via the ledger.
  const claimed = await db.thumbnail.updateMany({
    where: { id: thumbnail.id, status: { in: OPEN } },
    data: { status: GEN_STATUS.FAILED, error: reason.slice(0, 500) },
  });

  if (claimed.count === 0) return;
  await logGenerationEvent(thumbnail.id, 'FAILED', { reason });

  const refunded = await refundGeneration(thumbnail.id);
  if (refunded) await logGenerationEvent(thumbnail.id, 'REFUNDED');
};

export const CANCELLED_REASON = 'Cancelled by user';

/**
 * Stops one of the user's open generations and refunds it.
 *
 * Fal is asked to drop the job, but that is best effort: a job already
 * running may still finish and deliver. It no longer matters, because the
 * row is failed first and storeGenerationResult only completes open rows,
 * so a late result can never turn a refunded generation into a free one.
 */
export const cancelGeneration = async (
  userId: string,
  id: string,
): Promise<void> => {
  // Scoped by user_id so another user's id reads as not found.
  const row = await db.thumbnail.findFirst({
    where: { id, user_id: userId },
    select: { id: true, status: true, request_id: true, model_endpoint: true },
  });
  if (!row) throw new ApiError('Generation not found', 404);
  if (!OPEN.includes(row.status)) {
    throw new ApiError('This generation has already finished', 409);
  }

  await markGenerationFailed({ id: row.id }, CANCELLED_REASON);

  // The row may have completed between the read and the claim.
  const settled = await db.thumbnail.findUniqueOrThrow({
    where: { id: row.id },
    select: { status: true, error: true },
  });
  if (
    settled.status !== GEN_STATUS.FAILED ||
    settled.error !== CANCELLED_REASON
  ) {
    throw new ApiError('This generation has already finished', 409);
  }

  if (row.request_id && row.model_endpoint) {
    try {
      await fal.queue.cancel(row.model_endpoint, {
        requestId: row.request_id,
      });
    } catch (err) {
      // Usually "already running" or "already done"; the refund stands.
      console.warn('Fal did not cancel the job', {
        requestId: row.request_id,
        err,
      });
    }
  }
};

export type SyncOutcome =
  | { status: 'COMPLETED'; imageUrls: string[] }
  | { status: 'FAILED' }
  | { status: 'PENDING' };

/**
 * Reconciles one generation against Fal's queue and persists any outcome.
 *
 * Safe to call repeatedly: it no-ops once the row has left PENDING.
 */
export const syncGenerationFromFal = async (
  requestId: string,
): Promise<SyncOutcome> => {
  const thumbnail = await db.thumbnail.findUnique({
    where: { request_id: requestId },
  });

  if (!thumbnail) return { status: 'PENDING' };

  if (thumbnail.status === GEN_STATUS.COMPLETED) {
    return { status: 'COMPLETED', imageUrls: thumbnail.image_url };
  }

  if (thumbnail.status === GEN_STATUS.FAILED) {
    return { status: 'FAILED' };
  }

  if (!thumbnail.model_endpoint) {
    // Predates the column; nothing to query against.
    return { status: 'PENDING' };
  }

  try {
    const queued = await fal.queue.status(thumbnail.model_endpoint, {
      requestId,
    });

    if (queued.status === 'COMPLETED') {
      const result = await fal.queue.result(thumbnail.model_endpoint, {
        requestId,
      });
      const imageUrls = extractImageUrls(result.data);

      if (imageUrls.length === 0) {
        await markGenerationFailed(
          { request_id: requestId },
          'Provider finished with no images',
        );
        return { status: 'FAILED' };
      }

      await storeGenerationResult(requestId, imageUrls, 'poll');
      return { status: 'COMPLETED', imageUrls };
    }

    if (queued.status === 'IN_PROGRESS' || queued.status === 'IN_QUEUE') {
      if (thumbnail.status !== GEN_STATUS.IN_PROGRESS) {
        const moved = await db.thumbnail.updateMany({
          where: { request_id: requestId, status: GEN_STATUS.PENDING },
          data: { status: GEN_STATUS.IN_PROGRESS },
        });
        if (moved.count > 0) {
          await logGenerationEvent(thumbnail.id, 'IN_PROGRESS', {
            queue: queued.status,
            position: 'queue_position' in queued ? queued.queue_position : null,
          });
        }
      }
      return { status: 'PENDING' };
    }

    return { status: 'PENDING' };
  } catch (err) {
    // A 4xx from Fal usually means the request id is unknown or expired.
    console.error('Failed to sync generation from Fal', { requestId, err });
    return { status: 'PENDING' };
  }
};

/** Older than this, an open row is checked against Fal on read. */
const STALE_AFTER_MS = 2 * 60 * 1000;
/** Older than this and still not done, the job is treated as lost. */
const ABANDON_AFTER_MS = 30 * 60 * 1000;
/** Bounds the Fal calls one read can make. */
const MAX_RECONCILE = 8;

/**
 * Closes a user's generations that have been open too long, so the library
 * never shows "Generating" for a job nobody is waiting on. Each is checked
 * against Fal first; one still unresolved after ABANDON_AFTER_MS is marked
 * failed, which refunds its credits.
 */
export const reconcileStaleGenerations = async (userId: string) => {
  // Housekeeping only: a failure here must never fail the read it rides on.
  try {
    const now = Date.now();
    const stale = await db.thumbnail.findMany({
      where: {
        user_id: userId,
        status: { in: [GEN_STATUS.PENDING, GEN_STATUS.IN_PROGRESS] },
        createdAt: { lt: new Date(now - STALE_AFTER_MS) },
      },
      select: { id: true, request_id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: MAX_RECONCILE,
    });

    await Promise.all(
      stale.map(async ({ id, request_id, createdAt }) => {
        // No request id after STALE_AFTER_MS means the submit never finished
        // (the function died between charging and queueing). Nothing is
        // running at Fal, so refund now rather than after ABANDON_AFTER_MS.
        if (!request_id) {
          await markGenerationFailed(
            { id },
            'Never reached the provider (submit did not finish)',
          );
          return;
        }

        const outcome = await syncGenerationFromFal(request_id);
        if (
          outcome.status === 'PENDING' &&
          now - createdAt.getTime() > ABANDON_AFTER_MS
        ) {
          await markGenerationFailed(
            { request_id },
            'Abandoned: no result after 30 minutes',
          );
        }
      }),
    );
  } catch (err) {
    console.error('Failed to reconcile stale generations', { userId, err });
  }
};

/** How often one user's stale generations are swept. */
const RECONCILE_EVERY_SECONDS = 120;
/** How often one open generation is checked against Fal while polled. */
const SYNC_EVERY_SECONDS = 5;
/** A job younger than this is left to the webhook. */
const SYNC_AFTER_MS = 10_000;

/**
 * Sweeps the user's stale generations after the response is sent, at most
 * once per RECONCILE_EVERY_SECONDS. Reads never wait on Fal.
 *
 * Runs here rather than in a cron because the Hobby plan only allows daily
 * crons, which is far too slow to settle a job the user is looking at.
 */
export const scheduleStaleReconcile = (userId: string) => {
  after(async () => {
    if (await claimWindow(`reconcile:${userId}`, RECONCILE_EVERY_SECONDS)) {
      await reconcileStaleGenerations(userId);
    }
  });
};

/**
 * While a client polls an open generation, checks it against Fal after the
 * response, at most once per SYNC_EVERY_SECONDS. Covers a webhook that never
 * arrives — always the case in local development, where Fal can't reach
 * localhost.
 */
export const scheduleGenerationSync = (row: {
  id: string;
  request_id: string | null;
  status: GEN_STATUS;
  createdAt: Date;
}) => {
  if (!row.request_id || !OPEN.includes(row.status)) return;
  if (Date.now() - row.createdAt.getTime() < SYNC_AFTER_MS) return;

  const requestId = row.request_id;
  after(async () => {
    if (await claimWindow(`sync:${row.id}`, SYNC_EVERY_SECONDS)) {
      await syncGenerationFromFal(requestId);
    }
  });
};
