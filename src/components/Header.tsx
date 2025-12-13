'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Loader } from './ai-elements/loader';
import { Badge } from './ui/badge';
import { useAuth } from '@/hooks/user/auth';
import { Skeleton } from './ui/skeleton';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isSignedIn, isLoaded } = useUser();
  const authEnabled = isLoaded && isSignedIn;
  const { data: authData, isLoading } = useAuth({ enabled: authEnabled });
  const credits = authData?.credits || 0;

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return authData?.role === 'ADMIN';
  }, [authData]);

  const navLinks = [
    { label: 'Pricing', href: '/pricing' },
  ];


  return (
    <header className='fixed top-0 w-full  bg-transparent backdrop-blur-md border-none border-neutral-800 z-50'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <Link href='/' className='flex items-center space-x-2'>
            <span className='text-xl font-bold text-neutral-50'>ThumbAI</span>
          </Link>

          {/* Right Side: Credits + Auth */}
          <div className='hidden md:flex items-center space-x-4'>
            {/* Credits */}
            <div className='flex items-center rounded-lg border border-dotted border-gray-500 px-3 py-1 text-sm mt-1'>
              Credits:{' '}
              {isLoading ? (
                <div className='ml-1'>
                  <Loader />
                </div>
              ) : (
                <span className='ml-1'>{credits}</span>
              )}
            </div>

            <Link
              href='/pricing'
              className='text-neutral-50 hover:text-neutral-200 transition-colors'
            >
              Pricing
            </Link>

            {isAdmin && (
              <Link href='/admin'>
                <Badge variant='secondary' className='bg-blue-600 text-white cursor-pointer hover:bg-blue-700'>
                  Admin
                </Badge>
              </Link>
            )}

            <div className='px-4 py-4 space-y-4'>
              {!isLoaded && (
                <div className="flex justify-center">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              )}

              {isLoaded && isSignedIn && (
                <UserButton afterSignOutUrl='/' />
              )}

              {isLoaded && !isSignedIn && (
                <Link href='/sign-in'>
                  <Button className='w-full cursor-pointer'>Sign In</Button>
                </Link>
              )}
            </div>

          </div>

          {/* Mobile Menu Button */}
          <button
            className='md:hidden text-gray-700'
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className='w-6 h-6' />
            ) : (
              <Menu className='w-6 h-6' />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className='md:hidden border-t border-neutral-900 bg-transparent max-w-md mx-auto backdrop-blur-md'>
            <div className='px-4 py-4 space-y-4'>
              <div className='px-4 py-4 space-y-4'>
                {!isLoaded && (
                  <div className="flex justify-center">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                )}

                {isLoaded && isSignedIn && (
                  <UserButton afterSignOutUrl='/' />
                )}

                {isLoaded && !isSignedIn && (
                  <Link href='/sign-in'>
                    <Button className='w-full cursor-pointer'>Sign In</Button>
                  </Link>
                )}
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className='block text-neutral-200 hover:text-black transition-colors'
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Credits & Auth */}
              <div className='flex items-center justify-between '>
                Credits: {isLoading ? <Loader /> : credits}
              </div>

              {isAdmin && (
                <Link href='/admin'>
                  <Badge variant='secondary' className='bg-blue-600 text-white cursor-pointer hover:bg-blue-700 w-full justify-center px-2 py-1 text-base'>
                    Admin
                  </Badge>
                </Link>
              )}

            </div>
          </div>
        )}
      </div>
    </header>
  );
};
