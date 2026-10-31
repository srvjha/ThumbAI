'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { fmt, shortDate } from './format';

export interface Series {
  key: string;
  label: string;
  color: string;
}

const configOf = (series: Series[]): ChartConfig =>
  Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  );

const axisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  fontSize: 11,
} as const;

/**
 * A daily series: area, bars or lines over one shared count axis. Bars
 * stack when there are several; the legend appears for two or more.
 */
export const DailyChart = ({
  data,
  series,
  kind = 'bar',
  format = fmt,
  className,
}: {
  data: Record<string, number | string>[];
  series: Series[];
  kind?: 'area' | 'bar' | 'line';
  format?: (n: number) => string;
  className?: string;
}) => {
  const config = configOf(series);
  const sparse = data.length > 45;
  const common = (
    <>
      <CartesianGrid vertical={false} strokeDasharray='3 3' />
      <XAxis
        dataKey='date'
        {...axisProps}
        minTickGap={24}
        tickFormatter={(v: string) => shortDate(v)}
      />
      <YAxis
        {...axisProps}
        width={40}
        allowDecimals={false}
        tickFormatter={(v: number) => format(v)}
      />
      <ChartTooltip
        cursor={kind === 'bar' ? { fillOpacity: 0.5 } : true}
        content={
          <ChartTooltipContent
            labelFormatter={(_, payload) =>
              shortDate(String(payload?.[0]?.payload?.date ?? ''))
            }
            formatter={(value, name) => (
              <span className='flex w-full items-center justify-between gap-4'>
                <span className='flex items-center gap-1.5 text-muted-foreground'>
                  <span
                    className='size-2 rounded-[2px]'
                    style={{ background: `var(--color-${name})` }}
                  />
                  {config[String(name)]?.label}
                </span>
                <span className='font-mono tabular-nums text-foreground'>
                  {format(Number(value))}
                </span>
              </span>
            )}
          />
        }
      />
      {series.length > 1 && (
        <ChartLegend content={<ChartLegendContent className='pt-2' />} />
      )}
    </>
  );

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto h-60 w-full', className)}
    >
      {kind === 'area' ? (
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.key}
                id={`fill-${s.key}`}
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop
                  offset='5%'
                  stopColor={`var(--color-${s.key})`}
                  stopOpacity={0.28}
                />
                <stop
                  offset='95%'
                  stopColor={`var(--color-${s.key})`}
                  stopOpacity={0.02}
                />
              </linearGradient>
            ))}
          </defs>
          {common}
          {series.map((s) => (
            <Area
              key={s.key}
              dataKey={s.key}
              type='monotone'
              stroke={`var(--color-${s.key})`}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
            />
          ))}
        </AreaChart>
      ) : kind === 'line' ? (
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          {common}
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              type='monotone'
              stroke={`var(--color-${s.key})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
            />
          ))}
        </LineChart>
      ) : (
        <BarChart
          data={data}
          margin={{ left: 0, right: 8, top: 8 }}
          barCategoryGap={sparse ? 1 : '20%'}
        >
          {common}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId={series.length > 1 ? 'stack' : undefined}
              fill={`var(--color-${s.key})`}
              // Rounded only on the top segment; a 1px card-coloured
              // stroke separates stacked segments.
              radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
              stroke='var(--card)'
              strokeWidth={series.length > 1 ? 1 : 0}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      )}
    </ChartContainer>
  );
};

/** Bars over named buckets rather than days, e.g. credit balances. */
export const CategoryBars = ({
  data,
  dataKey,
  categoryKey,
  label,
  color = 'var(--viz-1)',
  className,
}: {
  data: Record<string, number | string>[];
  dataKey: string;
  categoryKey: string;
  label: string;
  color?: string;
  className?: string;
}) => (
  <ChartContainer
    config={{ [dataKey]: { label, color } }}
    className={cn('aspect-auto h-52 w-full', className)}
  >
    <BarChart data={data} margin={{ left: 0, right: 8, top: 16 }}>
      <CartesianGrid vertical={false} strokeDasharray='3 3' />
      <XAxis dataKey={categoryKey} {...axisProps} />
      <YAxis {...axisProps} width={32} allowDecimals={false} />
      <ChartTooltip
        cursor={{ fillOpacity: 0.5 }}
        content={<ChartTooltipContent hideIndicator />}
      />
      <Bar
        dataKey={dataKey}
        fill={`var(--color-${dataKey})`}
        radius={[4, 4, 0, 0]}
        maxBarSize={44}
        label={{
          position: 'top',
          fontSize: 11,
          className: 'fill-muted-foreground',
          formatter: (v: unknown) => (Number(v) ? fmt(Number(v)) : ''),
        }}
      />
    </BarChart>
  </ChartContainer>
);

const DONUT_COLORS = [
  'var(--viz-1)',
  'var(--viz-2)',
  'var(--viz-3)',
  'var(--viz-4)',
];

/**
 * A donut for a few parts of a whole (devices). Every slice is listed
 * beside it with its count and share, so identity never rests on colour.
 */
export const Donut = ({
  items,
  label = (name: string) => name,
  centerLabel,
}: {
  items: { name: string; value: number }[];
  label?: (name: string) => string;
  centerLabel: string;
}) => {
  const total = items.reduce((a, i) => a + i.value, 0);
  if (total === 0) {
    return (
      <p className='py-10 text-center text-xs text-muted-foreground'>
        No data in this period yet.
      </p>
    );
  }
  const config: ChartConfig = Object.fromEntries(
    items.map((item, i) => [
      item.name,
      { label: label(item.name), color: DONUT_COLORS[i % DONUT_COLORS.length] },
    ]),
  );
  return (
    <div className='flex flex-col items-center gap-4 sm:flex-row'>
      <ChartContainer config={config} className='aspect-square h-40 shrink-0'>
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent nameKey='name' hideLabel />}
          />
          <Pie
            data={items}
            dataKey='value'
            nameKey='name'
            innerRadius='62%'
            outerRadius='100%'
            // The separating ring only makes sense between slices; on a
            // lone slice it draws a seam where the circle closes.
            stroke='var(--card)'
            strokeWidth={items.length > 1 ? 2 : 0}
            paddingAngle={items.length > 1 ? 2 : 0}
          >
            {items.map((item) => (
              <Cell key={item.name} fill={`var(--color-${item.name})`} />
            ))}
          </Pie>
          <text
            x='50%'
            y='46%'
            textAnchor='middle'
            className='fill-foreground font-mono text-lg'
          >
            {fmt(total)}
          </text>
          <text
            x='50%'
            y='60%'
            textAnchor='middle'
            className='fill-muted-foreground text-[10px]'
          >
            {centerLabel}
          </text>
        </PieChart>
      </ChartContainer>
      <ul className='w-full space-y-2 text-sm'>
        {items.map((item, i) => (
          <li key={item.name} className='flex items-center gap-2'>
            {/* Outside the chart, so the colour is named directly. */}
            <span
              className='size-2.5 shrink-0 rounded-[3px]'
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
              aria-hidden
            />
            <span className='flex-1 truncate capitalize'>
              {label(item.name)}
            </span>
            <span className='font-mono text-xs tabular-nums'>
              {fmt(item.value)}
            </span>
            <span className='w-10 text-right font-mono text-xs text-muted-foreground tabular-nums'>
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
