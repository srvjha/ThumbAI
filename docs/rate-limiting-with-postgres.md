# Rate limiting with PostgreSQL

How ThumbAI limits requests using only the Postgres database it already has, and how to build the same thing in another project.

The code is in [`src/server/rateLimit.ts`](../src/server/rateLimit.ts) and the tests in [`src/server/rateLimit.test.ts`](../src/server/rateLimit.test.ts).

---

## 1. What a rate limit is

A rate limit answers one question per request: **"Has this caller done this too many times recently?"** If yes, refuse with `429 Too Many Requests` and a `Retry-After` header that says when to try again.

ThumbAI's limits:

| Action            | Limit                          | Why                                            |
| ----------------- | ------------------------------ | ---------------------------------------------- |
| generate and edit | 10 per minute and 200 per day  | Each call spends money on paid image models    |
| upload            | 30 per minute                  | Stops storage abuse                            |

You need a limit even when every action costs credits. A bug, a stolen session, or a script can burn through credits, or reach a path that doesn't charge, faster than anyone notices.

## 2. Why the counter has to live in a shared store

The naive version keeps a counter in memory:

```ts
const counts = new Map<string, number>(); // ❌ on Vercel, one Map per instance
```

That only works when one server process handles every request. On Vercel, or any setup with several processes, each instance has its own `Map`. With 5 instances a user effectively gets 5 times the limit, and each new instance starts at zero.

So the counter must live somewhere **every instance can see**. Usually that means Redis, but any shared, consistent store will do, and we already have Postgres.

## 3. The algorithm: fixed window counter

There are several classic algorithms. [Arcjet's guide](https://docs.arcjet.com/rate-limiting/algorithms) and [Gravitee's overview](https://gravitee.io/rate-limiting-algorithms.html) explain them well:

- **Fixed window:** count requests in aligned time blocks, such as 12:00:00 to 12:00:59. It is the simplest, and it is what we use.
- **Sliding window:** count over the last N seconds, measured from right now. It is smoother but needs more state or math.
- **Token bucket:** a bucket refills at a steady rate and each request spends one token. It allows short bursts while holding a steady average.

How a fixed window works:

```
window length = 60s, limit = 10

12:00:00 ─────────────── 12:01:00 ─────────────── 12:02:00
│  window A: count 1…10 ✓, 11 ✗ │  window B: count starts at 1 again │
```

Every request maps to its window's start time:

```ts
const windowStart = Math.floor(now / windowMs) * windowMs;
```

The key for one user's one-minute generate window looks like `rl:generate:60000:user_123` plus `windowStart`. Every request in the same minute lands on the same counter.

**Known weakness:** a user can send 10 requests at 12:00:59 and 10 more at 12:01:00, which is 20 in two seconds. For our limits that is acceptable. If it isn't for yours, use a sliding window or token bucket.

## 4. The table

```prisma
model RateLimitCounter {
  key          String    // "rl:generate:60000:user_123"
  window_start DateTime  // start of the fixed window
  count        Int       @default(0)
  expires_at   DateTime  // window_start + window length; used for cleanup

  @@id([key, window_start])  // one row per key per window
  @@index([expires_at])      // makes deleting old rows cheap
}
```

The composite primary key `(key, window_start)` is what makes this work. It guarantees exactly one row per counter, and Postgres enforces that even when 100 requests arrive at the same instant.

## 5. The core trick: one atomic upsert

The tempting version is wrong:

```ts
// ❌ race condition
const row = await db.counter.findUnique(...);  // two requests both read count = 9
await db.counter.update({ count: row.count + 1 }); // both write 10, both allowed
```

Between the read and the write, another request can read the same value. This is a check-then-act race. Both requests see "9 < 10" and both get through.

The fix is to make Postgres do the read, the increment and the write in **one statement**:

```sql
INSERT INTO "RateLimitCounter" ("key", "window_start", "count", "expires_at")
VALUES ($1, $2, 1, $3)
ON CONFLICT ("key", "window_start")
DO UPDATE SET "count" = "RateLimitCounter"."count" + 1
RETURNING "count";
```

Read it as:

1. **First request in a window:** no row exists, so it is inserted with `count = 1`.
2. **Later requests:** the insert hits the primary key (`ON CONFLICT`), so Postgres instead adds 1 to the existing row.
3. **`RETURNING "count"`** gives back the new value in the same round trip.

Postgres locks the row while it updates it. Concurrent requests for the same key queue up for a few microseconds and each one sees a distinct count: 1, 2, 3, … The app then checks it:

```ts
if (count > limit) throw new RateLimitError(...); // 429
```

Nothing else is needed: no transaction, no explicit lock. Our test fires 25 concurrent requests at a limit of 10 and checks that exactly 10 succeed.

Further reading: the Postgres docs on [`INSERT … ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT), and postgres.ai on [find-or-insert in a single query](https://v2.postgres.ai/docs/postgres-howtos/development-tools/sql-techniques/find-or-insert-using-a-single-query). The second explains why `DO NOTHING` won't return a row for counters and `DO UPDATE` will.

### Several windows in one query

"Generate" has two limits, per minute and per day. Rather than two round trips, we insert both rows at once by passing arrays and expanding them with `unnest`:

```sql
INSERT INTO "RateLimitCounter" ("key", "window_start", "count", "expires_at")
SELECT k, s, 1, e
FROM unnest($1::text[], $2::timestamp(3)[], $3::timestamp(3)[]) AS t(k, s, e)
ON CONFLICT ("key", "window_start")
DO UPDATE SET "count" = "RateLimitCounter"."count" + 1
RETURNING "key", "count";
```

That is one statement, so one network round trip to Neon, however many limits apply.

## 6. Cleaning up

Every window leaves a row behind. Old rows are useless once `expires_at` has passed, so about 1% of calls also run:

```sql
DELETE FROM "RateLimitCounter" WHERE "expires_at" < now();
```

The index on `expires_at` keeps that delete fast. Doing it on a random sample of calls avoids needing a cron job, which matters because Vercel's Hobby plan only allows daily crons.

## 7. Bonus: "run at most once per N seconds"

The same table also throttles background housekeeping, such as "sweep this user's stuck generations at most every 2 minutes". That is a rate limit of **1**:

```ts
export const claimWindow = async (key: string, ttlSeconds: number) => {
  const [{ count }] = await hit([{ key: `claim:${key}`, windowMs: ttlSeconds * 1000 }]);
  return count === 1; // only the first caller in each window gets true
};
```

## 8. Postgres vs Redis: when to switch

|                  | Postgres (this)                     | Redis / Upstash                    |
| ---------------- | ----------------------------------- | ---------------------------------- |
| Extra service    | none                                | another account, bill, env vars    |
| Correctness      | atomic via `ON CONFLICT`            | atomic via `INCR`                  |
| Cost per check   | one write to the DB (a few ms)      | one in-memory op (sub-ms)          |
| Good up to       | many requests/sec on a small DB     | very high request rates            |

Every check is a database write. For an app like ThumbAI, where the limited actions take seconds of AI work anyway, that cost is invisible. Move to Redis when rate-limit writes become a noticeable share of database load, for example if you start limiting every page view at thousands of requests per second.

## 9. Recipe for another project

1. Create the table from section 4. A plain SQL version:

   ```sql
   CREATE TABLE rate_limit_counter (
     key          text        NOT NULL,
     window_start timestamptz NOT NULL,
     count        integer     NOT NULL DEFAULT 0,
     expires_at   timestamptz NOT NULL,
     PRIMARY KEY (key, window_start)
   );
   CREATE INDEX ON rate_limit_counter (expires_at);
   ```

2. Write a `hit(key, windowMs)` function:
   1. compute `windowStart = floor(now / windowMs) * windowMs`;
   2. run the upsert from section 5;
   3. return `count`.
3. Write `enforce(key, limit, windowMs)`. It calls `hit` and, when `count > limit`, throws a 429 with `Retry-After = ceil((windowStart + windowMs - now) / 1000)`.
4. Key by what you want to limit: the user id when signed in, the IP when not.
5. Prune expired rows occasionally.
6. Test it with concurrent requests (`Promise.all` of more than `limit` calls) against a real database. A race-condition bug only shows up under concurrency.

## More reading

- [Neon: rate limiting in Postgres](https://neon.com/guides/rate-limiting): a guide that also shows using advisory locks.
- [pg-ratelimit: fixed window](https://benjick.js.org/pg-ratelimit/algorithms/fixed-window/) and [sliding window](https://benjick.js.org/pg-ratelimit/algorithms/sliding-window/): a small library built on the same idea. Good for seeing the sliding-window version in SQL.
- [Arcjet: rate limiting algorithms](https://docs.arcjet.com/rate-limiting/algorithms): fixed window, sliding window and token bucket compared.
- [Gravitee: rate limiting algorithms](https://gravitee.io/rate-limiting-algorithms.html): another clear comparison.
