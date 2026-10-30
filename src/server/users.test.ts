import { beforeEach, describe, expect, it } from 'vitest';
import type { UserJSON } from '@clerk/nextjs/server';
import { db } from '@/db';
import { softDeleteUser, upsertUserFromClerk } from '@/server/users';
import { resetDb } from '../../test/factories';

beforeEach(resetDb);

const clerkUser = (overrides: Partial<UserJSON> = {}) =>
  ({
    id: 'user_clerk_1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    image_url: 'https://img.clerk.com/ada.png',
    primary_email_address_id: 'email_1',
    email_addresses: [{ id: 'email_1', email_address: 'ada@example.com' }],
    created_at: Date.now(),
    last_active_at: null,
    ...overrides,
  }) as unknown as UserJSON;

describe('upsertUserFromClerk', () => {
  it('creates the user with zero credits, idempotently', async () => {
    await upsertUserFromClerk(clerkUser());
    await upsertUserFromClerk(clerkUser());

    const users = await db.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      credits: 0,
      signup_checked_at: null,
    });
  });

  it('applies later profile updates', async () => {
    await upsertUserFromClerk(clerkUser());
    await upsertUserFromClerk(clerkUser({ first_name: 'Augusta' }));

    const user = await db.user.findUniqueOrThrow({
      where: { clerk_id: 'user_clerk_1' },
    });
    expect(user.fullName).toBe('Augusta Lovelace');
  });

  it('skips a user without a primary email', async () => {
    expect(
      await upsertUserFromClerk(clerkUser({ primary_email_address_id: null })),
    ).toBeNull();
    expect(await db.user.count()).toBe(0);
  });
});

describe('softDeleteUser', () => {
  it('clears personal fields and keeps the row', async () => {
    await upsertUserFromClerk(clerkUser());

    await softDeleteUser('user_clerk_1');
    await softDeleteUser('user_clerk_1');

    const user = await db.user.findUniqueOrThrow({
      where: { clerk_id: 'user_clerk_1' },
    });
    expect(user.deleted_at).not.toBeNull();
    expect(user.email).toBe(`deleted-${user.id}@deleted.invalid`);
    expect(user.fullName).toBe('Deleted user');
    expect(user.profile_img).toBeNull();
  });

  it('is not undone by a late user.updated', async () => {
    await upsertUserFromClerk(clerkUser());
    await softDeleteUser('user_clerk_1');

    await upsertUserFromClerk(clerkUser());

    const user = await db.user.findUniqueOrThrow({
      where: { clerk_id: 'user_clerk_1' },
    });
    expect(user.email).toBe(`deleted-${user.id}@deleted.invalid`);
  });

  it('ignores an unknown Clerk id', async () => {
    await expect(softDeleteUser('user_missing')).resolves.toBeUndefined();
  });
});
