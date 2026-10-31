'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Minus,
  Smartphone,
  Tablet,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { countryFlag, countryName, fmt } from './format';

/** Frame for a chart or table: title, a line of context, an action. */
export const Panel = ({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) => (
  <section
    className={cn('flex min-w-0 flex-col rounded-xl border bg-card', className)}
  >
    <header className='flex items-start justify-between gap-3 px-4 pt-4 sm:px-5'>
      <div className='min-w-0'>
        <h2 className='text-sm font-medium'>{title}</h2>
        {description && (
          <p className='mt-0.5 text-xs text-muted-foreground'>{description}</p>
        )}
      </div>
      {action}
    </header>
    <div className={cn('flex-1 p-4 sm:px-5', bodyClassName)}>{children}</div>
  </section>
);

/** Change against the previous period, coloured by whether it's good. */
export const Delta = ({
  current,
  previous,
  inverse = false,
}: {
  current: number;
  previous: number;
  /** For counts where up is bad, such as failures. */
  inverse?: boolean;
}) => {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return <span className='text-xs text-muted-foreground'>new</span>;
  }
  const change = (current - previous) / previous;
  const flat = Math.abs(change) < 0.005;
  const good = flat ? null : change > 0 !== inverse;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 font-mono text-[11px] tabular-nums',
        good === null && 'text-muted-foreground',
        good === true &&
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        good === false && 'bg-destructive/10 text-destructive',
      )}
      title='Against the previous period of the same length'
    >
      <Icon className='size-3' />
      {flat ? '0%' : `${Math.abs(Math.round(change * 100))}%`}
    </span>
  );
};

export const KpiCard = ({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  loading,
  tone,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  delta?: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  tone?: 'warning';
}) => (
  <div className='min-w-0 rounded-xl border bg-card p-4'>
    <div className='flex items-center justify-between gap-2'>
      <p className='truncate text-xs text-muted-foreground'>{label}</p>
      <Icon
        className={cn(
          'size-4 shrink-0 text-muted-foreground',
          tone === 'warning' && 'text-destructive',
        )}
      />
    </div>
    <div className='mt-2 flex items-baseline gap-2'>
      {loading ? (
        <span className='inline-block h-7 w-16 animate-pulse rounded-md bg-accent' />
      ) : (
        <span className='font-mono text-2xl tracking-tight tabular-nums'>
          {value}
        </span>
      )}
      {!loading && delta}
    </div>
    {hint && (
      <p className='mt-1 truncate text-xs text-muted-foreground'>{hint}</p>
    )}
  </div>
);

/**
 * Ranked horizontal bars for top-N breakdowns: one hue, magnitude only.
 * Each row carries its value and share as text, so nothing needs hover.
 */
export const BarList = ({
  items,
  label = (name) => name,
  empty = 'No data in this period yet.',
}: {
  items: { name: string; value: number }[];
  label?: (name: string) => ReactNode;
  empty?: string;
}) => {
  if (items.length === 0) {
    return (
      <p className='py-6 text-center text-xs text-muted-foreground'>{empty}</p>
    );
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((a, i) => a + i.value, 0);
  return (
    <ul className='space-y-1.5'>
      {items.map((item) => (
        // The bar sits only under the label; the numbers get their own
        // columns so they never collide with its rounded end.
        <li
          key={item.name}
          className='grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-3 text-sm'
        >
          <span className='relative flex h-8 min-w-0 items-center'>
            <span
              aria-hidden
              className='absolute inset-y-0 left-0 rounded-md bg-[var(--viz-1)]/14'
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
            <span className='relative min-w-0 truncate px-2'>
              {label(item.name)}
            </span>
          </span>
          <span className='text-right font-mono text-xs tabular-nums'>
            {fmt(item.value)}
          </span>
          <span className='text-right font-mono text-xs text-muted-foreground tabular-nums'>
            {total ? `${Math.round((item.value / total) * 100)}%` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
};

export const Country = ({ code }: { code: string | null }) => (
  <span className='inline-flex min-w-0 items-center gap-1.5'>
    <span aria-hidden>{countryFlag(code)}</span>
    <span className='truncate'>{countryName(code)}</span>
  </span>
);

const DEVICE_ICONS: Record<string, LucideIcon> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
};

export const DeviceIcons = ({ devices }: { devices: string[] }) =>
  devices.length === 0 ? (
    <span className='text-muted-foreground'>—</span>
  ) : (
    <span className='inline-flex gap-1'>
      {devices.map((d) => {
        const Icon = DEVICE_ICONS[d] ?? Laptop;
        return (
          <Tooltip key={d}>
            <TooltipTrigger asChild>
              <Icon className='size-4 text-muted-foreground' aria-label={d} />
            </TooltipTrigger>
            <TooltipContent className='capitalize'>{d}</TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );

export const deviceIcon = (device: string) => DEVICE_ICONS[device] ?? Laptop;

const initials = (text: string) =>
  text
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const UserCell = ({
  id,
  email,
  name,
  imageUrl,
  link = true,
}: {
  id: string;
  email: string;
  name?: string | null;
  imageUrl?: string | null;
  link?: boolean;
}) => {
  const body = (
    <span className='flex min-w-0 items-center gap-2.5'>
      <Avatar className='size-8'>
        {imageUrl && <AvatarImage src={imageUrl} alt='' />}
        <AvatarFallback className='text-[11px]'>
          {initials(name || email)}
        </AvatarFallback>
      </Avatar>
      <span className='grid min-w-0 leading-tight'>
        <span className='truncate text-sm font-medium'>{name || email}</span>
        {name && (
          <span className='truncate text-xs text-muted-foreground'>
            {email}
          </span>
        )}
      </span>
    </span>
  );
  return link ? (
    <Link href={`/admin/users/${id}`} className='min-w-0 hover:underline'>
      {body}
    </Link>
  ) : (
    body
  );
};

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: 'border-destructive/30 bg-destructive/10 text-destructive',
  MEDIUM:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  LOW: 'border-border bg-secondary text-muted-foreground',
};

export const SeverityBadge = ({ severity }: { severity: string }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium capitalize',
      SEVERITY_STYLES[severity],
    )}
  >
    {severity.toLowerCase()}
  </span>
);

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  COMPLETED: {
    label: 'Completed',
    className: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
  },
  FAILED: { label: 'Failed', className: 'text-destructive bg-destructive/10' },
  PENDING: { label: 'Queued', className: 'text-muted-foreground bg-secondary' },
  IN_PROGRESS: {
    label: 'Running',
    className: 'text-accent-foreground bg-accent',
  },
};

export const GenStatus = ({ status }: { status: string }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        s.className,
      )}
    >
      <span className='size-1.5 rounded-full bg-current' aria-hidden />
      {s.label}
    </span>
  );
};

export const Pill = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md border bg-secondary/60 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap',
      className,
    )}
  >
    {children}
  </span>
);

export const Pager = ({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className='flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground'>
      <span className='tabular-nums'>
        {fmt(from)}–{fmt(to)} of {fmt(total)}
      </span>
      <div className='flex items-center gap-1'>
        <Button
          variant='outline'
          size='icon'
          className='size-8'
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label='Previous page'
        >
          <ChevronLeft />
        </Button>
        <span className='px-2 tabular-nums'>
          {page} / {pages}
        </span>
        <Button
          variant='outline'
          size='icon'
          className='size-8'
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label='Next page'
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
};

/** Segmented control used for ranges and status filters. */
export const Segmented = <T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) => (
  <div
    role='radiogroup'
    aria-label={label}
    className='inline-flex rounded-lg border bg-card p-0.5'
  >
    {options.map((o) => (
      <button
        key={String(o.value)}
        type='button'
        role='radio'
        aria-checked={o.value === value}
        onClick={() => onChange(o.value)}
        className={cn(
          'h-8 rounded-md px-3 text-xs whitespace-nowrap transition-colors',
          o.value === value
            ? 'bg-secondary font-medium text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const TableEmpty = ({ children }: { children: ReactNode }) => (
  <div className='px-4 py-16 text-center text-sm text-muted-foreground'>
    {children}
  </div>
);

export const RowsSkeleton = ({ rows = 8 }: { rows?: number }) => (
  <div className='divide-y'>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className='flex items-center gap-3 px-4 py-3'>
        <span className='size-8 animate-pulse rounded-full bg-accent' />
        <span className='h-4 flex-1 animate-pulse rounded bg-accent' />
        <span className='h-4 w-20 animate-pulse rounded bg-accent' />
      </div>
    ))}
  </div>
);
