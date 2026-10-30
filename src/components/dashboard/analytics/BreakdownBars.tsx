'use client';

import { useState } from 'react';
import { formatCount, formatPercent } from '../format';
import type { BreakdownRow } from '../types';
import { ChartCard } from './ChartCard';

/**
 * Horizontal bars for one categorical breakdown. Every value is printed, so
 * the focus/hover detail only adds images and estimated credits.
 */
export const BreakdownBars = ({
  title,
  rows,
  labels,
}: {
  title: string;
  rows: BreakdownRow[];
  labels: Record<string, string>;
}) => {
  const [active, setActive] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + row.generations, 0);
  const max = Math.max(1, ...rows.map((row) => row.generations));
  const nameOf = (key: string) => labels[key] ?? key;

  return (
    <ChartCard
      title={title}
      description={total ? `${formatCount(total)} generations` : undefined}
      table={{
        columns: ['', 'Generations', 'Share', 'Images', 'Credits (est.)'],
        rows: rows.map((row) => [
          nameOf(row.key),
          row.generations,
          formatPercent(total ? row.generations / total : null),
          row.images,
          row.credits,
        ]),
      }}
    >
      {rows.length === 0 ? (
        <p className='py-6 text-center text-sm text-muted-foreground'>
          Nothing in this range
        </p>
      ) : (
        <ul className='space-y-3'>
          {rows.map((row) => {
            const share = total ? row.generations / total : 0;
            const open = active === row.key;
            return (
              <li
                key={row.key}
                tabIndex={0}
                onPointerEnter={() => setActive(row.key)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(row.key)}
                onBlur={() => setActive(null)}
                aria-label={`${nameOf(row.key)}: ${row.generations} generations, ${formatPercent(share)}, ${row.images} images, about ${row.credits} credits`}
                className='-mx-2 rounded-lg px-2 py-1 outline-none transition-colors hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/50'
              >
                <div className='mb-1.5 flex items-baseline justify-between gap-3 text-sm'>
                  <span className='truncate'>{nameOf(row.key)}</span>
                  <span className='shrink-0 font-mono text-xs tabular-nums'>
                    {formatCount(row.generations)}
                    <span className='ml-1.5 text-muted-foreground'>
                      {formatPercent(share)}
                    </span>
                  </span>
                </div>
                <div className='h-2 rounded-r-sm bg-secondary'>
                  <div
                    className='h-full rounded-r-[4px]'
                    style={{
                      width: `${(row.generations / max) * 100}%`,
                      background: 'var(--chart-1)',
                    }}
                  />
                </div>
                <p
                  className='mt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground'
                  hidden={!open}
                >
                  {formatCount(row.images)} images · ~{formatCount(row.credits)}{' '}
                  credits
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
};
