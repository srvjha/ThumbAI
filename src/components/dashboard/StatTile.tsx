import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A label over one number, with an optional line of context beneath. */
export const StatTile = ({
  label,
  value,
  hint,
  loading,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  className?: string;
}) => (
  <div className={cn('min-w-0 rounded-xl border bg-card p-4', className)}>
    <p className='truncate text-xs text-muted-foreground'>{label}</p>
    <p className='mt-2 font-mono text-2xl tracking-tight tabular-nums'>
      {loading ? (
        <span className='inline-block h-7 w-16 animate-pulse rounded-md bg-accent align-middle' />
      ) : (
        value
      )}
    </p>
    {hint && (
      <p className='mt-1 truncate text-xs text-muted-foreground'>{hint}</p>
    )}
  </div>
);
