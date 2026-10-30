'use client';

import { useState, useMemo, useEffect } from 'react';
import { m, useMotionValueEvent, useScroll } from 'framer-motion';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { ThemeToggle } from './theme/ThemeToggle';
import { Skeleton } from './ui/skeleton';
import { Logo } from './brand/Logo';
import { useAuth } from '@/hooks/user/auth';
import { cn } from '@/lib/utils';
import { APP_ROUTE_PREFIXES } from './app/AppShell';
import { LayoutMotion } from './motion/MotionRoot';
import { SPRING } from './motion/tokens';

// Scroll distance after which the bar condenses into a floating pill.
const CONDENSE_AT = 40;

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

  const { scrollY } = useScroll();
  const [condensed, setCondensed] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setCondensed(y > CONDENSE_AT));
  // A reload partway down the page starts condensed.
  useEffect(() => setCondensed(scrollY.get() > CONDENSE_AT), [scrollY]);

  // Signed-in screens bring their own navigation in the app shell, and the
  // auth pages have their own slim top row.
  if (
    [...APP_ROUTE_PREFIXES, '/sign-in', '/sign-up'].some((prefix) =>
      pathname.startsWith(prefix),
    )
  ) {
    return null;
  }

  const closeMenu = () => setIsMenuOpen(false);

  const linkClass =
    'rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground';

  const radius = condensed ? (isMenuOpen ? 20 : 999) : 0;

  return (
    <LayoutMotion>
      <header
        className={cn('fixed inset-x-0 top-0 z-50', condensed && 'px-3 pt-3')}
      >
        {/* One box that springs between a full-width bar and a centred pill. */}
        <m.div
          layout
          transition={SPRING}
          style={{ borderRadius: radius }}
          className={cn(
            'relative mx-auto',
            condensed ? 'max-w-[880px]' : 'max-w-6xl',
          )}
        >
          <m.div
            aria-hidden
            layout
            transition={SPRING}
            style={{ borderRadius: radius }}
            className='absolute inset-0 -z-10 border bg-card/80 shadow-[0_10px_30px_-14px_rgb(18_23_43/0.3)] backdrop-blur-md'
            initial={false}
            animate={{ opacity: condensed || isMenuOpen ? 1 : 0 }}
          />
          <div
            className={cn(
              'flex items-center justify-between',
              condensed
                ? 'h-14 pr-2 pl-4 sm:pl-5'
                : 'h-16 px-4 sm:px-6 lg:px-8',
            )}
          >
            <m.div layout='position' transition={SPRING}>
              <Logo />
            </m.div>

            {/* Desktop */}
            <m.nav
              layout='position'
              transition={SPRING}
              aria-label='Main'
              className='hidden items-center gap-1 md:flex'
            >
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

              <ThemeToggle className='ml-1' />
              <div className='ml-2 flex items-center gap-3'>
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
            </m.nav>

            {/* Mobile */}
            <m.div
              layout='position'
              transition={SPRING}
              className='flex items-center gap-2 md:hidden'
            >
              <ThemeToggle />
              {authEnabled && <UserButton />}
              <button
                type='button'
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
                aria-controls='mobile-menu'
                className='inline-flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-accent'
                onClick={() => setIsMenuOpen((open) => !open)}
              >
                {isMenuOpen ? (
                  <X className='size-5' />
                ) : (
                  <Menu className='size-5' />
                )}
              </button>
            </m.div>
          </div>

          <m.nav
            layout='position'
            transition={SPRING}
            id='mobile-menu'
            aria-label='Mobile'
            className={cn('px-4 pt-2 pb-5 md:hidden', !isMenuOpen && 'hidden')}
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
          </m.nav>
        </m.div>
      </header>
    </LayoutMotion>
  );
};
