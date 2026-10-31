import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { claimWindow, enforceRateLimit } from '@/server/rateLimit';
import { resetDb } from '../../test/factories';

beforeEach(resetDb);

describe('enforceRateLimit', () => {
  it('allows 10 generations a minute, then 429s with Retry-After', async () => {
    for (let i = 0; i < 10; i++) {
      await enforceRateLimit('generate', 'user_a');
    }

    const err = await enforceRateLimit('generate', 'user_a').catch((e) => e);
    expect(err).toMatchObject({ statusCode: 429 });
    expect(err.retryAfterSeconds).toBeGreaterThan(0);
    expect(err.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('holds the limit under concurrent requests', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 25 }, () => enforceRateLimit('generate', 'user_a')),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
  });

  it('enforces the daily cap across minutes', async () => {
    const dayStart = new Date(Math.floor(Date.now() / 86_400_000) * 86_400_000);
    await db.rateLimitCounter.create({
      data: {
        key: 'rl:generate:86400000:user_a',
        window_start: dayStart,
        count: 200,
        expires_at: new Date(dayStart.getTime() + 86_400_000),
      },
    });

    await expect(enforceRateLimit('generate', 'user_a')).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining('Daily limit'),
    });
  });

  it('counts each user and each kind separately', async () => {
    for (let i = 0; i < 10; i++) await enforceRateLimit('generate', 'user_a');

    await expect(
      enforceRateLimit('generate', 'user_b'),
    ).resolves.toBeUndefined();
    await expect(enforceRateLimit('upload', 'user_a')).resolves.toBeUndefined();
  });
});

describe('claimWindow', () => {
  it('lets one caller through per window, even concurrently', async () => {
    const claims = await Promise.all(
      Array.from({ length: 5 }, () => claimWindow('test:a', 60)),
    );

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await claimWindow('test:b', 60)).toBe(true);
  });

  it('always allows a zero-length window', async () => {
    expect(await claimWindow('test:short', 0)).toBe(true);
    expect(await claimWindow('test:short', 0)).toBe(true);
  });
});
