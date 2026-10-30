import { describe, expect, it } from 'vitest';
import { claimWindow } from '@/server/redis';

// No Upstash credentials in tests, so this exercises the local fallback.
describe('claimWindow', () => {
  it('lets the first caller through and holds the rest until it expires', async () => {
    expect(await claimWindow('test:a', 60)).toBe(true);
    expect(await claimWindow('test:a', 60)).toBe(false);
    expect(await claimWindow('test:b', 60)).toBe(true);
  });

  it('reopens once the window has passed', async () => {
    expect(await claimWindow('test:short', 0)).toBe(true);
    expect(await claimWindow('test:short', 0)).toBe(true);
  });
});
