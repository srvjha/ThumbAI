import 'server-only';
import { db } from '@/db';
import { sourceOf } from '@/server/analytics/track';

/**
 * The admin overview: every chart on /admin from one call.
 *
 * Days are counted in India time, where the team is. Each daily series
 * covers twice the range so the KPI tiles can compare against the period
 * before without a second round of queries.
 */
export const ADMIN_TZ = 'Asia/Kolkata';

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export const parseRange = (value: string | null): RangeDays =>
  RANGES.find((r) => String(r) === value) ?? 30;

const DAY_MS = 86_400_000;

const localDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ADMIN_TZ }).format(d);

/** The last `count` local dates, oldest first, as YYYY-MM-DD. */
export const dayList = (count: number, now = new Date()) => {
  const today = Date.parse(`${localDate(now)}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(today - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10),
  );
};

// Columns are timestamp(3) in UTC; this is the local day of one.
const day = (column: string) =>
  `((${column} AT TIME ZONE 'UTC') AT TIME ZONE '${ADMIN_TZ}')::date`;

type DayRow = { day: Date } & Record<string, unknown>;

const byDay = <T extends DayRow>(rows: T[]) =>
  new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r]));

const num = (v: unknown) => (v == null ? 0 : Number(v));

/** Current and previous period from a doubled daily series. */
const split = (values: number[], days: number) => ({
  current: values.slice(-days).reduce((a, b) => a + b, 0),
  previous: values.slice(0, -days).reduce((a, b) => a + b, 0),
});

const top = <T>(entries: Map<string, T>, limit: number, by: (v: T) => number) =>
  [...entries.entries()].sort((a, b) => by(b[1]) - by(a[1])).slice(0, limit);

export const getOverview = async (days: RangeDays) => {
  const dates = dayList(days * 2);
  const since = dates[0];
  const currentSince = dates[days];
  // A UTC instant safely before the first local day, so the indexes on
  // createdAt narrow the scan before the exact local-date filter.
  const loose = new Date(Date.parse(`${since}T00:00:00Z`) - DAY_MS);
  const currentLoose = new Date(
    Date.parse(`${currentSince}T00:00:00Z`) - DAY_MS,
  );

  const [
    views,
    signups,
    generations,
    credits,
    revenue,
    uniques,
    visitors,
    usersByCountry,
    usersBySource,
    pages,
    workflows,
    latency,
    creditBuckets,
    totals,
    flagCategories,
    activeUsers,
  ] = await Promise.all([
    db.$queryRawUnsafe<DayRow[]>(
      `SELECT ${day('"createdAt"')} AS day, count(*) AS views,
              count(DISTINCT visitor_id) AS visitors
       FROM "PageView" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       GROUP BY 1`,
      loose,
      since,
    ),
    db.$queryRawUnsafe<DayRow[]>(
      `SELECT ${day('"createdAt"')} AS day, count(*) AS signups
       FROM "User" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       GROUP BY 1`,
      loose,
      since,
    ),
    db.$queryRawUnsafe<DayRow[]>(
      `SELECT ${day('"createdAt"')} AS day,
              count(*) FILTER (WHERE status = 'COMPLETED') AS completed,
              count(*) FILTER (WHERE status = 'FAILED') AS failed,
              count(*) FILTER (WHERE status IN ('PENDING', 'IN_PROGRESS')) AS open,
              coalesce(sum(cardinality(image_url)), 0) AS images
       FROM "Thumbnail" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       GROUP BY 1`,
      loose,
      since,
    ),
    db.$queryRawUnsafe<DayRow[]>(
      `SELECT ${day('"createdAt"')} AS day,
              -sum(amount) FILTER (WHERE type IN ('GENERATION_CHARGE', 'GENERATION_REFUND')) AS spent,
              sum(amount) FILTER (WHERE type IN ('SIGNUP_GRANT', 'PURCHASE') OR (type = 'ADMIN_ADJUSTMENT' AND amount > 0)) AS granted
       FROM "CreditTransaction" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       GROUP BY 1`,
      loose,
      since,
    ),
    db.$queryRawUnsafe<DayRow[]>(
      `SELECT ${day('"createdAt"')} AS day, sum(amount) AS paise, count(*) AS orders
       FROM "Order" WHERE status = 'paid' AND "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       GROUP BY 1`,
      loose,
      since,
    ),
    // Distinct visitors across each whole period: not a sum of the days.
    db.$queryRawUnsafe<{ current: bigint; previous: bigint }[]>(
      `SELECT count(DISTINCT visitor_id) FILTER (WHERE ${day('"createdAt"')} >= $3::date) AS current,
              count(DISTINCT visitor_id) FILTER (WHERE ${day('"createdAt"')} < $3::date) AS previous
       FROM "PageView" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date`,
      loose,
      since,
      currentSince,
    ),
    db.visitor.findMany({
      where: { last_seen_at: { gte: currentLoose } },
      select: {
        country: true,
        city: true,
        device: true,
        browser: true,
        os: true,
        utm_source: true,
        referrer_domain: true,
        first_seen_at: true,
      },
    }),
    db.user.groupBy({
      by: ['country'],
      where: { deleted_at: null },
      _count: { _all: true },
    }),
    db.user.groupBy({
      by: ['acquisition_source'],
      where: { deleted_at: null },
      _count: { _all: true },
    }),
    db.$queryRawUnsafe<{ path: string; views: bigint; visitors: bigint }[]>(
      `SELECT path, count(*) AS views, count(DISTINCT visitor_id) AS visitors
       FROM "PageView" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       GROUP BY path ORDER BY views DESC LIMIT 10`,
      currentLoose,
      currentSince,
    ),
    db.$queryRawUnsafe<
      {
        workflow: string | null;
        tier: string | null;
        total: bigint;
        failed: bigint;
      }[]
    >(
      `SELECT model_used::text AS workflow, model_tier::text AS tier, count(*) AS total,
              count(*) FILTER (WHERE status = 'FAILED') AS failed
       FROM "Thumbnail" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       GROUP BY 1, 2`,
      currentLoose,
      currentSince,
    ),
    db.$queryRawUnsafe<
      { p50: number | null; p95: number | null; avg: number | null }[]
    >(
      `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ms) AS p50,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY ms) AS p95,
              avg(ms) AS avg
       FROM (SELECT extract(epoch FROM (completed_at - "createdAt")) * 1000 AS ms
             FROM "Thumbnail"
             WHERE status = 'COMPLETED' AND completed_at IS NOT NULL
               AND "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date) t`,
      currentLoose,
      currentSince,
    ),
    db.$queryRawUnsafe<{ bucket: string; users: bigint }[]>(
      `SELECT CASE WHEN credits <= 0 THEN '0'
                   WHEN credits <= 2 THEN '1–2'
                   WHEN credits <= 5 THEN '3–5'
                   WHEN credits <= 20 THEN '6–20'
                   WHEN credits <= 100 THEN '21–100'
                   ELSE '100+' END AS bucket,
              count(*) AS users
       FROM "User" WHERE deleted_at IS NULL GROUP BY 1`,
    ),
    Promise.all([
      db.user.count({ where: { deleted_at: null } }),
      db.user.aggregate({
        where: { deleted_at: null },
        _sum: { credits: true },
      }),
      db.user.count({ where: { deleted_at: null, plan: 'PAID' } }),
      db.user.count({ where: { suspended_at: { not: null } } }),
      db.promptFlag.count({ where: { resolved_at: null } }),
      db.promptFlag.groupBy({
        by: ['user_id'],
        where: { resolved_at: null },
      }),
      db.thumbnail.count(),
      db.order.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
    ]),
    db.$queryRawUnsafe<{ category: string; flags: bigint }[]>(
      `SELECT unnest(categories) AS category, count(*) AS flags
       FROM "PromptFlag" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
      currentLoose,
      currentSince,
    ),
    // Active: signed-in page views or a generation in the period.
    db.$queryRawUnsafe<{ users: bigint }[]>(
      `SELECT count(*) AS users FROM (
         SELECT user_id FROM "PageView" WHERE user_id IS NOT NULL AND "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
         UNION
         SELECT user_id FROM "Thumbnail" WHERE "createdAt" >= $1 AND ${day('"createdAt"')} >= $2::date
       ) a`,
      currentLoose,
      currentSince,
    ),
  ]);

  const viewsBy = byDay(views);
  const signupsBy = byDay(signups);
  const generationsBy = byDay(generations);
  const creditsBy = byDay(credits);
  const revenueBy = byDay(revenue);

  const series = dates.map((date) => {
    const v = viewsBy.get(date);
    const g = generationsBy.get(date);
    const c = creditsBy.get(date);
    const r = revenueBy.get(date);
    return {
      date,
      views: num(v?.views),
      visitors: num(v?.visitors),
      signups: num(signupsBy.get(date)?.signups),
      completed: num(g?.completed),
      failed: num(g?.failed),
      open: num(g?.open),
      images: num(g?.images),
      creditsSpent: num(c?.spent),
      creditsGranted: num(c?.granted),
      revenue: num(r?.paise) / 100,
      orders: num(r?.orders),
    };
  });

  const sum = (key: keyof (typeof series)[number]) =>
    split(
      series.map((s) => s[key] as number),
      days,
    );

  // Visitor breakdowns over everyone seen in the period.
  const tally = (pick: (v: (typeof visitors)[number]) => string | null) => {
    const counts = new Map<string, number>();
    for (const v of visitors) {
      const key = pick(v) ?? 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const asList = (counts: Map<string, number>, limit = 8) =>
    top(counts, limit, (n) => n).map(([name, value]) => ({ name, value }));

  const generationsTotal = sum('completed');
  const failedTotal = sum('failed');
  const finished = generationsTotal.current + failedTotal.current;

  const [
    totalUsers,
    creditsOutstanding,
    paidUsers,
    suspended,
    openFlags,
    flaggedUsers,
    allGenerations,
    lifetimeRevenue,
  ] = totals;

  const BUCKETS = ['0', '1–2', '3–5', '6–20', '21–100', '100+'];
  const bucketMap = new Map(creditBuckets.map((b) => [b.bucket, num(b.users)]));

  return {
    days,
    series: series.slice(-days),
    kpis: {
      totalUsers,
      newUsers: sum('signups'),
      activeUsers: num(activeUsers[0]?.users),
      visitors: {
        current: num(uniques[0]?.current),
        previous: num(uniques[0]?.previous),
      },
      views: sum('views'),
      generations: {
        current: generationsTotal.current + failedTotal.current,
        previous: generationsTotal.previous + failedTotal.previous,
      },
      successRate: finished ? generationsTotal.current / finished : null,
      failed: failedTotal,
      images: sum('images'),
      creditsSpent: sum('creditsSpent'),
      creditsOutstanding: creditsOutstanding._sum.credits ?? 0,
      revenue: sum('revenue'),
      orders: sum('orders'),
      lifetimeRevenue: (lifetimeRevenue._sum.amount ?? 0) / 100,
      paidUsers,
      suspended,
      openFlags,
      flaggedUsers: flaggedUsers.length,
      allGenerations,
      latencyMs: {
        p50: latency[0]?.p50 ?? null,
        p95: latency[0]?.p95 ?? null,
        avg: latency[0]?.avg == null ? null : Number(latency[0].avg),
      },
      // New signups per distinct visitor in the period.
      conversion:
        num(uniques[0]?.current) > 0
          ? sum('signups').current / num(uniques[0]?.current)
          : null,
    },
    visitorCountries: asList(
      tally((v) => v.country),
      10,
    ),
    visitorCities: asList(
      tally((v) =>
        v.city ? `${v.city}${v.country ? `, ${v.country}` : ''}` : null,
      ),
      8,
    ),
    userCountries: usersByCountry
      .map((r) => ({ name: r.country ?? 'Unknown', value: r._count._all }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    sources: asList(tally(sourceOf), 10),
    userSources: usersBySource
      .map((r) => ({
        name: r.acquisition_source ?? 'Unknown',
        value: r._count._all,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    devices: asList(
      tally((v) => v.device),
      3,
    ),
    browsers: asList(tally((v) => v.browser)),
    os: asList(tally((v) => v.os)),
    pages: pages.map((p) => ({
      path: p.path,
      views: num(p.views),
      visitors: num(p.visitors),
    })),
    workflows: workflows.map((w) => ({
      workflow: w.workflow ?? 'UNKNOWN',
      tier: w.tier,
      total: num(w.total),
      failed: num(w.failed),
    })),
    creditBuckets: BUCKETS.map((bucket) => ({
      bucket,
      users: bucketMap.get(bucket) ?? 0,
    })),
    flagCategories: flagCategories.map((f) => ({
      name: f.category,
      value: num(f.flags),
    })),
  };
};

export type AdminOverview = Awaited<ReturnType<typeof getOverview>>;
