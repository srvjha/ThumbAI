'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import {
  BarChart3,
  CreditCard,
  FileText,
  ImagePlus,
  LayoutGrid,
  Menu,
  Shield,
  Type,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/user/auth';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';

type NavItem = { label: string; href: string; icon: ReactNode };

const STUDIO_NAV: NavItem[] = [
  {
    label: 'Text to Image',
    href: '/studio/text-to-image',
    icon: <Type className='size-4' />,
  },
  {
    label: 'Image to Image',
    href: '/studio/image-to-image',
    icon: <ImagePlus className='size-4' />,
  },
  {
    label: 'Blog Cover',
    href: '/studio/blog-cover',
    icon: <FileText className='size-4' />,
  },
];

const ACCOUNT_NAV: NavItem[] = [
  {
    label: 'Library',
    href: '/dashboard',
    icon: <LayoutGrid className='size-4' />,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: <BarChart3 className='size-4' />,
  },
  {
    label: 'Credits & billing',
    href: '/billing',
    icon: <CreditCard className='size-4' />,
  },
];

/** Routes that render inside the app shell instead of the marketing header. */
export const APP_ROUTE_PREFIXES = ['/studio', '/dashboard', '/billing'];

const NavGroup = ({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) => (
  <div>
    <p className='px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground'>
      {title}
    </p>
    <ul className='space-y-0.5'>
      {items.map((item) => {
        // /dashboard must not light up while on /dashboard/analytics.
        const active =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-foreground/75 hover:bg-secondary hover:text-foreground',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  </div>
);

/** Credit balance with a link to top up; lives at the foot of the sidebar. */
const CreditsCard = () => {
  const { isSignedIn, isLoaded } = useUser();
  const { data, isLoading } = useAuth({ enabled: isLoaded && !!isSignedIn });
  return (
    <div className='rounded-xl border bg-card p-3'>
      <div className='flex items-baseline justify-between'>
        <span className='text-xs text-muted-foreground'>Credits</span>
        <span className='font-mono text-lg tabular-nums'>
          {isLoading ? '—' : (data?.credits ?? 0)}
        </span>
      </div>
      <Link
        href='/billing'
        className='btn-brand mt-3 flex h-8 items-center justify-center rounded-lg text-xs font-medium'
      >
        Top up credits
      </Link>
    </div>
  );
};

const SidebarBody = ({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) => {
  const { isSignedIn, isLoaded } = useUser();
  const { data } = useAuth({ enabled: isLoaded && !!isSignedIn });
  return (
    <div className='flex h-full flex-col gap-6 p-3'>
      <div className='px-2 pt-2'>
        <Logo />
      </div>
      <NavGroup
        title='Studio'
        items={STUDIO_NAV}
        pathname={pathname}
        onNavigate={onNavigate}
      />
      <NavGroup
        title='Account'
        items={ACCOUNT_NAV}
        pathname={pathname}
        onNavigate={onNavigate}
      />
      {data?.role === 'ADMIN' && (
        <NavGroup
          title='Internal'
          items={[
            {
              label: 'Admin',
              href: '/admin',
              icon: <Shield className='size-4' />,
            },
          ]}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      )}
      <div className='mt-auto space-y-3'>
        <CreditsCard />
        <div className='flex items-center gap-2 px-2 pb-1'>
          <UserButton />
          <span className='truncate text-sm text-muted-foreground'>
            {data?.email}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Frame for every signed-in screen: a fixed sidebar on desktop, a slide-over
 * on mobile. Pages supply their own heading via <AppPageHeader>.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className='min-h-svh bg-background'>
      <aside className='fixed inset-y-0 left-0 z-40 hidden w-60 border-r bg-sidebar lg:block'>
        <SidebarBody pathname={pathname} />
      </aside>

      <div className='sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:hidden'>
        <Logo />
        <button
          aria-label='Open navigation'
          onClick={() => setOpen(true)}
          className='rounded-lg p-2 hover:bg-secondary'
        >
          <Menu className='size-5' />
        </button>
      </div>

      {open && (
        <div className='fixed inset-0 z-50 lg:hidden'>
          <div
            className='absolute inset-0 bg-foreground/30'
            onClick={() => setOpen(false)}
          />
          <aside className='absolute inset-y-0 left-0 w-72 border-r bg-sidebar'>
            <button
              aria-label='Close navigation'
              onClick={() => setOpen(false)}
              className='absolute right-3 top-4 rounded-lg p-1.5 hover:bg-secondary'
            >
              <X className='size-4' />
            </button>
            <SidebarBody pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className='lg:pl-60'>
        <div className='mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8'>
          {children}
        </div>
      </main>
    </div>
  );
};

export const AppPageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:mb-8'>
    <div>
      <h1 className='font-serif text-3xl tracking-tight sm:text-4xl'>
        {title}
      </h1>
      {description && (
        <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
      )}
    </div>
    {actions && <div className='flex items-center gap-2'>{actions}</div>}
  </div>
);
