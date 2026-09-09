import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthShellProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

/**
 * Frame for the sign-in and sign-up pages.
 *
 * The pages previously centred a bare Clerk widget inside `h-screen`, which
 * collided with the fixed header and gave no indication of what you were
 * signing into. This adds the product identity and a line of context, and
 * sizes off `min-h-svh` with padding that clears the header rather than
 * assuming the full viewport is free.
 */
export const AuthShell = ({
  heading,
  subheading,
  children,
}: AuthShellProps) => (
  <main className='relative min-h-svh px-4 pt-28 pb-16 flex flex-col items-center'>
    {/* A single soft wash behind the card, so the page is not a flat void.
        Deliberately one effect and not a set of animated blobs. */}
    <div
      aria-hidden
      className='pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(37,99,235,0.16),transparent)]'
    />

    <div className='relative w-full max-w-[26rem] flex flex-col items-center'>
      <Link
        href='/'
        className='group flex items-center gap-2.5 mb-8 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'
      >
        {/* The app icon, so the tab and this page show the same mark. */}
        <img src='/icon.svg' alt='' className='h-8 w-8 rounded-lg' />
        <span className='text-lg font-semibold tracking-tight text-neutral-50'>
          ThumbAI
        </span>
      </Link>

      <h1 className='text-2xl font-semibold tracking-tight text-neutral-50 text-center'>
        {heading}
      </h1>
      <p className='mt-2 mb-8 text-sm text-neutral-400 text-center'>
        {subheading}
      </p>

      {children}

      <p className='mt-8 text-xs text-neutral-500 text-center'>
        By continuing you agree to our terms and privacy policy.
      </p>
    </div>
  </main>
);
