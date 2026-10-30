import { fal } from '@fal-ai/client';
import { db } from '@/db';
import { GEN_STATUS } from '@prisma/client';
import { refundCredits } from '@/lib/credits';
import { creditsPerImageForEndpoint } from '@/config/models';

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

export const storeGenerationResult = async (
  requestId: string,
  imageUrls: string[],
): Promise<void> => {
  await db.thumbnail.update({
    where: { request_id: requestId },
    data: {
      status: GEN_STATUS.COMPLETED,
      // Every image, not just the first.
      image_url: imageUrls,
    },
  });
};

/** Marks a generation failed and returns the credits taken at submit time. */
export const markGenerationFailed = async (
  requestId: string,
): Promise<void> => {
  const thumbnail = await db.thumbnail.findUnique({
    where: { request_id: requestId },
  });

  if (!thumbnail) return;

  // Conditional on the row still being open, so the webhook and the sync
  // path racing on the same request cannot both refund it.
  const claimed = await db.thumbnail.updateMany({
    where: {
      request_id: requestId,
      status: { notIn: [GEN_STATUS.FAILED, GEN_STATUS.COMPLETED] },
    },
    data: { status: GEN_STATUS.FAILED },
  });

  if (claimed.count === 0) return;

  // Refund what was charged: a Quality image or an edit costs more than one
  // credit, so refunding num_of_images alone under-paid those.
  const cost =
    (thumbnail.num_of_images ?? 1) *
    creditsPerImageForEndpoint(thumbnail.model_endpoint);
  await refundCredits(thumbnail.user_id, cost);
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
        await markGenerationFailed(requestId);
        return { status: 'FAILED' };
      }

      await storeGenerationResult(requestId, imageUrls);
      return { status: 'COMPLETED', imageUrls };
    }

    if (queued.status === 'IN_PROGRESS' || queued.status === 'IN_QUEUE') {
      if (thumbnail.status !== GEN_STATUS.IN_PROGRESS) {
        await db.thumbnail.update({
          where: { request_id: requestId },
          data: { status: GEN_STATUS.IN_PROGRESS },
        });
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
      select: { request_id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: MAX_RECONCILE,
    });

    await Promise.all(
      stale.map(async ({ request_id, createdAt }) => {
        const outcome = await syncGenerationFromFal(request_id);
        if (
          outcome.status === 'PENDING' &&
          now - createdAt.getTime() > ABANDON_AFTER_MS
        ) {
          await markGenerationFailed(request_id);
        }
      }),
    );
  } catch (err) {
    console.error('Failed to reconcile stale generations', { userId, err });
  }
};
