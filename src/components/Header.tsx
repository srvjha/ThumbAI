'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Logo } from './brand/Logo';
import { useAuth } from '@/hooks/user/auth';
import { cn } from '@/lib/utils';
import { APP_ROUTE_PREFIXES } from './app/AppShell';

const NAV_LINKS = [
  { label: 'Samples', href: '/#samples' },
  { label: 'Pricing', href: '/pricing' },
];

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isSignedIn, isLoaded } = useUser();
  const authEnabled = isLoaded && isSignedIn;
  const { data: authData } = useAuth({ enabled: authEnabled });

  const isAdmin = useMemo(() => authData?.role === 'ADMIN', [authData]);

  const pathname = usePathname();

  // Signed-in screens bring their own navigation in the app shell.
  if (APP_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const closeMenu = () => setIsMenuOpen(false);

  const linkClass =
    'rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground';

  return (
    <header className='fixed inset-x-0 top-0 z-50 bg-background'>
      <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8'>
        <Logo />

        {/* Desktop */}
        <nav aria-label='Main' className='hidden items-center gap-1 md:flex'>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
          {authEnabled && (
            <Link href='/dashboard' className={linkClass}>
              Dashboard
            </Link>
          )}
          {authEnabled && isAdmin && (
            <Link href='/admin' className={linkClass}>
              Admin
            </Link>
          )}

          <div className='ml-3 flex items-center gap-3'>
            {!isLoaded && <Skeleton className='h-9 w-36 rounded-lg' />}
            {isLoaded && !isSignedIn && (
              <>
                <Link href='/sign-in' className={linkClass}>
                  Sign in
                </Link>
                <Button asChild variant='brand'>
                  <Link href='/sign-up'>Start free</Link>
                </Button>
              </>
            )}
            {authEnabled && (
              <>
                <Button asChild variant='brand'>
                  <Link href='/studio/text-to-image'>Open studio</Link>
                </Button>
                <UserButton />
              </>
            )}
          </div>
        </nav>

        {/* Mobile */}
        <div className='flex items-center gap-3 md:hidden'>
          {authEnabled && <UserButton />}
          <button
            type='button'
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls='mobile-menu'
            className='inline-flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-accent'
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className='size-5' /> : <Menu className='size-5' />}
          </button>
        </div>
      </div>

      <nav
        id='mobile-menu'
        aria-label='Mobile'
        className={cn(
          'bg-background px-4 pt-2 pb-5 md:hidden',
          !isMenuOpen && 'hidden',
        )}
      >
        <ul className='space-y-1'>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={closeMenu}
                className={cn(linkClass, 'block text-base')}
              >
                {link.label}
              </Link>
            </li>
          ))}
          {authEnabled && (
            <li>
              <Link
                href='/dashboard'
                onClick={closeMenu}
                className={cn(linkClass, 'block text-base')}
              >
                Dashboard
              </Link>
            </li>
          )}
          {authEnabled && isAdmin && (
            <li>
              <Link
                href='/admin'
                onClick={closeMenu}
                className={cn(linkClass, 'block text-base')}
              >
                Admin
              </Link>
            </li>
          )}
          {isLoaded && !isSignedIn && (
            <li>
              <Link
                href='/sign-in'
                onClick={closeMenu}
                className={cn(linkClass, 'block text-base')}
              >
                Sign in
              </Link>
            </li>
          )}
        </ul>
        {isLoaded && (
          <Button asChild variant='brand' size='lg' className='mt-4 w-full'>
            <Link
              href={isSignedIn ? '/studio/text-to-image' : '/sign-up'}
              onClick={closeMenu}
            >
              {isSignedIn ? 'Open studio' : 'Start free'}
            </Link>
          </Button>
        )}
      </nav>
    </header>
  );
};
