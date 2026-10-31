import 'server-only';
import { db } from '@/db';
import { RateLimitError } from '@/server/errors';

/**
 * Rate limits and throttles, counted in Postgres.
 *
 * Every Vercel instance has its own memory, so counts kept in-process don't
 * add up across instances. A RateLimitCounter row per (key, window) does:
 * one INSERT ... ON CONFLICT DO UPDATE increments it atomically and returns
 * the new count, so concurrent requests can never both see a free slot.
 *
 * Windows are fixed and aligned to the epoch (minutes on the minute, days at
 * 00:00 UTC). A burst straddling a boundary can reach twice a limit, which
 * is fine for these limits.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/**
 * Per-user limits on the endpoints that spend money. Generous for a person
 * clicking through the studio; tight enough that one abusive account has a
 * bounded daily cost. Generate and edit share buckets because both reach the
 * same paid models.
 */
const POLICIES = {
  generate: [
    { limit: 10, windowMs: MINUTE },
    { limit: 200, windowMs: DAY },
  ],
  upload: [{ limit: 30, windowMs: MINUTE }],
  // The page-view beacon is public; this bounds what one client can write.
  track: [{ limit: 60, windowMs: MINUTE }],
} as const satisfies Record<string, { limit: number; windowMs: number }[]>;

export type RateLimitKind = keyof typeof POLICIES;

/** Share of calls that also delete expired counters. */
const PRUNE_CHANCE = 0.01;

interface Hit {
  key: string;
  windowMs: number;
}

/**
 * Counts one hit against each key's current window, in one round trip.
 * Returns the counts in order, with when each window resets.
 */
const hit = async (hits: Hit[]) => {
  const now = Date.now();
  const rows = hits.map(({ key, windowMs }) => {
    const start = Math.floor(now / windowMs) * windowMs;
    return { key, start: new Date(start), reset: new Date(start + windowMs) };
  });

  const counts = await db.$queryRawUnsafe<{ key: string; count: number }[]>(
    `INSERT INTO "RateLimitCounter" ("key", "window_start", "count", "expires_at")
     SELECT k, s, 1, e
     FROM unnest($1::text[], $2::timestamp(3)[], $3::timestamp(3)[]) AS t(k, s, e)
     ON CONFLICT ("key", "window_start")
     DO UPDATE SET "count" = "RateLimitCounter"."count" + 1
     RETURNING "key", "count"`,
    rows.map((r) => r.key),
    rows.map((r) => r.start),
    rows.map((r) => r.reset),
  );

  if (Math.random() < PRUNE_CHANCE) {
    await db.rateLimitCounter
      .deleteMany({ where: { expires_at: { lt: new Date(now) } } })
      .catch((err) => console.error('[rateLimit] prune failed', err));
  }

  const byKey = new Map(counts.map((c) => [c.key, c.count]));
  return rows.map((r) => ({ count: byKey.get(r.key) ?? 0, reset: r.reset }));
};

/** Throws a 429 with Retry-After when the user is over any limit for kind. */
export const enforceRateLimit = async (
  kind: RateLimitKind,
  userId: string,
): Promise<void> => {
  const rules = POLICIES[kind];
  const results = await hit(
    rules.map(({ windowMs }) => ({
      key: `rl:${kind}:${windowMs}:${userId}`,
      windowMs,
    })),
  );

  rules.forEach(({ limit, windowMs }, i) => {
    const { count, reset } = results[i];
    if (count <= limit) return;

    const retryAfter = Math.max(
      1,
      Math.ceil((reset.getTime() - Date.now()) / 1000),
    );
    throw new RateLimitError(
      windowMs === DAY
        ? `Daily limit of ${limit} reached. Try again tomorrow.`
        : `Too many requests. Try again in ${retryAfter}s.`,
      retryAfter,
    );
  });
};

/**
 * Returns true for the first caller per key in each window of ttlSeconds,
 * false for everyone else until the window rolls over. Used to run
 * housekeeping at most once per window however many requests trigger it.
 */
export const claimWindow = async (
  key: string,
  ttlSeconds: number,
): Promise<boolean> => {
  if (ttlSeconds <= 0) return true;
  const [{ count }] = await hit([
    { key: `claim:${key}`, windowMs: ttlSeconds * 1000 },
  ]);
  return count === 1;
};
