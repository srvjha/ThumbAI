import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { createUser, resetDb } from '../../test/factories';

const session = vi.hoisted(() => ({ clerkId: null as string | null }));
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.clerkId }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

const { requireUser } = await import('@/server/auth');

beforeEach(resetDb);

const signInAs = async (overrides: { suspended?: boolean } = {}) => {
  const user = await createUser();
  await db.user.update({
    where: { id: user.id },
    data: {
      signup_checked_at: new Date(),
      ...(overrides.suspended && {
        suspended_at: new Date(),
        suspended_reason: 'test',
      }),
    },
  });
  session.clerkId = user.clerk_id;
  return user;
};

describe('requireUser', () => {
  it('refuses a suspended account with a 403', async () => {
    await signInAs({ suspended: true });
    await expect(requireUser()).rejects.toMatchObject({ statusCode: 403 });
  });

  it('still returns a suspended account where the caller allows it', async () => {
    const user = await signInAs({ suspended: true });
    await expect(requireUser({ allowSuspended: true })).resolves.toMatchObject({
      id: user.id,
    });
  });

  it('lets an active account through', async () => {
    const user = await signInAs();
    await expect(requireUser()).resolves.toMatchObject({ id: user.id });
  });
});
