import { NextRequest, NextResponse } from 'next/server';
import { GEN_STATUS } from '@prisma/client';
import { db } from '@/db';
import { EDIT_MODEL } from '@/config/models';
import { ApiResponse } from '@/utils/ApiResponse';
import type {
  AnalyticsData,
  AnalyticsRange,
  BreakdownRow,
  SeriesPoint,
} from '@/components/dashboard/types';
import {
  errorResponse,
  estimateCredits,
  generationSelect,
  requireUser,
  toGenerationItem,
} from '../generations/shared';

const DAY = 86_400_000;
const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
const RANGES: AnalyticsRange[] = ['7d', '30d', '90d', 'all', 'mtd'];
// Past this many days a daily series is too dense to read; switch to weeks.
const WEEKLY_AFTER_DAYS = 120;

/** YYYY-MM-DD of a local-time instant (already shifted by the offset). */
const dayKey = (localMs: number) =>
  new Date(localMs).toISOString().slice(0, 10);

/** Monday of the local week containing localMs, as a local midnight. */
const weekStart = (localMs: number) => {
  const midnight = Math.floor(localMs / DAY) * DAY;
  const weekday = (new Date(midnight).getUTCDay() + 6) % 7; // 0 = Monday
  return midnight - weekday * DAY;
};

const tally = (
  map: Map<string, BreakdownRow>,
  key: string,
  images: number,
  credits: number,
) => {
  const row = map.get(key) ?? { key, generations: 0, images: 0, credits: 0 };
  row.generations += 1;
  row.images += images;
  row.credits += credits;
  map.set(key, row);
};

const sorted = (map: Map<string, BreakdownRow>) =>
  [...map.values()].sort((a, b) => b.generations - a.generations);

/**
 * GET /api/me/analytics?range=7d|30d|90d|all|mtd&tz=<minutes>
 *
 * tz is the browser's getTimezoneOffset(), so days, weekdays and hours bucket
 * in the user's local time rather than the server's.
 */
export const GET = async (req: NextRequest) => {
  try {
    const user = await requireUser();
    const params = req.nextUrl.searchParams;

    const rangeParam = params.get('range') ?? '30d';
    const range: AnalyticsRange = RANGES.includes(rangeParam as AnalyticsRange)
      ? (rangeParam as AnalyticsRange)
      : '30d';
    const tzRaw = Number(params.get('tz'));
    const tz = Number.isFinite(tzRaw) && Math.abs(tzRaw) <= 840 ? tzRaw : 0;
    const offsetMs = tz * 60_000;

    const now = Date.now();
    const localToday = Math.floor((now - offsetMs) / DAY) * DAY;

    // Range start as a UTC instant (null = all time).
    let from: Date | null = null;
    if (RANGE_DAYS[range]) {
      from = new Date(localToday - (RANGE_DAYS[range] - 1) * DAY + offsetMs);
    } else if (range === 'mtd') {
      const today = new Date(localToday);
      from = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1) + offsetMs,
      );
    }
    const createdAt = from ? { gte: from } : undefined;

    // One narrow select for the range; everything is bucketed in JS.
    const [rows, orders, recent] = await Promise.all([
      db.thumbnail.findMany({
        where: { user_id: user.id, createdAt },
        select: {
          createdAt: true,
          status: true,
          num_of_images: true,
          model_used: true,
          model_tier: true,
          model_endpoint: true,
          aspect_ratio: true,
        },
      }),
      db.order.findMany({
        where: { user_id: user.id, status: 'paid', createdAt },
        select: { createdAt: true, credits: true },
      }),
      db.thumbnail.findMany({
        where: { user_id: user.id, createdAt },
        select: generationSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
    ]);

    // Series frame: every bucket from the range start to today, zero-filled.
    let startLocal: number;
    if (from) {
      startLocal = from.getTime() - offsetMs;
    } else {
      const earliest = Math.min(
        now,
        ...rows.map((r) => r.createdAt.getTime()),
        ...orders.map((o) => o.createdAt.getTime()),
      );
      startLocal = Math.floor((earliest - offsetMs) / DAY) * DAY;
    }
    const spanDays = Math.round((localToday - startLocal) / DAY) + 1;
    const granularity = spanDays > WEEKLY_AFTER_DAYS ? 'week' : 'day';
    const bucketOf = (localMs: number) =>
      dayKey(granularity === 'week' ? weekStart(localMs) : localMs);

    const series = new Map<string, SeriesPoint>();
    const step = granularity === 'week' ? 7 * DAY : DAY;
    const first = granularity === 'week' ? weekStart(startLocal) : startLocal;
    for (let t = first; t <= localToday; t += step) {
      const date = dayKey(t);
      series.set(date, {
        date,
        generations: 0,
        images: 0,
        failed: 0,
        creditsSpent: 0,
        creditsPurchased: 0,
      });
    }

    const byWorkflow = new Map<string, BreakdownRow>();
    const byTier = new Map<string, BreakdownRow>();
    const byAspect = new Map<string, BreakdownRow>();
    const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));

    let images = 0;
    let completed = 0;
    let failed = 0;
    let pending = 0;
    let creditsSpent = 0;

    for (const row of rows) {
      const isFailed = row.status === GEN_STATUS.FAILED;
      const isDone = row.status === GEN_STATUS.COMPLETED;
      const produced = isDone ? (row.num_of_images ?? 1) : 0;
      // Failed generations are refunded, so they cost nothing. Spend isn't
      // stored per row; this is an estimate (see estimateCredits).
      const cost = isFailed ? 0 : estimateCredits(row);

      if (isDone) completed += 1;
      else if (isFailed) failed += 1;
      else pending += 1;
      images += produced;
      creditsSpent += cost;

      const localMs = row.createdAt.getTime() - offsetMs;
      const point = series.get(bucketOf(localMs));
      if (point) {
        point.generations += 1;
        point.images += produced;
        point.failed += isFailed ? 1 : 0;
        point.creditsSpent += cost;
      }

      const local = new Date(localMs);
      heatmap[(local.getUTCDay() + 6) % 7][local.getUTCHours()] += 1;

      tally(byWorkflow, row.model_used ?? 'UNKNOWN', produced, cost);
      // The edit model has no tiers; label it rather than guessing.
      const tier =
        row.model_endpoint === EDIT_MODEL.endpointId
          ? 'EDIT'
          : (row.model_tier ?? 'UNKNOWN');
      tally(byTier, tier, produced, cost);
      tally(byAspect, row.aspect_ratio ?? 'UNKNOWN', produced, cost);
    }

    let creditsPurchased = 0;
    for (const order of orders) {
      creditsPurchased += order.credits;
      const point = series.get(bucketOf(order.createdAt.getTime() - offsetMs));
      if (point) point.creditsPurchased += order.credits;
    }

    const finished = completed + failed;
    const data: AnalyticsData = {
      range,
      from: from?.toISOString() ?? null,
      to: new Date(now).toISOString(),
      granularity,
      totals: {
        generations: rows.length,
        images,
        completed,
        failed,
        pending,
        successRate: finished ? completed / finished : null,
        creditsSpent,
        creditsPurchased,
        ordersPaid: orders.length,
        balance: user.credits,
      },
      series: [...series.values()],
      byWorkflow: sorted(byWorkflow),
      byTier: sorted(byTier),
      byAspectRatio: sorted(byAspect),
      heatmap,
      recent: recent.map(toGenerationItem),
    };

    return NextResponse.json(
      new ApiResponse(200, data, 'Analytics fetched successfully'),
      { status: 200 },
    );
  } catch (err: any) {
    return errorResponse(err);
  }
};
