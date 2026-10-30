'use client';

import { useMemo } from 'react';
import { useElementWidth } from '../useElementWidth';
import { formatBucket, formatCount } from '../format';
import type { SeriesPoint } from '../types';
import { ChartTooltip, TooltipRow } from './ChartTooltip';
import { integerTicks, labelIndices } from './scale';
import { useSeriesCursor } from './useSeriesCursor';

const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 24, left: 36 };

export const CREDIT_SERIES = {
  spent: { label: 'Spent (est.)', color: 'var(--chart-1)' },
  purchased: { label: 'Purchased', color: 'var(--chart-3)' },
} as const;

/** Running totals of credits spent and purchased across the range. */
export const CreditsChart = ({ series }: { series: SeriesPoint[] }) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const count = series.length;
  const slot = count ? innerWidth / count : 0;

  const cumulative = useMemo(() => {
    let spent = 0;
    let purchased = 0;
    return series.map((point) => {
      spent += point.creditsSpent;
      purchased += point.creditsPurchased;
      return { ...point, spent, purchased };
    });
  }, [series]);

  const last = cumulative[cumulative.length - 1];
  const max = Math.max(last?.spent ?? 0, last?.purchased ?? 0);
  const ticks = integerTicks(max);
  const top = ticks[ticks.length - 1];
  const y = (value: number) =>
    MARGIN.top + innerHeight - (value / top) * innerHeight;
  // Points sit at slot centres so the cursor lines up with the column chart.
  const x = (index: number) => MARGIN.left + index * slot + slot / 2;

  const path = (key: 'spent' | 'purchased') =>
    cumulative
      .map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point[key])}`)
      .join(' ');

  const cursor = useSeriesCursor({ count, left: MARGIN.left, slot });
  const active = cursor.index !== null ? cumulative[cursor.index] : null;
  const markIndex = cursor.index ?? count - 1;

  return (
    <div
      ref={ref}
      className='relative rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
      role='group'
      aria-label='Running credits spent and purchased. Use the arrow keys to read each point.'
      {...cursor.keyProps}
    >
      {width > 0 && count > 0 && (
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

          {active && (
            <line
              x1={x(markIndex)}
              x2={x(markIndex)}
              y1={MARGIN.top}
              y2={MARGIN.top + innerHeight}
              stroke='var(--muted-foreground)'
              strokeWidth={1}
              shapeRendering='crispEdges'
            />
          )}

          {(['purchased', 'spent'] as const).map((key) => (
            <path
              key={key}
              d={path(key)}
              fill='none'
              stroke={CREDIT_SERIES[key].color}
              strokeWidth={2}
              strokeLinejoin='round'
              strokeLinecap='round'
            />
          ))}

          {/* End markers, or the hovered point, ringed in the surface colour. */}
          {last &&
            (['purchased', 'spent'] as const).map((key) => (
              <circle
                key={key}
                cx={x(markIndex)}
                cy={y(cumulative[markIndex][key])}
                r={4}
                fill={CREDIT_SERIES[key].color}
                stroke='var(--card)'
                strokeWidth={2}
              />
            ))}

          {labelIndices(count, innerWidth).map((index, i, all) => (
            <text
              key={index}
              x={
                i === 0
                  ? MARGIN.left
                  : i === all.length - 1
                    ? width - MARGIN.right
                    : x(index)
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

      {active && cursor.index !== null && (
        <ChartTooltip x={x(cursor.index)} y={MARGIN.top} containerWidth={width}>
          <p className='mb-1 font-medium'>
            Through {formatBucket(active.date, true)}
          </p>
          <TooltipRow
            color={CREDIT_SERIES.purchased.color}
            value={formatCount(active.purchased)}
            label={`purchased${active.creditsPurchased ? ` (+${formatCount(active.creditsPurchased)})` : ''}`}
          />
          <TooltipRow
            color={CREDIT_SERIES.spent.color}
            value={formatCount(active.spent)}
            label={`spent, est.${active.creditsSpent ? ` (+${formatCount(active.creditsSpent)})` : ''}`}
          />
        </ChartTooltip>
      )}
    </div>
  );
};
