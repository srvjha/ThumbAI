import { auth } from '@clerk/nextjs/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/db';
import { ApiError, apiErrorResponse } from '@/utils/ApiError';
import { creditsPerImageForEndpoint } from '@/config/models';
import type { GenerationItem } from '@/components/dashboard/types';

/** Resolves the signed-in Clerk user to our User row, or throws 401. */
export const requireUser = async () => {
  const { userId } = await auth();
  if (!userId) throw new ApiError('Unauthorized Request', 401);

  const user = await db.user.findUnique({
    where: { clerk_id: userId },
    select: { id: true, credits: true },
  });
  if (!user) throw new ApiError('Unauthorized Request', 401);
  return user;
};

/**
 * Kept as an alias so callers don't change. It used to echo err.message for
 * any error, which sent Prisma internals to the browser.
 */
export const errorResponse = apiErrorResponse;

export const generationSelect = {
  id: true,
  user_prompt: true,
  image_url: true,
  status: true,
  model_used: true,
  model_tier: true,
  aspect_ratio: true,
  num_of_images: true,
  createdAt: true,
} satisfies Prisma.ThumbnailSelect;

type SelectedGeneration = Prisma.ThumbnailGetPayload<{
  select: typeof generationSelect;
}>;

export const toGenerationItem = (row: SelectedGeneration): GenerationItem => ({
  id: row.id,
  prompt: row.user_prompt,
  image_url: row.image_url,
  status: row.status,
  model_used: row.model_used,
  model_tier: row.model_tier,
  aspect_ratio: row.aspect_ratio,
  num_of_images: row.num_of_images,
  createdAt: row.createdAt.toISOString(),
});

type CostFields = {
  num_of_images: number | null;
  model_endpoint: string | null;
};

/**
 * ESTIMATED credits a generation cost. Spend isn't stored per row, so this
 * re-prices it at the current per-image rate of the endpoint it ran on (chat
 * edits are stored as TEXT_TO_IMAGE but billed at the edit rate). Matches
 * how failed generations are refunded.
 */
export const estimateCredits = (row: CostFields): number =>
  (row.num_of_images ?? 1) * creditsPerImageForEndpoint(row.model_endpoint);
