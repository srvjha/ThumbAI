'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Loader } from './ai-elements/loader';
import { Badge } from './ui/badge';
import { useAuth } from '@/hooks/user/auth';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isSignedIn } = useUser();
  const { data: authData, isLoading } = useAuth({ enabled: isSignedIn });
  // if not logged in, then dont fetch the credits simply put 0
  const credits = authData?.credits || 0;

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return authData?.role === 'ADMIN';
  }, [authData]);

  const navLinks = [
    { label: 'Products', href: '/products' },
    { label: 'Playground', href: '/playground' },
    { label: 'Docs', href: '/docs' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Blog', href: '/blog' },
    { label: 'Resources', href: '/resources' },
  ];

  // if(isError){
  //   toast.error('Something went wrong');
  //   return;
  // }

  return (
    <header className='fixed top-0 w-full  bg-transparent backdrop-blur-md border-none border-neutral-800 z-50'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <Link href='/' className='flex items-center space-x-2'>
            <span className='text-xl font-bold text-neutral-50'>ThumbAI</span>
          </Link>

          {/* Desktop Nav */}
          {/* <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-neutral-50 hover:text-neutral-200 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav> */}

          {/* Right Side: Credits + Auth */}
          <div className='hidden md:flex items-center space-x-4'>
            {/* Credits */}
            <div className='flex items-center rounded-lg border border-gray-300 px-3 py-1 text-sm mt-1'>
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

            <SignedIn>
              <UserButton afterSignOutUrl='/' />
            </SignedIn>
            <SignedOut>
              <Link href='/sign-in'>
                <Button variant='outline' className='cursor-pointer'>
                  Sign In
                </Button>
              </Link>
            </SignedOut>
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
          <div className='md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md'>
            <div className='px-4 py-4 space-y-4'>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className='block text-gray-700 hover:text-black transition-colors'
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Credits & Auth */}
              <div className='flex items-center justify-between border rounded px-3 py-2 text-sm'>
                Credits: {isLoading ? <Loader /> : credits}
              </div>

              {isAdmin && (
                <Link href='/admin'>
                  <Badge variant='secondary' className='bg-blue-600 text-white cursor-pointer hover:bg-blue-700 w-full justify-center'>
                    Admin
                  </Badge>
                </Link>
              )}

              <SignedIn>
                <UserButton afterSignOutUrl='/' />
              </SignedIn>
              <SignedOut>
                <Link href='/sign-in'>
                  <Button className='w-full'>Sign In</Button>
                </Link>
              </SignedOut>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
