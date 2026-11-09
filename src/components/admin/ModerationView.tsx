'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AppPageHeader } from '@/components/app/AppShell';
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
import { useAdminFlags } from '@/hooks/admin';
import { cn } from '@/lib/utils';
import { UserActionsMenu } from './actions';
import { GenerationSheet } from './GenerationSheet';
import { categoryLabel, dateTime, fmt } from './format';
import {
  KpiCard,
  Pager,
  Pill,
  RowsSkeleton,
  Segmented,
  SeverityBadge,
  TableEmpty,
} from './ui';

/** What the user sent: the prompt, expandable when long, and any images. */
export const FlagRequest = ({
  prompt,
  imageUrls,
}: {
  prompt: string | null;
  imageUrls: string[];
}) => {
  const [expanded, setExpanded] = useState(false);
  if (!prompt && imageUrls.length === 0) {
    return (
      <span className='text-xs text-muted-foreground'>
        Not recorded (flagged before prompts were kept)
      </span>
    );
  }
  const long = (prompt?.length ?? 0) > 160;
  return (
    <div className='space-y-1.5'>
      {prompt && (
        <p
          className={cn(
            'text-sm whitespace-pre-wrap break-words',
            !expanded && 'line-clamp-3',
          )}
        >
          {prompt}
        </p>
      )}
      {long && (
        <button
          type='button'
          onClick={() => setExpanded((v) => !v)}
          className='text-xs text-muted-foreground hover:text-foreground hover:underline'
        >
          {expanded ? 'Show less' : 'Show all'}
        </button>
      )}
      {imageUrls.length > 0 && (
        <div className='flex flex-wrap gap-1'>
          {imageUrls.map((url) => (
            <a key={url} href={url} target='_blank' rel='noreferrer'>
              <img
                src={url}
                alt=''
                loading='lazy'
                className='h-10 w-14 rounded border object-cover'
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const STATES = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Reviewed' },
  { value: 'all', label: 'All' },
];

export const ModerationView = () => {
  const [state, setState] = useState('open');
  const [severity, setSeverity] = useState('all');
  const [source, setSource] = useState('all');
  const [page, setPage] = useState(1);
  const [generation, setGeneration] = useState<string | null>(null);
  useEffect(() => setPage(1), [state, severity, source]);

  const { data, isLoading, isFetching } = useAdminFlags({
    state,
    severity: severity === 'all' ? undefined : severity,
    source: source === 'all' ? undefined : source,
    page,
  });
  const open = data?.openBySeverity ?? {};

  return (
    <>
      <AppPageHeader
        title='Moderation'
        description='Requests that tripped the content check or the injection check, with what the user sent, so you can judge whether each flag was right.'
      />

      <div className='mb-4 grid grid-cols-3 gap-3'>
        <KpiCard
          label='High severity, open'
          icon={ShieldAlert}
          tone={open.HIGH ? 'warning' : undefined}
          loading={isLoading}
          value={fmt(open.HIGH ?? 0)}
          hint='Severe content or several attack patterns'
        />
        <KpiCard
          label='Medium, open'
          icon={ShieldAlert}
          loading={isLoading}
          value={fmt(open.MEDIUM ?? 0)}
          hint='Flagged by moderation or one attack pattern'
        />
        <KpiCard
          label='Low, open'
          icon={ShieldAlert}
          loading={isLoading}
          value={fmt(open.LOW ?? 0)}
          hint='Borderline scores or probing for the prompt'
        />
      </div>

      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <Segmented
          label='State'
          value={state}
          onChange={setState}
          options={STATES}
        />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className='h-9 w-36'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All severities</SelectItem>
            <SelectItem value='HIGH'>High</SelectItem>
            <SelectItem value='MEDIUM'>Medium</SelectItem>
            <SelectItem value='LOW'>Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className='h-9 w-40'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All checks</SelectItem>
            <SelectItem value='MODERATION'>Content moderation</SelectItem>
            <SelectItem value='INJECTION'>Injection check</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-card transition-opacity',
          isFetching && !isLoading && 'opacity-80',
        )}
      >
        {isLoading ? (
          <RowsSkeleton />
        ) : !data || data.flags.length === 0 ? (
          <TableEmpty>
            {state === 'open'
              ? 'No open flags. Nothing needs review.'
              : 'No flags match these filters.'}
          </TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='pl-4'>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Check</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead className='text-right'>Score</TableHead>
                <TableHead>Generation</TableHead>
                <TableHead>Review</TableHead>
                <TableHead className='w-10 pr-4' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.flags.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className='pl-4 text-xs whitespace-nowrap text-muted-foreground'>
                    {dateTime(f.createdAt)}
                  </TableCell>
                  <TableCell className='max-w-56'>
                    <Link
                      href={`/admin/users/${f.user.id}`}
                      className='block truncate text-sm hover:underline'
                    >
                      {f.user.email}
                    </Link>
                    <span className='text-xs text-muted-foreground'>
                      {f.user.suspendedAt ? (
                        <span className='text-destructive'>Suspended</span>
                      ) : (
                        `${fmt(f.user.openFlags)} open`
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={f.severity} />
                  </TableCell>
                  <TableCell className='text-sm whitespace-nowrap'>
                    {f.source === 'MODERATION' ? 'Content' : 'Injection'}
                  </TableCell>
                  <TableCell className='min-w-64 max-w-96 align-top'>
                    <FlagRequest prompt={f.prompt} imageUrls={f.imageUrls} />
                  </TableCell>
                  <TableCell>
                    <div className='flex max-w-72 flex-wrap gap-1'>
                      {f.categories.map((c) => (
                        <Pill key={c}>{categoryLabel(c)}</Pill>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className='text-right font-mono text-xs tabular-nums'>
                    {f.score == null ? '—' : f.score.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {f.generationId ? (
                      <button
                        type='button'
                        onClick={() => setGeneration(f.generationId)}
                        className='text-xs text-accent-foreground hover:underline'
                      >
                        Open log
                      </button>
                    ) : (
                      <span className='text-xs text-muted-foreground'>
                        Rejected before render
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
                    {f.resolvedAt ? `By ${f.resolvedBy ?? 'admin'}` : 'Open'}
                  </TableCell>
                  <TableCell className='pr-4'>
                    <UserActionsMenu user={f.user} />
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

      <GenerationSheet id={generation} onClose={() => setGeneration(null)} />
    </>
  );
};
