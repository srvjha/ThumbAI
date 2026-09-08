import { fal } from '@fal-ai/client';
import { db } from '@/db';
import { GEN_STATUS } from '@prisma/client';
import { refundCredits } from '@/lib/credits';

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

  if (!thumbnail || thumbnail.status === GEN_STATUS.FAILED) {
    // Already recorded; don't refund twice.
    return;
  }

  await db.thumbnail.update({
    where: { request_id: requestId },
    data: { status: GEN_STATUS.FAILED },
  });

  await refundCredits(thumbnail.user_id, thumbnail.num_of_images ?? 1);
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
