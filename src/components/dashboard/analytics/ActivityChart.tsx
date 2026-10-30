'use client';

import { useElementWidth } from '../useElementWidth';
import { formatBucket, formatCount } from '../format';
import type { SeriesPoint } from '../types';
import { ChartTooltip, TooltipRow } from './ChartTooltip';
import { columnPath, integerTicks, labelIndices } from './scale';
import { useSeriesCursor } from './useSeriesCursor';

const HEIGHT = 220;
const MARGIN = { top: 16, right: 4, bottom: 24, left: 32 };
const BAR = 'var(--chart-1)';

/** Generations per day (or week) as columns from a shared baseline. */
export const ActivityChart = ({
  series,
  granularity,
}: {
  series: SeriesPoint[];
  granularity: 'day' | 'week';
}) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + innerHeight;
  const count = series.length;
  const slot = count ? innerWidth / count : 0;
  // Never fill the slot: cap at 24px and leave at least a 2px surface gap.
  const barWidth = Math.max(1, Math.min(24, slot - 2));

  const max = Math.max(0, ...series.map((point) => point.generations));
  const ticks = integerTicks(max);
  const top = ticks[ticks.length - 1];
  const y = (value: number) => baseline - (value / top) * innerHeight;
  const xOf = (index: number) =>
    MARGIN.left + index * slot + (slot - barWidth) / 2;

  const cursor = useSeriesCursor({ count, left: MARGIN.left, slot });
  const active = cursor.index !== null ? series[cursor.index] : null;
  const peakIndex = max
    ? series.findIndex((point) => point.generations === max)
    : -1;
  const unit = granularity === 'week' ? 'Week of ' : '';

  return (
    <div
      ref={ref}
      className='relative rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
      role='group'
      aria-label={`Generations per ${granularity}. Use the arrow keys to read each ${granularity}.`}
      {...cursor.keyProps}
    >
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          className='block touch-pan-y select-none'
          aria-hidden
          {...cursor.pointerProps}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke='var(--border)'
                strokeWidth={1}
                shapeRendering='crispEdges'
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy='0.32em'
                textAnchor='end'
                className='fill-muted-foreground font-mono text-[11px] tabular-nums'
              >
                {formatCount(tick)}
              </text>
            </g>
          ))}

          {active && cursor.index !== null && (
            <rect
              x={MARGIN.left + cursor.index * slot}
              y={MARGIN.top}
              width={slot}
              height={innerHeight}
              fill='var(--accent)'
            />
          )}

          {series.map((point, index) => (
            <path
              key={point.date}
              d={columnPath(
                xOf(index),
                y(point.generations),
                barWidth,
                baseline,
              )}
              fill={BAR}
              opacity={
                cursor.index === null || cursor.index === index ? 1 : 0.55
              }
            />
          ))}

          {peakIndex >= 0 && barWidth >= 6 && (
            <text
              x={xOf(peakIndex) + barWidth / 2}
              y={y(max) - 6}
              textAnchor='middle'
              className='fill-foreground font-mono text-[11px] tabular-nums'
            >
              {formatCount(max)}
            </text>
          )}

          {labelIndices(count, innerWidth).map((index, i, all) => (
            <text
              key={index}
              x={
                i === 0
                  ? MARGIN.left
                  : i === all.length - 1
                    ? width - MARGIN.right
                    : xOf(index) + barWidth / 2
              }
              y={HEIGHT - 6}
              textAnchor={
                i === 0 ? 'start' : i === all.length - 1 ? 'end' : 'middle'
              }
              className='fill-muted-foreground text-[11px]'
            >
              {formatBucket(series[index].date)}
            </text>
          ))}
        </svg>
      )}

      {!max && width > 0 && (
        <p className='absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-muted-foreground'>
          No generations in this range
        </p>
      )}

      {active && cursor.index !== null && (
        <ChartTooltip
          x={xOf(cursor.index) + barWidth / 2}
          y={MARGIN.top}
          containerWidth={width}
        >
          <p className='mb-1 font-medium'>
            {unit}
            {formatBucket(active.date, true)}
          </p>
          <TooltipRow
            color={BAR}
            value={formatCount(active.generations)}
            label='generations'
          />
          <TooltipRow value={formatCount(active.images)} label='images' />
          {active.failed > 0 && (
            <TooltipRow value={formatCount(active.failed)} label='failed' />
          )}
        </ChartTooltip>
      )}
    </div>
  );
};
