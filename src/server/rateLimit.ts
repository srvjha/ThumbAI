import 'server-only';
import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { redis } from '@/server/redis';
import { RateLimitError } from '@/server/errors';

/**
 * Per-user request limits on the endpoints that spend money.
 *
 * Generous for a person clicking through the studio; tight enough that one
 * abusive account has a bounded daily cost. Generate and edit share buckets
 * because both reach the same paid models.
 */
const POLICIES = {
  generate: [
    { limit: 10, window: '1 m' },
    { limit: 200, window: '1 d' },
  ],
  upload: [{ limit: 30, window: '1 m' }],
} as const satisfies Record<string, { limit: number; window: Duration }[]>;

export type RateLimitKind = keyof typeof POLICIES;

const WINDOW_MS: Record<string, number> = {
  '1 m': 60_000,
  '1 d': 86_400_000,
};

const upstash = redis
  ? Object.fromEntries(
      Object.entries(POLICIES).map(([kind, rules]) => [
        kind,
        rules.map(
          ({ limit, window }) =>
            new Ratelimit({
              redis: redis!,
              limiter: Ratelimit.slidingWindow(limit, window),
              prefix: `thumbai:rl:${kind}:${window.replace(' ', '')}`,
              analytics: false,
            }),
        ),
      ]),
    )
  : null;

/**
 * Per-instance fallback for when Upstash isn't configured: a fixed window
 * per server instance. Weaker than the global limit, never stricter.
 */
const local = new Map<string, { count: number; resetAt: number }>();

const checkLocal = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const entry = local.get(key);
  if (!entry || entry.resetAt <= now) {
    local.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, reset: now + windowMs };
  }
  entry.count += 1;
  return { success: entry.count <= limit, reset: entry.resetAt };
};

/** Throws a 429 with Retry-After when the user is over any limit for kind. */
export const enforceRateLimit = async (
  kind: RateLimitKind,
  userId: string,
): Promise<void> => {
  const rules = POLICIES[kind];

  for (let i = 0; i < rules.length; i++) {
    const { limit, window } = rules[i];
    let result: { success: boolean; reset: number };

    try {
      result = upstash
        ? await upstash[kind][i].limit(userId)
        : checkLocal(`${kind}:${window}:${userId}`, limit, WINDOW_MS[window]);
    } catch (err) {
      // An unreachable Redis must not take generation down with it.
      console.error('[rateLimit] check failed, allowing request', err);
      continue;
    }

    if (!result.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000),
      );
      throw new RateLimitError(
        window === '1 d'
          ? `Daily limit of ${limit} reached. Try again tomorrow.`
          : `Too many requests. Try again in ${retryAfter}s.`,
        retryAfter,
      );
    }
  }
};
