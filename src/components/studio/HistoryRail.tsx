'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGenerations } from '@/hooks/user/generations';
import type { GenerationItem, Workflow } from '@/components/dashboard/types';
import {
  WORKFLOW_LABELS,
  formatRelative,
  isRunning,
} from '@/components/dashboard/format';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

const HistoryRow = ({
  item,
  active,
  showWorkflow,
  onSelect,
}: {
  item: GenerationItem;
  active: boolean;
  showWorkflow: boolean;
  onSelect: (item: GenerationItem) => void;
}) => {
  const cover = item.image_url[0];
  const running = isRunning(item.status);
  const failed = item.status === 'FAILED';
  const usable = item.status === 'COMPLETED' && !!cover;
  const portrait = item.aspect_ratio === '9:16';

  return (
    <li>
      <button
        type='button'
        disabled={!usable}
        onClick={() => onSelect(item)}
        aria-current={active || undefined}
        className={cn(
          'group flex w-full gap-2.5 rounded-lg p-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          active ? 'bg-accent' : 'hover:bg-secondary',
          !usable && 'cursor-default',
        )}
      >
        <span
          className={cn(
            'relative flex h-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary',
            portrait ? 'w-7' : 'w-[86px]',
          )}
        >
          {usable ? (
            <img
              src={cover}
              alt=''
              loading='lazy'
              className='h-full w-full object-cover'
            />
          ) : running ? (
            <Loader2 className='size-4 animate-spin text-muted-foreground' />
          ) : (
            <AlertCircle className='size-4 text-destructive' />
          )}
          {item.image_url.length > 1 && (
            <span className='absolute bottom-0.5 right-0.5 rounded bg-card/90 px-1 text-[10px] leading-4 tabular-nums'>
              {item.image_url.length}
            </span>
          )}
        </span>
        <span className='min-w-0 flex-1'>
          <span className='line-clamp-2 text-xs leading-snug text-foreground'>
            {item.prompt || 'Untitled'}
          </span>
          <span className='mt-0.5 block truncate text-[11px] text-muted-foreground'>
            {running
              ? 'Rendering…'
              : failed
                ? 'Failed, credits refunded'
                : formatRelative(item.createdAt)}
            {showWorkflow &&
              item.model_used &&
              ` · ${WORKFLOW_LABELS[item.model_used]}`}
          </span>
        </span>
      </button>
    </li>
  );
};

/**
 * Recent generations beside the canvas. Picking one loads its images onto
 * the canvas so they can be compared, exported or shortlisted again.
 */
export const HistoryRail = ({
  workflow,
  activeId,
  onSelect,
  headerClassName,
}: {
  workflow: Workflow;
  activeId: string | null;
  onSelect: (item: GenerationItem) => void;
  headerClassName?: string;
}) => {
  const [scope, setScope] = useState<'mode' | 'all'>('mode');
  const query = useGenerations(scope === 'mode' ? { workflow } : {});
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b px-4 py-3',
          headerClassName,
        )}
      >
        <h2 className='text-sm font-medium'>History</h2>
        <ToggleGroup
          type='single'
          size='sm'
          value={scope}
          onValueChange={(value) => value && setScope(value as 'mode' | 'all')}
          aria-label='History scope'
          className='rounded-lg bg-secondary p-0.5'
        >
          <ToggleGroupItem
            value='mode'
            className='h-6 rounded-md px-2 text-xs data-[state=on]:bg-card data-[state=on]:shadow-xs'
          >
            This mode
          </ToggleGroupItem>
          <ToggleGroupItem
            value='all'
            className='h-6 rounded-md px-2 text-xs data-[state=on]:bg-card data-[state=on]:shadow-xs'
          >
            All
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-2'>
        {query.isLoading ? (
          <ul className='space-y-1' aria-label='Loading history'>
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className='flex gap-2.5 p-1.5'>
                <Skeleton className='h-12 w-[86px] shrink-0 rounded-md' />
                <span className='flex-1 space-y-1.5 pt-1'>
                  <Skeleton className='h-3 w-full' />
                  <Skeleton className='h-3 w-2/3' />
                </span>
              </li>
            ))}
          </ul>
        ) : query.isError ? (
          <div className='p-3 text-xs text-muted-foreground'>
            <p>Couldn&rsquo;t load your history.</p>
            <button
              type='button'
              onClick={() => query.refetch()}
              className='mt-1 text-brand underline-offset-2 hover:underline'
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className='m-1.5 rounded-lg border border-dashed p-3 text-xs text-muted-foreground'>
            {scope === 'mode'
              ? 'Nothing made in this mode yet. Your generations will collect here.'
              : 'Nothing generated yet. Your generations will collect here.'}
          </p>
        ) : (
          <>
            <ul className='space-y-0.5'>
              {items.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  showWorkflow={scope === 'all'}
                  onSelect={onSelect}
                />
              ))}
            </ul>
            {query.hasNextPage && (
              <button
                type='button'
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className='mt-1 w-full rounded-lg py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-60'
              >
                {query.isFetchingNextPage ? 'Loading…' : 'Load older'}
              </button>
            )}
          </>
        )}
      </div>

      <div className='border-t px-4 py-3'>
        <Link
          href='/dashboard'
          className='text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline'
        >
          Open the full library
        </Link>
      </div>
    </div>
  );
};
