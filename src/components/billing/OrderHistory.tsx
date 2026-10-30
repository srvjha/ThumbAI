'use client';

import Link from 'next/link';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export type OrderStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface OrderRow {
  id: string;
  productName: string | null;
  /** In paise, as charged by Razorpay. */
  amount: number | null;
  credits: number;
  status: OrderStatus;
  createdAt: string;
}

// Keyed under ['user'] so the checkout's invalidation of ['user'] after a
// payment refreshes this list too.
export const ORDERS_QUERY_KEY = ['user', 'orders'] as const;

export const useOrders = () =>
  useQuery<OrderRow[]>({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: async () => {
      const res = await axios.get('/api/me/orders');
      return res.data.data ?? [];
    },
  });

const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-accent text-accent-foreground' },
  pending: { label: 'Processing', className: 'bg-secondary text-foreground' },
  created: {
    label: 'Not completed',
    className: 'bg-secondary text-muted-foreground',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-secondary text-muted-foreground',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive',
  },
  refunded: { label: 'Refunded', className: 'bg-secondary text-foreground' },
};

const StatusLabel = ({ status }: { status: OrderStatus }) => {
  const s = STATUS[status] ?? STATUS.created;
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        s.className,
      )}
    >
      {s.label}
    </span>
  );
};

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
});

const rupees = (paise: number | null) =>
  paise == null ? '—' : `₹${(paise / 100).toLocaleString('en-IN')}`;

export const OrderHistory = () => {
  const { data, isLoading, isError } = useOrders();

  if (isLoading) {
    return (
      <div className='space-y-2'>
        {[0, 1, 2].map((i) => (
          <div key={i} className='h-14 animate-pulse rounded-xl bg-secondary' />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className='rounded-xl border bg-card p-6 text-sm text-muted-foreground'>
        Could not load your orders. Refresh to try again.
      </p>
    );
  }

  if (!data?.length) {
    return (
      <div className='rounded-xl border border-dashed bg-card p-8 text-center'>
        <p className='text-sm font-medium'>No purchases yet</p>
        <p className='mt-1 text-sm text-muted-foreground'>
          Credits you buy will show up here with their receipts.{' '}
          <Link href='/pricing' className='text-brand hover:underline'>
            Compare plans
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className='overflow-hidden rounded-xl border bg-card'>
      {/* Table from sm up; stacked rows on phones. */}
      <table className='hidden w-full text-left text-sm sm:table'>
        <thead className='border-b bg-secondary/60 text-xs text-muted-foreground'>
          <tr>
            <th className='px-4 py-2.5 font-medium'>Date</th>
            <th className='px-4 py-2.5 font-medium'>Plan</th>
            <th className='px-4 py-2.5 text-right font-medium'>Credits</th>
            <th className='px-4 py-2.5 text-right font-medium'>Amount</th>
            <th className='px-4 py-2.5 font-medium'>Status</th>
          </tr>
        </thead>
        <tbody className='divide-y'>
          {data.map((order) => {
            const date = new Date(order.createdAt);
            return (
              <tr key={order.id}>
                <td className='px-4 py-3'>
                  <div>{dateFmt.format(date)}</div>
                  <div className='text-xs text-muted-foreground'>
                    {timeFmt.format(date)}
                  </div>
                </td>
                <td className='px-4 py-3'>{order.productName ?? 'Credits'}</td>
                <td className='px-4 py-3 text-right font-mono tabular-nums'>
                  +{order.credits}
                </td>
                <td className='px-4 py-3 text-right font-mono tabular-nums'>
                  {rupees(order.amount)}
                </td>
                <td className='px-4 py-3'>
                  <StatusLabel status={order.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className='divide-y sm:hidden'>
        {data.map((order) => (
          <li key={order.id} className='flex items-start justify-between gap-3 p-4'>
            <div className='min-w-0'>
              <div className='truncate text-sm font-medium'>
                {order.productName ?? 'Credits'}
              </div>
              <div className='mt-0.5 text-xs text-muted-foreground'>
                {dateFmt.format(new Date(order.createdAt))}
              </div>
              <div className='mt-2'>
                <StatusLabel status={order.status} />
              </div>
            </div>
            <div className='shrink-0 text-right font-mono text-sm tabular-nums'>
              <div>+{order.credits} cr</div>
              <div className='mt-0.5 text-xs text-muted-foreground'>
                {rupees(order.amount)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
