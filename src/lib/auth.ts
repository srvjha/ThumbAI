import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { ApiError } from '@/utils/ApiError';
import type { User } from '@prisma/client';

/**
 * Resolves the Clerk session to the local User row.
 *
 * Every mutating route must derive the acting user from here rather than from
 * the request body — a client-supplied user id is not a credential.
 */
export const requireUser = async (): Promise<User> => {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw new ApiError('Unauthorized', 401);
  }

  const user = await db.user.findUnique({ where: { clerk_id: clerkId } });

  if (!user) {
    // Authenticated with Clerk but no local row yet — the register webhook
    // has not landed. Treated as unauthorized rather than auto-provisioned so
    // credits can only ever originate from the webhook.
    throw new ApiError('Unauthorized', 401);
  }

  return user;
};
