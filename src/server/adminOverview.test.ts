import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { dayList, getOverview } from '@/server/adminOverview';
import { createGeneration, createUser, resetDb } from '../../test/factories';

beforeEach(resetDb);

const DAY = 86_400_000;

describe('dayList', () => {
  it('ends today in India time, oldest first', () => {
    // 20:00 UTC is already the next day in India (UTC+5:30).
    const days = dayList(3, new Date('2026-10-31T20:00:00Z'));
    expect(days).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });
});

describe('getOverview', () => {
  it('splits the current period from the one before', async () => {
    const now = Date.now();
    const recent = await createUser({ credits: 0 });
    const old = await createUser({ credits: 30 });
    await db.user.update({
      where: { id: old.id },
      data: { createdAt: new Date(now - 10 * DAY) },
    });

    const done = await createGeneration(recent.id);
    await db.thumbnail.update({
      where: { id: done.id },
      data: {
        status: 'COMPLETED',
        image_url: ['a', 'b'],
        completed_at: new Date(done.createdAt.getTime() + 20_000),
      },
    });
    const failed = await createGeneration(recent.id);
    await db.thumbnail.update({
      where: { id: failed.id },
      data: { status: 'FAILED' },
    });

    const visitor = randomUUID();
    await db.visitor.create({
      data: { id: visitor, device: 'mobile', country: 'IN', browser: 'Chrome' },
    });
    await db.pageView.createMany({
      data: [
        { visitor_id: visitor, path: '/' },
        { visitor_id: visitor, path: '/pricing' },
        {
          visitor_id: visitor,
          path: '/',
          createdAt: new Date(now - 9 * DAY),
        },
      ],
    });
    await db.order.create({
      data: {
        user_id: recent.id,
        productId: 'creator-pro',
        amount: 8000,
        status: 'paid',
      },
    });

    const overview = await getOverview(7);

    expect(overview.series).toHaveLength(7);
    expect(overview.kpis).toMatchObject({
      totalUsers: 2,
      newUsers: { current: 1, previous: 1 },
      visitors: { current: 1, previous: 1 },
      views: { current: 2, previous: 1 },
      generations: { current: 2, previous: 0 },
      successRate: 0.5,
      images: { current: 2, previous: 0 },
      revenue: { current: 80, previous: 0 },
      creditsOutstanding: 30,
      activeUsers: 1,
    });
    expect(overview.kpis.latencyMs.p50).toBeCloseTo(20_000, -2);
    expect(overview.devices).toEqual([{ name: 'mobile', value: 1 }]);
    expect(overview.visitorCountries).toEqual([{ name: 'IN', value: 1 }]);
    expect(overview.pages[0]).toEqual({ path: '/', views: 1, visitors: 1 });
    expect(overview.creditBuckets.find((b) => b.bucket === '0')?.users).toBe(1);
    expect(
      overview.creditBuckets.find((b) => b.bucket === '21–100')?.users,
    ).toBe(1);
  });
});
