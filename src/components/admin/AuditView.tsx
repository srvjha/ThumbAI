'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppPageHeader } from '@/components/app/AppShell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminAudit } from '@/hooks/admin';
import { dateTime } from './format';
import { Pager, Pill, RowsSkeleton, Segmented, TableEmpty } from './ui';

export const ACTION_LABELS: Record<string, string> = {
  SUSPEND: 'Suspended',
  UNSUSPEND: 'Lifted suspension',
  RESET_FLAGS: 'Reset flags',
  ADJUST_CREDITS: 'Adjusted credits',
};

/** One action's detail in words: amount, balance, reason. */
export const actionDetail = (action: string, detail: unknown) => {
  const d = (detail ?? {}) as {
    amount?: number;
    balance?: number;
    reason?: string;
  };
  const parts = [];
  if (action === 'ADJUST_CREDITS' && typeof d.amount === 'number') {
    parts.push(
      `${d.amount > 0 ? '+' : ''}${d.amount} credits${typeof d.balance === 'number' ? ` → ${d.balance}` : ''}`,
    );
  }
  if (d.reason) parts.push(`“${d.reason}”`);
  return parts.join(' · ');
};

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'ADJUST_CREDITS', label: 'Credits' },
  { value: 'SUSPEND', label: 'Suspensions' },
  { value: 'UNSUSPEND', label: 'Lifted' },
  { value: 'RESET_FLAGS', label: 'Flag resets' },
];

export const AuditView = () => {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [action]);
  const { data, isLoading } = useAdminAudit({ action, page });

  return (
    <>
      <AppPageHeader
        title='Audit log'
        description='Every change an admin has made to an account, with who did it and why.'
        actions={
          <Segmented
            label='Action'
            value={action}
            onChange={setAction}
            options={FILTERS}
          />
        }
      />
      <div className='overflow-hidden rounded-xl border bg-card'>
        {isLoading ? (
          <RowsSkeleton />
        ) : !data || data.actions.length === 0 ? (
          <TableEmpty>No admin actions yet.</TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='pl-4'>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead className='pr-4'>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.actions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className='pl-4 text-xs whitespace-nowrap text-muted-foreground'>
                    {dateTime(a.createdAt)}
                  </TableCell>
                  <TableCell className='text-sm'>{a.admin}</TableCell>
                  <TableCell>
                    <Pill>{ACTION_LABELS[a.action] ?? a.action}</Pill>
                  </TableCell>
                  <TableCell className='max-w-56 truncate text-sm'>
                    {a.target ? (
                      <Link
                        href={`/admin/users/${a.target.id}`}
                        className='hover:underline'
                      >
                        {a.target.email}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className='max-w-96 truncate pr-4 text-sm text-muted-foreground'>
                    {actionDetail(a.action, a.detail)}
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
    </>
  );
};
