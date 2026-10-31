'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
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
import { useAdminUsers } from '@/hooks/admin';
import type { AdminUser } from '@/types/admin';
import { cn } from '@/lib/utils';
import { UserActionsMenu } from './actions';
import { ago, fmt } from './format';
import {
  Country,
  DeviceIcons,
  Pager,
  Pill,
  RowsSkeleton,
  Segmented,
  SeverityBadge,
  TableEmpty,
  UserCell,
} from './ui';

type Sort = 'createdAt' | 'email' | 'credits' | 'thumbnails' | 'lastActive';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'suspended', label: 'Suspended' },
];

const SortHead = ({
  label,
  field,
  sort,
  order,
  onSort,
  className,
}: {
  label: string;
  field: Sort;
  sort: Sort;
  order: 'asc' | 'desc';
  onSort: (field: Sort) => void;
  className?: string;
}) => {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={
        active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button
        type='button'
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className='size-3.5' />
      </button>
    </TableHead>
  );
};

const StatusCell = ({ user }: { user: AdminUser }) => (
  <div className='flex flex-wrap items-center gap-1'>
    {user.suspendedAt ? (
      <Pill className='border-destructive/30 bg-destructive/10 text-destructive'>
        Suspended
      </Pill>
    ) : null}
    {user.openFlags > 0 && user.flagSeverity ? (
      <span className='inline-flex items-center gap-1'>
        <SeverityBadge severity={user.flagSeverity} />
        <span className='font-mono text-[11px] text-muted-foreground'>
          ×{user.openFlags}
        </span>
      </span>
    ) : null}
    {!user.suspendedAt && user.openFlags === 0 && (
      <span className='text-xs text-muted-foreground'>OK</span>
    )}
    {user.role === 'ADMIN' && <Pill>Admin</Pill>}
  </div>
);

export const UsersView = () => {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('all');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState<Sort>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);
  useEffect(() => setPage(1), [q, status, plan, role, sort, order]);

  const { data, isLoading, isFetching } = useAdminUsers({
    q,
    status,
    plan: plan === 'all' ? undefined : plan,
    role: role === 'all' ? undefined : role,
    sort,
    order,
    page,
  });

  const onSort = (field: Sort) => {
    if (field === sort) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setSort(field);
      setOrder(field === 'email' ? 'asc' : 'desc');
    }
  };
  const head = { sort, order, onSort };

  return (
    <>
      <AppPageHeader
        title='Users'
        description={
          data
            ? `${fmt(data.stats.users)} accounts · ${fmt(data.stats.credits)} credits held · ${fmt(data.stats.thumbnails)} generations`
            : 'Every account, with what they hold and how they use it'
        }
      />

      <div className='mb-3 flex flex-col gap-2 lg:flex-row lg:items-center'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search name, email, user or Clerk id'
            className='h-9 pl-9'
          />
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Segmented
            label='Status'
            value={status}
            onChange={setStatus}
            options={STATUSES}
          />
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className='h-9 w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All plans</SelectItem>
              <SelectItem value='FREE'>Free</SelectItem>
              <SelectItem value='PAID'>Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className='h-9 w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All roles</SelectItem>
              <SelectItem value='USER'>Users</SelectItem>
              <SelectItem value='ADMIN'>Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-card transition-opacity',
          isFetching && !isLoading && 'opacity-70',
        )}
      >
        {isLoading ? (
          <RowsSkeleton />
        ) : !data || data.users.length === 0 ? (
          <TableEmpty>No users match these filters.</TableEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <SortHead
                  label='User'
                  field='email'
                  className='pl-4'
                  {...head}
                />
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Plan</TableHead>
                <SortHead
                  label='Credits'
                  field='credits'
                  {...head}
                  className='text-right'
                />
                <SortHead
                  label='Generations'
                  field='thumbnails'
                  {...head}
                  className='text-right'
                />
                <SortHead label='Last active' field='lastActive' {...head} />
                <SortHead label='Joined' field='createdAt' {...head} />
                <TableHead className='w-10 pr-4' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((user) => (
                <TableRow
                  key={user.id}
                  className={cn(user.suspendedAt && 'bg-destructive/[0.03]')}
                >
                  <TableCell className='max-w-64 pl-4'>
                    <UserCell
                      id={user.id}
                      email={user.email}
                      name={user.name}
                      imageUrl={user.imageUrl}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusCell user={user} />
                  </TableCell>
                  <TableCell className='max-w-44 text-sm'>
                    {user.country ? (
                      <span className='grid leading-tight'>
                        <Country code={user.country} />
                        {user.city && (
                          <span className='truncate text-xs text-muted-foreground'>
                            {user.city}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='max-w-32 truncate text-sm'>
                    {user.source ?? (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DeviceIcons devices={user.devices} />
                  </TableCell>
                  <TableCell>
                    <Pill
                      className={cn(
                        user.plan === 'PAID' &&
                          'border-[var(--viz-1)]/30 bg-[var(--viz-1)]/10 text-accent-foreground',
                      )}
                    >
                      {user.plan === 'PAID' ? 'Paid' : 'Free'}
                    </Pill>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono tabular-nums',
                      user.credits === 0 && 'text-muted-foreground',
                    )}
                  >
                    {fmt(user.credits)}
                  </TableCell>
                  <TableCell className='text-right font-mono tabular-nums'>
                    {fmt(user.thumbnailCount)}
                  </TableCell>
                  <TableCell
                    className='text-sm whitespace-nowrap text-muted-foreground'
                    title={user.lastActiveAt}
                  >
                    {ago(user.lastActiveAt)}
                  </TableCell>
                  <TableCell
                    className='text-sm whitespace-nowrap text-muted-foreground'
                    title={user.createdAt}
                  >
                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className='pr-4'>
                    <UserActionsMenu user={user} />
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
