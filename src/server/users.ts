import 'server-only';
import type { UserJSON } from '@clerk/nextjs/server';
import { db } from '@/db';

/** What we mirror from a Clerk user. Null when it has no primary email. */
export const profileFromClerk = (data: UserJSON) => {
  const email = data.email_addresses.find(
    (address) => address.id === data.primary_email_address_id,
  )?.email_address;
  if (!email || !data.id) return null;

  return {
    email,
    fullName:
      `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() ||
      'No FullName',
    profile_img: data.image_url,
    last_active_at: new Date(data.last_active_at ?? data.created_at),
  };
};

/**
 * Creates or refreshes the local user for a Clerk user. Idempotent, so a
 * redelivered user.created, or a user.updated arriving first, both land.
 * New users start at zero credits; the signup grant comes later.
 */
export const upsertUserFromClerk = async (data: UserJSON) => {
  const profile = profileFromClerk(data);
  if (!profile) return null;

  // A deleted account stays deleted: a late update must not restore the
  // personal fields that deletion cleared.
  const existing = await db.user.findUnique({ where: { clerk_id: data.id } });
  if (existing?.deleted_at) return existing;

  return db.user.upsert({
    where: { clerk_id: data.id },
    update: { ...profile },
    create: { ...profile, clerk_id: data.id, credits: 0 },
  });
};

/**
 * Soft-deletes a user whose Clerk account was deleted.
 *
 * The row stays: orders and the credit ledger reference it, and payment
 * records must be kept for tax and dispute purposes. Personal fields are
 * cleared. The normalized email in SignupCreditAttempt is kept, solely so
 * re-registering the same address can't claim free credits again.
 */
export const softDeleteUser = async (clerkId: string) => {
  const user = await db.user.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true, deleted_at: true },
  });
  if (!user || user.deleted_at) return;

  await db.user.update({
    where: { id: user.id },
    data: {
      deleted_at: new Date(),
      email: `deleted-${user.id}@deleted.invalid`,
      fullName: 'Deleted user',
      profile_img: null,
    },
  });
};
