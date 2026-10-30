'use client';

import { cn } from '@/lib/utils';
import type { AnalyticsRange } from '../types';

const OPTIONS: { value: AnalyticsRange; label: string; long: string }[] = [
  { value: '7d', label: '7D', long: 'Last 7 days' },
  { value: '30d', label: '30D', long: 'Last 30 days' },
  { value: '90d', label: '90D', long: 'Last 90 days' },
  { value: 'all', label: 'All', long: 'All time' },
];

export const rangeLabel = (range: AnalyticsRange) =>
  OPTIONS.find((option) => option.value === range)?.long ?? 'This month';

/** Segmented date-range control; scopes every figure on the page. */
export const RangeSwitcher = ({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}) => (
  <div
    role='radiogroup'
    aria-label='Date range'
    className='inline-flex rounded-lg border bg-card p-0.5'
  >
    {OPTIONS.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value}
          type='button'
          role='radio'
          aria-checked={selected}
          aria-label={option.long}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 min-w-11 rounded-md px-3 font-mono text-xs tabular-nums transition-colors',
            selected
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
