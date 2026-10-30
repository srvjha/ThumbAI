import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import {
  ADMIN_PAGE_SIZE,
  adjustCredits,
  getUserDetail,
  listUsers,
  parseUserListParams,
} from '@/server/admin';
import {
  createGeneration,
  createUser,
  creditsOf,
  expectLedgerBalanced,
  resetDb,
} from '../../test/factories';

beforeEach(resetDb);

const list = (query = '') =>
  listUsers(parseUserListParams(new URLSearchParams(query)));

describe('parseUserListParams', () => {
  it('falls back to safe defaults for junk', () => {
    expect(
      parseUserListParams(
        new URLSearchParams('sort=toString&order=sideways&page=-3&role=GOD'),
      ),
    ).toEqual({
      q: undefined,
      role: undefined,
      plan: undefined,
      sort: 'createdAt',
      order: 'desc',
      page: 1,
    });
  });
});

describe('listUsers', () => {
  it('pages through users and reports whole-table stats', async () => {
    const users = [];
    for (let i = 0; i < ADMIN_PAGE_SIZE + 5; i += 1) {
      users.push(await createUser({ credits: 1 }));
    }
    await createGeneration(users[0].id);

    const first = await list();
    const second = await list('page=2');

    expect(first.users).toHaveLength(ADMIN_PAGE_SIZE);
    expect(second.users).toHaveLength(5);
    expect(first.total).toBe(ADMIN_PAGE_SIZE + 5);
    expect(first.stats).toEqual({
      users: ADMIN_PAGE_SIZE + 5,
      thumbnails: 1,
      credits: ADMIN_PAGE_SIZE + 5,
    });
    const ids = new Set([...first.users, ...second.users].map((u) => u.id));
    expect(ids.size).toBe(ADMIN_PAGE_SIZE + 5);
  });

  it('searches, filters and sorts on the server', async () => {
    const rich = await createUser({ credits: 50 });
    const busy = await createUser({ credits: 1 });
    await createGeneration(busy.id);
    await createGeneration(busy.id);
    await db.user.update({ where: { id: rich.id }, data: { plan: 'PAID' } });

    expect((await list('plan=PAID')).users.map((u) => u.id)).toEqual([rich.id]);
    expect(
      (await list(`q=${rich.email.slice(0, 8).toUpperCase()}`)).total,
    ).toBe(1);
    expect((await list('sort=credits&order=desc')).users[0].id).toBe(rich.id);
    const byThumbs = await list('sort=thumbnails&order=desc');
    expect(byThumbs.users[0]).toMatchObject({ id: busy.id, thumbnailCount: 2 });
  });

  it('leaves out deleted users', async () => {
    const user = await createUser();
    await db.user.update({
      where: { id: user.id },
      data: { deleted_at: new Date() },
    });

    expect((await list()).total).toBe(0);
  });
});

describe('getUserDetail', () => {
  it('includes the credit history', async () => {
    const user = await createUser({ credits: 4 });

    const detail = await getUserDetail(user.id);

    expect(detail.creditHistory).toEqual([
      expect.objectContaining({ type: 'OPENING_BALANCE', amount: 4 }),
    ]);
  });

  it('404s for an unknown id', async () => {
    await expect(getUserDetail('missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('adjustCredits', () => {
  const adminEmail = 'admin@example.test';

  it('adds and removes credits through the ledger, noting who and why', async () => {
    const user = await createUser({ credits: 2 });

    await adjustCredits({
      userId: user.id,
      amount: 10,
      reason: 'Support goodwill',
      adminEmail,
    });
    const result = await adjustCredits({
      userId: user.id,
      amount: -5,
      reason: 'Correction',
      adminEmail,
    });

    expect(result.credits).toBe(7);
    expect(await creditsOf(user.id)).toBe(7);
    const notes = await db.creditTransaction.findMany({
      where: { user_id: user.id, type: 'ADMIN_ADJUSTMENT' },
      orderBy: { createdAt: 'asc' },
    });
    expect(notes.map((n) => n.note)).toEqual([
      'Support goodwill (by admin@example.test)',
      'Correction (by admin@example.test)',
    ]);
    await expectLedgerBalanced(user.id);
  });

  it('refuses to take the balance below zero', async () => {
    const user = await createUser({ credits: 2 });

    await expect(
      adjustCredits({ userId: user.id, amount: -3, reason: 'x', adminEmail }),
    ).rejects.toMatchObject({ statusCode: 402 });
    expect(await creditsOf(user.id)).toBe(2);
  });

  it.each([
    [0, 'reason'],
    [1.5, 'reason'],
    ['5', 'reason'],
    [100_001, 'reason'],
    [5, '  '],
    [5, undefined],
  ])('rejects amount %s with reason %s', async (amount, reason) => {
    const user = await createUser();
    await expect(
      adjustCredits({ userId: user.id, amount, reason, adminEmail }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses a deleted user', async () => {
    const user = await createUser();
    await db.user.update({
      where: { id: user.id },
      data: { deleted_at: new Date() },
    });

    await expect(
      adjustCredits({ userId: user.id, amount: 5, reason: 'x', adminEmail }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
