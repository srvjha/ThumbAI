import Link from 'next/link';
import type { ReactNode } from 'react';

export const CONTACT_EMAIL = 'jhasaurav0209001@gmail.com';
export const LEGAL_UPDATED = 'November 9, 2026';

export const LEGAL_PAGES = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/privacy', label: 'Privacy Policy' },
] as const;

/** Shared shell for the terms, refund and privacy pages. */
export const LegalPage = ({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) => (
  <main className='min-h-screen bg-background'>
    <article className='mx-auto max-w-3xl px-4 pt-28 pb-24 sm:px-6 sm:pt-32'>
      <header className='border-b pb-8'>
        <p className='text-sm text-muted-foreground'>
          Last updated {LEGAL_UPDATED}
        </p>
        <h1 className='mt-3 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl'>
          {title}
        </h1>
        <div className='mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg'>
          {intro}
        </div>
      </header>

      <div className='mt-10 space-y-10 text-[15px] leading-relaxed text-foreground/85 [&_a]:text-brand [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:mt-2 [&_p+p]:mt-3 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5'>
        {children}
      </div>

      <footer className='mt-16 border-t pt-8 text-sm text-muted-foreground'>
        <p>
          Questions about this page? Email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className='text-brand underline-offset-2 hover:underline'
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <nav aria-label='Legal' className='mt-4 flex flex-wrap gap-x-5 gap-y-2'>
          {LEGAL_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className='text-foreground transition-colors hover:text-brand'
            >
              {page.label}
            </Link>
          ))}
        </nav>
      </footer>
    </article>
  </main>
);

export const Section = ({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) => (
  <section id={id} className='scroll-mt-28'>
    <h2 className='mb-3 font-serif text-2xl tracking-tight text-foreground sm:text-3xl'>
      {title}
    </h2>
    {children}
  </section>
);
