'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Activity,
  Coins,
  Eye,
  Flag,
  IndianRupee,
  Timer,
  UserPlus,
  Users,
} from 'lucide-react';
import { AppPageHeader } from '@/components/app/AppShell';
import { useAdminOverview } from '@/hooks/admin';
import type { AdminOverview } from '@/types/admin';
import { CategoryBars, DailyChart, Donut } from './charts';
import {
  categoryLabel,
  duration,
  fmt,
  percent,
  rupees,
  WORKFLOWS,
} from './format';
import { BarList, Country, Delta, KpiCard, Panel, Segmented } from './ui';

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const Kpis = ({
  data,
  loading,
}: {
  data?: AdminOverview;
  loading: boolean;
}) => {
  const k = data?.kpis;
  return (
    <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
      <KpiCard
        label='Total users'
        icon={Users}
        loading={loading}
        value={fmt(k?.totalUsers)}
        delta={k && <Delta {...k.newUsers} />}
        hint={k && `${fmt(k.newUsers.current)} new · ${fmt(k.paidUsers)} paid`}
      />
      <KpiCard
        label='Unique visitors'
        icon={Eye}
        loading={loading}
        value={fmt(k?.visitors.current)}
        delta={k && <Delta {...k.visitors} />}
        hint={
          k &&
          `${fmt(k.views.current)} page views · ${percent(k.conversion)} sign up`
        }
      />
      <KpiCard
        label='Active users'
        icon={UserPlus}
        loading={loading}
        value={fmt(k?.activeUsers)}
        hint='Signed in and browsed, or generated'
      />
      <KpiCard
        label='Generations'
        icon={Activity}
        loading={loading}
        value={fmt(k?.generations.current)}
        delta={k && <Delta {...k.generations} />}
        hint={
          k &&
          `${percent(k.successRate)} succeeded · ${fmt(k.failed.current)} failed`
        }
      />
      <KpiCard
        label='Revenue'
        icon={IndianRupee}
        loading={loading}
        value={k ? rupees(k.revenue.current) : '—'}
        delta={k && <Delta {...k.revenue} />}
        hint={
          k &&
          `${fmt(k.orders.current)} orders · ${rupees(k.lifetimeRevenue)} all time`
        }
      />
      <KpiCard
        label='Credits held by users'
        icon={Coins}
        loading={loading}
        value={fmt(k?.creditsOutstanding)}
        hint={k && `${fmt(k.creditsSpent.current)} spent in this period`}
      />
      <KpiCard
        label='Median render time'
        icon={Timer}
        loading={loading}
        value={duration(k?.latencyMs.p50)}
        hint={
          k &&
          `p95 ${duration(k.latencyMs.p95)} · avg ${duration(k.latencyMs.avg)}`
        }
      />
      <KpiCard
        label='Open prompt flags'
        icon={Flag}
        tone={k && k.openFlags > 0 ? 'warning' : undefined}
        loading={loading}
        value={fmt(k?.openFlags)}
        hint={
          k && (
            <Link href='/admin/moderation' className='hover:underline'>
              {fmt(k.flaggedUsers)} users flagged · {fmt(k.suspended)} suspended
            </Link>
          )
        }
      />
    </div>
  );
};

const Switchable = ({
  title,
  description,
  views,
}: {
  title: string;
  description: string;
  views: { key: string; label: string; body: React.ReactNode }[];
}) => {
  const [view, setView] = useState(views[0].key);
  return (
    <Panel
      title={title}
      description={description}
      action={
        <Segmented
          label={`${title} view`}
          value={view}
          onChange={setView}
          options={views.map((v) => ({ value: v.key, label: v.label }))}
        />
      }
    >
      {views.find((v) => v.key === view)?.body}
    </Panel>
  );
};

export const OverviewView = () => {
  const [range, setRange] = useState(30);
  const { data, isLoading, isFetching, dataUpdatedAt } =
    useAdminOverview(range);
  const series = data?.series ?? [];
  const period = `Last ${range} days`;

  return (
    <>
      <AppPageHeader
        title='Overview'
        description={
          dataUpdatedAt
            ? `${period} · India time · refreshed ${new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}${isFetching ? ' · updating…' : ''}`
            : period
        }
        actions={
          <Segmented
            label='Date range'
            value={range}
            onChange={setRange}
            options={RANGES}
          />
        }
      />

      <div className='grid gap-4'>
        <Kpis data={data} loading={isLoading} />

        <div className='grid gap-4 lg:grid-cols-3'>
          <Panel
            title='Traffic'
            description='Unique visitors and page views per day'
            className='lg:col-span-2'
          >
            <DailyChart
              kind='area'
              data={series}
              series={[
                { key: 'visitors', label: 'Visitors', color: 'var(--viz-1)' },
                { key: 'views', label: 'Page views', color: 'var(--viz-2)' },
              ]}
            />
          </Panel>
          <Panel
            title='Devices'
            description={`Visitors seen, ${period.toLowerCase()}`}
          >
            <Donut items={data?.devices ?? []} centerLabel='visitors' />
          </Panel>
        </div>

        <div className='grid gap-4 lg:grid-cols-2'>
          <Panel title='Signups' description='New accounts per day'>
            <DailyChart
              data={series}
              series={[
                { key: 'signups', label: 'Signups', color: 'var(--viz-1)' },
              ]}
            />
          </Panel>
          <Panel title='Generations' description='Per day, by how they ended'>
            <DailyChart
              data={series}
              series={[
                { key: 'completed', label: 'Completed', color: 'var(--viz-1)' },
                { key: 'failed', label: 'Failed', color: 'var(--destructive)' },
                { key: 'open', label: 'Still running', color: 'var(--viz-4)' },
              ]}
            />
          </Panel>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <Switchable
            title='Countries'
            description='Where people are browsing from'
            views={[
              {
                key: 'visitors',
                label: 'Visitors',
                body: (
                  <BarList
                    items={data?.visitorCountries ?? []}
                    label={(c) => <Country code={c} />}
                  />
                ),
              },
              {
                key: 'users',
                label: 'Users',
                body: (
                  <BarList
                    items={data?.userCountries ?? []}
                    label={(c) => <Country code={c} />}
                    empty='Recorded from each user’s first signed-in visit.'
                  />
                ),
              },
            ]}
          />
          <Switchable
            title='Sources'
            description='Referrer or utm_source of the first visit'
            views={[
              {
                key: 'visitors',
                label: 'Visitors',
                body: <BarList items={data?.sources ?? []} />,
              },
              {
                key: 'users',
                label: 'Signups',
                body: (
                  <BarList
                    items={data?.userSources ?? []}
                    empty='Recorded from each user’s first signed-in visit.'
                  />
                ),
              },
            ]}
          />
          <Panel title='Cities' description='Top visitor locations'>
            <BarList items={data?.visitorCities ?? []} />
          </Panel>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <Panel title='Browsers' description='Visitors by browser'>
            <BarList items={data?.browsers ?? []} />
          </Panel>
          <Panel title='Operating systems' description='Visitors by OS'>
            <BarList items={data?.os ?? []} />
          </Panel>
          <Panel
            title='Top pages'
            description='Most viewed paths'
            bodyClassName='px-0 pb-2'
          >
            {data?.pages.length ? (
              <table className='w-full text-sm'>
                <thead className='text-xs text-muted-foreground'>
                  <tr>
                    <th className='px-4 py-1.5 text-left font-normal sm:px-5'>
                      Path
                    </th>
                    <th className='px-2 py-1.5 text-right font-normal'>
                      Views
                    </th>
                    <th className='px-4 py-1.5 text-right font-normal sm:px-5'>
                      Visitors
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.pages.map((p) => (
                    <tr key={p.path} className='border-t'>
                      <td className='max-w-0 truncate px-4 py-1.5 font-mono text-xs sm:px-5'>
                        {p.path}
                      </td>
                      <td className='px-2 py-1.5 text-right font-mono text-xs tabular-nums'>
                        {fmt(p.views)}
                      </td>
                      <td className='px-4 py-1.5 text-right font-mono text-xs text-muted-foreground tabular-nums sm:px-5'>
                        {fmt(p.visitors)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className='py-6 text-center text-xs text-muted-foreground'>
                No page views in this period yet.
              </p>
            )}
          </Panel>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <Panel title='Credits' description='Spent on generations vs granted'>
            <DailyChart
              kind='line'
              data={series}
              series={[
                { key: 'creditsSpent', label: 'Spent', color: 'var(--viz-1)' },
                {
                  key: 'creditsGranted',
                  label: 'Granted',
                  color: 'var(--viz-3)',
                },
              ]}
            />
          </Panel>
          <Panel title='Revenue' description='Paid orders per day'>
            <DailyChart
              data={series}
              format={(n) => rupees(n)}
              series={[
                { key: 'revenue', label: 'Revenue', color: 'var(--viz-3)' },
              ]}
            />
          </Panel>
          <Panel
            title='Credit balances'
            description='Users by credits left right now'
          >
            <CategoryBars
              data={data?.creditBuckets ?? []}
              dataKey='users'
              categoryKey='bucket'
              label='Users'
            />
          </Panel>
        </div>

        <div className='grid gap-4 lg:grid-cols-2'>
          <Panel
            title='Workflows'
            description='Generations by workflow and tier'
            bodyClassName='px-0 pb-2'
          >
            {data?.workflows.length ? (
              <table className='w-full text-sm'>
                <thead className='text-xs text-muted-foreground'>
                  <tr>
                    <th className='px-4 py-1.5 text-left font-normal sm:px-5'>
                      Workflow
                    </th>
                    <th className='px-2 py-1.5 text-left font-normal'>Tier</th>
                    <th className='px-2 py-1.5 text-right font-normal'>Runs</th>
                    <th className='px-4 py-1.5 text-right font-normal sm:px-5'>
                      Failure rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.workflows]
                    .sort((a, b) => b.total - a.total)
                    .map((w) => (
                      <tr key={`${w.workflow}-${w.tier}`} className='border-t'>
                        <td className='px-4 py-2 sm:px-5'>
                          {WORKFLOWS[w.workflow] ?? w.workflow}
                        </td>
                        <td className='px-2 py-2 text-muted-foreground capitalize'>
                          {w.tier?.toLowerCase() ?? 'edit model'}
                        </td>
                        <td className='px-2 py-2 text-right font-mono text-xs tabular-nums'>
                          {fmt(w.total)}
                        </td>
                        <td className='px-4 py-2 text-right font-mono text-xs tabular-nums sm:px-5'>
                          {percent(w.total ? w.failed / w.total : null)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className='py-6 text-center text-xs text-muted-foreground'>
                No generations in this period.
              </p>
            )}
          </Panel>
          <Panel
            title='Flagged prompt categories'
            description='What moderation and the injection check caught'
            action={
              <Link
                href='/admin/moderation'
                className='text-xs text-muted-foreground hover:text-foreground'
              >
                Review →
              </Link>
            }
          >
            <BarList
              items={data?.flagCategories ?? []}
              label={categoryLabel}
              empty='Nothing flagged in this period.'
            />
          </Panel>
        </div>

        <p className='text-xs text-muted-foreground'>
          Traffic is counted by ThumbAI itself with a first-party cookie. Visits
          from before this release, from bots and to admin pages are not
          included.
        </p>
      </div>
    </>
  );
};
