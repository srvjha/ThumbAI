'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppPageHeader } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalytics } from '@/hooks/user/generations';
import { cn } from '@/lib/utils';
import { StatTile } from '../StatTile';
import { StatusChip } from '../StatusChip';
import {
  ASPECT_LABELS,
  TIER_LABELS,
  WORKFLOW_LABELS,
  formatBucket,
  formatCount,
  formatPercent,
  formatRelative,
} from '../format';
import type { AnalyticsData, AnalyticsRange } from '../types';
import { ActivityChart } from './ActivityChart';
import { ActivityHeatmap, heatmapTable, peakActivity } from './ActivityHeatmap';
import { BreakdownBars } from './BreakdownBars';
import { ChartCard, LegendItem } from './ChartCard';
import { CREDIT_SERIES, CreditsChart } from './CreditsChart';
import { RangeSwitcher, rangeLabel } from './RangeSwitcher';

const Kpis = ({ data }: { data: AnalyticsData }) => {
  const { totals } = data;
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6'>
      <StatTile
        label='Generations'
        value={formatCount(totals.generations)}
        hint={
          totals.pending
            ? `${totals.pending} in progress`
            : rangeLabel(data.range)
        }
      />
      <StatTile label='Images produced' value={formatCount(totals.images)} />
      <StatTile
        label='Success rate'
        value={formatPercent(totals.successRate)}
        hint={`${formatCount(totals.failed)} failed, refunded`}
      />
      <StatTile
        label='Credits spent'
        value={formatCount(totals.creditsSpent)}
        hint='Estimated'
      />
      <StatTile
        label='Credits purchased'
        value={formatCount(totals.creditsPurchased)}
        hint={`${totals.ordersPaid} ${totals.ordersPaid === 1 ? 'order' : 'orders'}`}
      />
      <StatTile
        label='Balance'
        value={formatCount(totals.balance)}
        hint={
          <Link href='/billing' className='text-brand hover:underline'>
            Top up
          </Link>
        }
      />
    </div>
  );
};

const RecentActivity = ({ data }: { data: AnalyticsData }) => (
  <section className='rounded-xl border bg-card p-4 sm:p-5'>
    <div className='mb-3 flex items-center justify-between'>
      <h2 className='text-sm font-medium'>Recent activity</h2>
      <Link
        href='/dashboard'
        className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
      >
        Library
        <ArrowRight className='size-3' />
      </Link>
    </div>
    {data.recent.length === 0 ? (
      <p className='py-6 text-center text-sm text-muted-foreground'>
        Nothing in this range
      </p>
    ) : (
      <ul className='divide-y'>
        {data.recent.map((item) => (
          <li key={item.id} className='flex items-center gap-3 py-2.5'>
            <div className='flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-secondary'>
              {item.image_url[0] && (
                <img
                  src={item.image_url[0]}
                  alt=''
                  loading='lazy'
                  className={cn(
                    'h-full',
                    item.aspect_ratio === '9:16'
                      ? 'w-auto'
                      : 'w-full object-cover',
                  )}
                />
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm'>
                {item.prompt || 'No prompt recorded'}
              </p>
              <p className='text-xs text-muted-foreground'>
                {WORKFLOW_LABELS[item.model_used ?? 'UNKNOWN']} ·{' '}
                {formatRelative(item.createdAt)}
              </p>
            </div>
            <StatusChip status={item.status} className='shrink-0' />
          </li>
        ))}
      </ul>
    )}
  </section>
);

const LoadingState = () => (
  <div className='space-y-4'>
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6'>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className='h-[94px] rounded-xl' />
      ))}
    </div>
    <Skeleton className='h-[310px] rounded-xl' />
    <div className='grid gap-4 lg:grid-cols-2'>
      <Skeleton className='h-[310px] rounded-xl' />
      <Skeleton className='h-[310px] rounded-xl' />
    </div>
  </div>
);

export const AnalyticsView = () => {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } =
    useAnalytics(range);

  const unit = data?.granularity === 'week' ? 'week' : 'day';
  const peak = data ? peakActivity(data.heatmap) : null;

  return (
    <>
      <AppPageHeader
        title='Analytics'
        description='What you have made, and what it cost.'
        actions={<RangeSwitcher value={range} onChange={setRange} />}
      />

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <div className='rounded-xl border bg-card p-8 text-center text-sm'>
          <p>Analytics didn&apos;t load.</p>
          <Button variant='outline' className='mt-3' onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        // Refetch keeps the frame: dim the previous range, no skeleton.
        <div
          className={cn(
            'space-y-4 transition-opacity',
            isPlaceholderData && isFetching && 'opacity-60',
          )}
          aria-busy={isFetching}
        >
          <Kpis data={data} />

          <ChartCard
            title={`Generations per ${unit}`}
            description={`${formatCount(data.totals.generations)} generations, ${formatCount(data.totals.images)} images · ${rangeLabel(data.range)}`}
            table={{
              columns: [
                unit === 'week' ? 'Week of' : 'Date',
                'Generations',
                'Images',
                'Failed',
              ],
              rows: data.series.map((point) => [
                formatBucket(point.date, true),
                point.generations,
                point.images,
                point.failed,
              ]),
            }}
          >
            <ActivityChart
              series={data.series}
              granularity={data.granularity}
            />
          </ChartCard>

          <div className='grid gap-4 lg:grid-cols-2'>
            <ChartCard
              title='Credits spent vs purchased'
              description='Running totals. Spend is estimated from each model’s per-image price; failed jobs are refunded and excluded.'
              legend={
                <div className='flex flex-wrap gap-x-5 gap-y-1'>
                  <LegendItem
                    color={CREDIT_SERIES.purchased.color}
                    label={CREDIT_SERIES.purchased.label}
                    value={formatCount(data.totals.creditsPurchased)}
                  />
                  <LegendItem
                    color={CREDIT_SERIES.spent.color}
                    label={CREDIT_SERIES.spent.label}
                    value={formatCount(data.totals.creditsSpent)}
                  />
                </div>
              }
              table={{
                columns: [
                  unit === 'week' ? 'Week of' : 'Date',
                  'Purchased',
                  'Spent (est.)',
                ],
                rows: data.series.map((point) => [
                  formatBucket(point.date, true),
                  point.creditsPurchased,
                  point.creditsSpent,
                ]),
              }}
            >
              <CreditsChart series={data.series} />
            </ChartCard>

            <ChartCard
              title='When you create'
              description={
                peak
                  ? `Busiest on ${peak.day}, most often around ${peak.hour}. Your local time.`
                  : 'No activity in this range.'
              }
              table={heatmapTable(data.heatmap)}
            >
              <ActivityHeatmap heatmap={data.heatmap} />
            </ChartCard>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <BreakdownBars
              title='By workflow'
              rows={data.byWorkflow}
              labels={WORKFLOW_LABELS}
            />
            <BreakdownBars
              title='By tier'
              rows={data.byTier}
              labels={TIER_LABELS}
            />
            <BreakdownBars
              title='By aspect ratio'
              rows={data.byAspectRatio}
              labels={ASPECT_LABELS}
            />
          </div>

          <RecentActivity data={data} />
        </div>
      )}
    </>
  );
};
