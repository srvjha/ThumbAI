'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import { AppPageHeader } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/user/auth';
import { useAnalytics, useGenerations } from '@/hooks/user/generations';
import { cn } from '@/lib/utils';
import { GenerationCard } from './GenerationCard';
import { GenerationDialog } from './GenerationDialog';
import { LibraryFilters } from './LibraryFilters';
import { MasonryGrid } from './MasonryGrid';
import { StatTile } from './StatTile';
import { formatCount, formatPercent } from './format';
import type { GenerationFilters, GenerationItem } from './types';

const StatRow = () => {
  const { isLoaded, isSignedIn } = useUser();
  const { data: user, isLoading: userLoading } = useAuth({
    enabled: isLoaded && !!isSignedIn,
  });
  const { data, isLoading } = useAnalytics('mtd');
  const totals = data?.totals;
  return (
    <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
      <StatTile
        label='Credit balance'
        value={formatCount(user?.credits ?? totals?.balance ?? 0)}
        hint={
          <Link href='/billing' className='text-brand hover:underline'>
            Top up
          </Link>
        }
        loading={userLoading && isLoading}
      />
      <StatTile
        label='Generations this month'
        value={formatCount(totals?.generations ?? 0)}
        hint={totals?.pending ? `${totals.pending} in progress` : undefined}
        loading={isLoading}
      />
      <StatTile
        label='Images this month'
        value={formatCount(totals?.images ?? 0)}
        loading={isLoading}
      />
      <StatTile
        label='Success rate'
        value={formatPercent(totals?.successRate ?? null)}
        hint={totals?.failed ? `${totals.failed} failed, refunded` : undefined}
        loading={isLoading}
      />
    </div>
  );
};

const EmptyLibrary = () => (
  <div className='rounded-xl border bg-card px-6 py-14 text-center sm:py-20'>
    <h2 className='font-serif text-3xl tracking-tight'>Nothing here yet</h2>
    <p className='mx-auto mt-2 max-w-sm text-sm text-muted-foreground'>
      Every thumbnail, Short and blog cover you generate lands here, ready to
      download or take back into the studio.
    </p>
    <div className='mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row'>
      <Button variant='brand' size='xl' asChild>
        <Link href='/studio/text-to-image'>
          Make your first thumbnail
          <ArrowRight />
        </Link>
      </Button>
      <Button variant='ghost' asChild>
        <Link href='/studio/blog-cover'>Or turn a blog post into a cover</Link>
      </Button>
    </div>
  </div>
);

const GridSkeleton = () => (
  <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4'>
    {Array.from({ length: 8 }, (_, index) => (
      <div key={index} className='overflow-hidden rounded-xl border bg-card'>
        <Skeleton className='aspect-video rounded-none' />
        <div className='space-y-2 p-3'>
          <Skeleton className='h-3.5 w-full' />
          <Skeleton className='h-3 w-1/2' />
        </div>
      </div>
    ))}
  </div>
);

export const LibraryView = () => {
  const [filters, setFilters] = useState<GenerationFilters>({});
  const [selected, setSelected] = useState<GenerationItem | null>(null);
  const {
    data,
    isLoading,
    isError,
    isPlaceholderData,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useGenerations(filters);

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );
  const filtered = Object.values(filters).some(Boolean);
  const onFiltersChange = useCallback(
    (next: GenerationFilters) => setFilters(next),
    [],
  );
  const open = useCallback((item: GenerationItem) => setSelected(item), []);

  // Keep the dialog in step with background refreshes of the list.
  const selectedLive = selected
    ? (items.find((item) => item.id === selected.id) ?? selected)
    : null;

  return (
    <>
      <AppPageHeader
        title='Library'
        description='Everything you have generated, newest first.'
        actions={
          <Button variant='brand' asChild>
            <Link href='/studio/text-to-image'>
              <Plus />
              New generation
            </Link>
          </Button>
        }
      />

      <StatRow />

      <section className='mt-8 space-y-4' aria-label='Generations'>
        {!isLoading && !filtered && items.length === 0 && !isError ? (
          <EmptyLibrary />
        ) : (
          <>
            <LibraryFilters filters={filters} onChange={onFiltersChange} />
            {isLoading ? (
              <GridSkeleton />
            ) : isError ? (
              <div className='rounded-xl border bg-card p-8 text-center text-sm'>
                <p>Your library didn&apos;t load.</p>
                <Button
                  variant='outline'
                  className='mt-3'
                  onClick={() => refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className='rounded-xl border bg-card p-10 text-center'>
                <p className='font-serif text-2xl'>No matches</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Nothing fits these filters.
                </p>
                <Button
                  variant='outline'
                  className='mt-4'
                  onClick={() => setFilters({})}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  'transition-opacity',
                  isPlaceholderData && isFetching && 'opacity-60',
                )}
              >
                <MasonryGrid
                  items={items}
                  renderItem={(item) => (
                    <GenerationCard item={item} onOpen={open} />
                  )}
                />
                {hasNextPage && (
                  <div className='mt-6 flex justify-center'>
                    <Button
                      variant='outline'
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage && (
                        <Loader2 className='animate-spin' />
                      )}
                      Load more
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <GenerationDialog item={selectedLive} onClose={() => setSelected(null)} />
    </>
  );
};
