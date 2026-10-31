'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Flag, ImageOff, Search } from 'lucide-react';
import { AppPageHeader } from '@/components/app/AppShell';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminGenerations } from '@/hooks/admin';
import { cn } from '@/lib/utils';
import { GenerationSheet } from './GenerationSheet';
import { dateTime, duration, fmt, WORKFLOWS } from './format';
import { GenStatus, Pager, RowsSkeleton, Segmented, TableEmpty } from './ui';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'IN_PROGRESS', label: 'Running' },
  { value: 'PENDING', label: 'Queued' },
];

/** The log of every generation, newest first, refreshing on its own. */
export const GenerationsView = ({ userId }: { userId?: string }) => {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState(userId ?? '');
  const [status, setStatus] = useState('');
  const [workflow, setWorkflow] = useState('all');
  const [tier, setTier] = useState('all');
  const [flagged, setFlagged] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (userId) return;
    const id = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search, userId]);
  useEffect(() => setPage(1), [q, status, workflow, tier, flagged]);

  const { data, isLoading, isFetching } = useAdminGenerations({
    q,
    status,
    workflow: workflow === 'all' ? undefined : workflow,
    tier: tier === 'all' ? undefined : tier,
    flagged,
    page,
  });

  const counts = data?.byStatus ?? {};
  const statusOptions = STATUSES.map((s) => ({
    value: s.value,
    label: (
      <>
        {s.label}
        {s.value && counts[s.value as keyof typeof counts] ? (
          <span className='ml-1.5 font-mono text-muted-foreground'>
            {fmt(counts[s.value as keyof typeof counts] ?? 0)}
          </span>
        ) : null}
      </>
    ),
  }));

  return (
    <>
      {!userId && (
        <AppPageHeader
          title='Generations'
          description='Every request, its settings, timing, cost and outcome. Updates every 15 seconds.'
        />
      )}

      <div className='mb-3 flex flex-col gap-2 xl:flex-row xl:items-center'>
        {!userId && (
          <div className='relative flex-1'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search user email, generation or request id'
              className='h-9 pl-9'
            />
          </div>
        )}
        <div className='flex flex-wrap items-center gap-2'>
          <Segmented
            label='Status'
            value={status}
            onChange={setStatus}
            options={statusOptions}
          />
          <Select value={workflow} onValueChange={setWorkflow}>
            <SelectTrigger className='h-9 w-36'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All workflows</SelectItem>
              <SelectItem value='TEXT_TO_IMAGE'>Text to image</SelectItem>
              <SelectItem value='IMAGE_TO_IMAGE'>Image to image</SelectItem>
              <SelectItem value='URL_TO_IMAGE'>Blog cover</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className='h-9 w-28'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All tiers</SelectItem>
              <SelectItem value='DRAFT'>Draft</SelectItem>
              <SelectItem value='QUALITY'>Quality</SelectItem>
            </SelectContent>
          </Select>
          <button
            type='button'
            aria-pressed={flagged}
            onClick={() => setFlagged(!flagged)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs',
              flagged
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <Flag className='size-3.5' />
            Flagged only
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-card transition-opacity',
          isFetching && !isLoading && 'opacity-80',
        )}
      >
        {isLoading ? (
          <RowsSkeleton />
        ) : !data || data.generations.length === 0 ? (
          <TableEmpty>No generations match these filters.</TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='pl-4'>Result</TableHead>
                <TableHead>When</TableHead>
                {!userId && <TableHead>User</TableHead>}
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Took</TableHead>
                <TableHead className='text-right'>Credits</TableHead>
                <TableHead className='text-right'>Steps</TableHead>
                <TableHead className='pr-4'>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.generations.map((g) => (
                <TableRow
                  key={g.id}
                  onClick={() => setOpen(g.id)}
                  className='cursor-pointer'
                >
                  <TableCell className='pl-4'>
                    <div className='relative h-9 w-16 overflow-hidden rounded-md border bg-secondary'>
                      {g.thumbnail ? (
                        <img
                          src={g.thumbnail}
                          alt=''
                          loading='lazy'
                          className='size-full object-cover'
                        />
                      ) : (
                        <ImageOff className='absolute inset-0 m-auto size-4 text-muted-foreground' />
                      )}
                      {g.flags > 0 && (
                        <span
                          className='absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-sm bg-destructive text-white'
                          title={`${g.flags} prompt flag${g.flags === 1 ? '' : 's'}`}
                        >
                          <Flag className='size-2.5' />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
                    {dateTime(g.createdAt)}
                  </TableCell>
                  {!userId && (
                    <TableCell className='max-w-52 truncate text-sm'>
                      <Link
                        href={`/admin/users/${g.user.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className='hover:underline'
                      >
                        {g.user.email}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className='text-sm whitespace-nowrap'>
                    {WORKFLOWS[g.workflow ?? 'UNKNOWN']}
                    <span className='ml-1.5 text-xs text-muted-foreground'>
                      {g.tier?.toLowerCase() ?? 'edit'} · {g.aspectRatio ?? '—'}{' '}
                      · {g.images ?? 1}×
                    </span>
                  </TableCell>
                  <TableCell>
                    <GenStatus status={g.status} />
                  </TableCell>
                  <TableCell className='text-right font-mono text-xs tabular-nums'>
                    {duration(g.latencyMs)}
                  </TableCell>
                  <TableCell className='text-right font-mono text-xs whitespace-nowrap tabular-nums'>
                    {g.charged || '—'}
                    {g.refunded > 0 && (
                      <span className='text-muted-foreground'>
                        {' '}
                        (−{g.refunded} refunded)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='text-right font-mono text-xs text-muted-foreground tabular-nums'>
                    {g.events || '—'}
                  </TableCell>
                  <TableCell
                    className='max-w-56 truncate pr-4 text-xs text-destructive'
                    title={g.error ?? undefined}
                  >
                    {g.error ?? ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && data.total > 0 && (
          <Pager
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={setPage}
          />
        )}
      </div>

      <GenerationSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
};
