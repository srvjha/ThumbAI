import 'server-only';
import { Redis } from '@upstash/redis';
import { env } from '@/config/env';

const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;

/**
 * Upstash Redis, or null when it isn't configured.
 *
 * Callers must work without it: locally, in tests, and in production until
 * the Vercel integration is added. Without Redis, limits are per server
 * instance rather than global — weaker, but never a reason to fail a request.
 */
export const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === 'production') {
  console.warn(
    '[redis] Upstash is not configured; throttles and rate limits are per instance only.',
  );
}

const localWindows = new Map<string, number>();

/**
 * Returns true for the first caller per key in each window of ttlSeconds,
 * false for everyone else until it expires. Used to run housekeeping at most
 * once per window no matter how many requests trigger it.
 */
export const claimWindow = async (
  key: string,
  ttlSeconds: number,
): Promise<boolean> => {
  if (redis) {
    try {
      const set = await redis.set(`thumbai:window:${key}`, 1, {
        nx: true,
        ex: ttlSeconds,
      });
      return set === 'OK';
    } catch (err) {
      // Redis being down must not stop the work it only throttles.
      console.error('[redis] claimWindow failed, using local window', err);
    }
  }

  const now = Date.now();
  if (localWindows.size > 10_000) {
    for (const [k, until] of localWindows) {
      if (until <= now) localWindows.delete(k);
    }
  }
  const expiresAt = localWindows.get(key);
  if (expiresAt && expiresAt > now) return false;
  localWindows.set(key, now + ttlSeconds * 1000);
  return true;
};
