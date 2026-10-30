'use client';

import Link from 'next/link';
import { UserProfile, useUser } from '@clerk/nextjs';
import { AppPageHeader } from '@/components/app/AppShell';
import { StatTile } from '@/components/dashboard/StatTile';
import {
  formatCount,
  formatDate,
  formatPercent,
} from '@/components/dashboard/format';
import { ThemeSelect } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/user/auth';
import { useAnalytics } from '@/hooks/user/generations';

const Identity = () => {
  const { user, isLoaded } = useUser();
  const { data } = useAuth();
  const name = user?.fullName || user?.username || data?.email || '';
  const plan = data?.plan ? data.plan.toLowerCase() : null;

  return (
    <section className='flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:p-6'>
      {isLoaded && user ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.imageUrl}
          alt=''
          className='size-16 shrink-0 rounded-full border bg-secondary object-cover'
        />
      ) : (
        <span className='size-16 shrink-0 animate-pulse rounded-full bg-accent' />
      )}
      <div className='min-w-0 flex-1'>
        <p className='truncate text-xl font-semibold tracking-tight'>
          {name || <span className='text-muted-foreground'>—</span>}
        </p>
        <p className='truncate text-sm text-muted-foreground'>
          {user?.primaryEmailAddress?.emailAddress ?? data?.email}
        </p>
        <p className='mt-2 text-xs text-muted-foreground'>
          {plan && <span className='capitalize'>{plan} plan</span>}
          {plan && data?.createdAt && ' · '}
          {data?.createdAt && <>Member since {formatDate(data.createdAt)}</>}
        </p>
      </div>
      <Button asChild variant='brand' className='self-start sm:self-center'>
        <Link href='/billing'>Top up credits</Link>
      </Button>
    </section>
  );
};

const Usage = () => {
  const { data: account, isLoading: accountLoading } = useAuth();
  const { data, isLoading } = useAnalytics('all');
  const totals = data?.totals;

  return (
    <section
      aria-label='Usage'
      className='grid grid-cols-2 gap-3 lg:grid-cols-4'
    >
      <StatTile
        label='Credits left'
        value={formatCount(account?.credits ?? 0)}
        loading={accountLoading}
        hint={
          <Link href='/billing' className='hover:text-foreground'>
            Top up
          </Link>
        }
      />
      <StatTile
        label='Thumbnails made'
        value={formatCount(totals?.images ?? 0)}
        loading={isLoading}
        hint='All time'
      />
      <StatTile
        label='Generations'
        value={formatCount(totals?.generations ?? 0)}
        loading={isLoading}
        hint={
          <Link href='/dashboard' className='hover:text-foreground'>
            Open library
          </Link>
        }
      />
      <StatTile
        label='Success rate'
        value={formatPercent(totals?.successRate ?? null)}
        loading={isLoading}
        hint={
          <Link href='/dashboard/analytics' className='hover:text-foreground'>
            See analytics
          </Link>
        }
      />
    </section>
  );
};

const Appearance = () => (
  <section className='flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
    <div>
      <h2 className='text-base font-semibold'>Appearance</h2>
      <p className='mt-0.5 text-sm text-muted-foreground'>
        System follows your device’s light or dark setting.
      </p>
    </div>
    <ThemeSelect />
  </section>
);

/** Name, avatar, emails, password and sessions, all handled by Clerk. */
const AccountSettings = () => (
  <section>
    <h2 className='mb-3 text-base font-semibold'>Account</h2>
    <UserProfile
      routing='hash'
      appearance={{
        elements: {
          rootBox: 'w-full',
          cardBox:
            'w-full max-w-none rounded-2xl border border-border shadow-none',
        },
      }}
    />
  </section>
);

export const ProfileView = () => (
  <>
    <AppPageHeader
      title='Profile'
      description='Your account, usage and preferences.'
    />
    <div className='flex flex-col gap-6'>
      <Identity />
      <Usage />
      <Appearance />
      <AccountSettings />
    </div>
  </>
);
