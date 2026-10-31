import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Role, type User } from '@prisma/client';
import { db } from '@/db';
import { ApiError } from '@/server/errors';
import { ensureSignupCredits } from '@/server/signupCredits';

/**
 * Resolves the Clerk session to the local User row.
 *
 * Every route must derive the acting user from here rather than from the
 * request body — a client-supplied user id is not a credential.
 */
export const requireUser = async ({
  allowSuspended = false,
}: {
  /** Only for reading the account itself, so the app can say why. */
  allowSuspended?: boolean;
} = {}): Promise<User> => {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw new ApiError('Unauthorized', 401);
  }

  const user = await db.user.findUnique({ where: { clerk_id: clerkId } });

  if (!user) {
    // Authenticated with Clerk but no local row yet — the register webhook
    // has not landed. Treated as unauthorized rather than auto-provisioned,
    // so every account is one Clerk has confirmed.
    //
    // In development that webhook cannot reach localhost, so this is the
    // common cause of a "signed in but everything 401s" loop. Name the id, or
    // the failure is indistinguishable from being signed out.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[auth] Clerk session ${clerkId} has no local User row.\n` +
          `       Seed it:  node --env-file=.env tools/seed-dev-user.mjs ${clerkId}`,
      );
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (user.deleted_at) {
    // The Clerk account is gone; a lingering session must not revive it.
    throw new ApiError('Unauthorized', 401);
  }

  if (user.suspended_at && !allowSuspended) {
    throw new ApiError(
      'Your account is suspended. Contact support if you think this is a mistake.',
      403,
    );
  }

  if (!user.signup_checked_at) {
    try {
      return await ensureSignupCredits(user, await headers());
    } catch (err) {
      // Never block a request on the grant. It is retried next request.
      console.error('[auth] signup credit check failed', err);
    }
  }

  return user;
};

/** requireUser, then 403 unless the user is an admin. */
export const requireAdmin = async (): Promise<User> => {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new ApiError('Forbidden - Admin access required', 403);
  }
  return user;
};
