import { describe, expect, it } from 'vitest';
import { enforceRateLimit } from '@/server/rateLimit';

// No Upstash credentials in tests, so this exercises the per-instance limit.
describe('enforceRateLimit', () => {
  it('allows 10 generations a minute, then 429s with Retry-After', async () => {
    const user = `user_${Math.random()}`;
    for (let i = 0; i < 10; i++) {
      await enforceRateLimit('generate', user);
    }

    const err = await enforceRateLimit('generate', user).catch((e) => e);
    expect(err).toMatchObject({ statusCode: 429 });
    expect(err.retryAfterSeconds).toBeGreaterThan(0);
    expect(err.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('counts each user separately', async () => {
    const a = `user_${Math.random()}`;
    const b = `user_${Math.random()}`;
    for (let i = 0; i < 10; i++) await enforceRateLimit('generate', a);

    await expect(enforceRateLimit('generate', b)).resolves.toBeUndefined();
  });

  it('keeps uploads in their own bucket', async () => {
    const user = `user_${Math.random()}`;
    for (let i = 0; i < 10; i++) await enforceRateLimit('generate', user);

    await expect(enforceRateLimit('upload', user)).resolves.toBeUndefined();
  });
});
