import 'server-only';
import type { GEN_EVENT, Prisma } from '@prisma/client';
import { db } from '@/db';

/**
 * Appends a step to a generation's log. Best-effort by design: the log is
 * for admins reading after the fact, so a failed write is reported and
 * swallowed rather than failing the generation it describes.
 */
export const logGenerationEvent = async (
  thumbnailId: string,
  type: GEN_EVENT,
  detail?: Prisma.InputJsonObject,
) => {
  try {
    await db.generationEvent.create({
      data: { thumbnail_id: thumbnailId, type, detail },
    });
  } catch (err) {
    console.error('[generation-log] event not recorded', { type, err });
  }
};

/** An error as a short string fit for the log. */
export const describeError = (err: unknown) =>
  (err instanceof Error
    ? err.message
    : typeof err === 'string'
      ? err
      : JSON.stringify(err ?? 'unknown')
  ).slice(0, 500);
