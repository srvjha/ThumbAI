import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { SAMPLES, type Sample } from '@/components/landing/samples';
import { FREE_PLAN } from '@/config/plans';
import { cn } from '@/lib/utils';

/**
 * Clerk's form without its own card: no header (the page has one), no box,
 * no shadow, fields and buttons in the studio's style. Works because Clerk's
 * styles sit in the `clerk` layer, beneath Tailwind's utilities.
 */
export const authAppearance = {
  elements: {
    rootBox: 'w-full',
    cardBox:
      'w-full max-w-none rounded-none border-0 bg-transparent shadow-none',
    card: 'gap-6 rounded-none border-0 bg-transparent p-0 shadow-none',
    header: 'hidden',
    socialButtonsBlockButton:
      'h-11 rounded-xl border border-input bg-card text-foreground shadow-none hover:bg-secondary',
    socialButtonsBlockButtonText: 'text-sm font-medium',
    dividerLine: 'bg-border',
    dividerText: 'text-xs text-muted-foreground',
    formFieldLabel: 'text-sm font-medium text-foreground',
    formFieldAction: 'text-sm font-medium text-brand hover:text-brand-strong',
    formFieldInput:
      'h-11 rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground shadow-none focus:border-brand focus:ring-[3px] focus:ring-ring/25',
    formButtonPrimary:
      'btn-brand h-11 rounded-xl text-sm font-medium normal-case shadow-none after:hidden',
    footer: 'mt-2 bg-none bg-transparent p-0 [&>div]:border-0',
    footerAction: 'p-0',
    footerActionText: 'text-sm text-muted-foreground',
    footerActionLink: 'text-sm font-medium text-brand hover:text-brand-strong',
  },
} as const;

// Three columns of real renders, each drifting at its own pace.
const COLUMNS: { items: Sample[]; seconds: number; offset: string }[] = [
  {
    items: [
      SAMPLES.gaming,
      SAMPLES.blogOpenSource,
      SAMPLES.cooking,
      SAMPLES.shortRice,
      SAMPLES.finance,
    ],
    seconds: 70,
    offset: '',
  },
  {
    items: [
      SAMPLES.shortKeyboard,
      SAMPLES.techApi,
      SAMPLES.travel,
      SAMPLES.blogSlowWeb,
    ],
    seconds: 90,
    offset: '-mt-24',
  },
  {
    items: [
      SAMPLES.review,
      SAMPLES.fitness,
      SAMPLES.shortSummit,
      SAMPLES.podcast,
    ],
    seconds: 80,
    offset: '-mt-10',
  },
];

const ratioClass: Record<Sample['kind'], string> = {
  video: 'aspect-video',
  short: 'aspect-[9/16]',
  cover: 'aspect-[1200/630]',
};

/** The right-hand panel: the product's actual output, slowly scrolling. */
const SampleWall = () => (
  <aside className='relative m-3 hidden overflow-hidden rounded-3xl bg-[#0d1020] lg:block'>
    <div
      aria-hidden
      className='absolute inset-0 grid grid-cols-3 gap-3 px-3 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]'
    >
      {COLUMNS.map((col, i) => (
        <div key={i} className={cn('min-w-0', col.offset)}>
          {/* Listed twice so the loop has no seam. */}
          <div
            className='flex animate-[drift-up_80s_linear_infinite] flex-col gap-3 motion-reduce:animate-none'
            style={{ animationDuration: `${col.seconds}s` }}
          >
            {[...col.items, ...col.items].map((sample, j) => (
              <img
                key={`${sample.src}-${j}`}
                src={sample.src}
                alt=''
                loading='lazy'
                className={cn(
                  'w-full rounded-xl object-cover ring-1 ring-white/10',
                  ratioClass[sample.kind],
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0d1020] from-35% to-transparent px-10 pt-40 pb-10 text-white'>
      <p className='max-w-md font-serif text-3xl leading-tight text-balance'>
        Describe the video. Get a thumbnail you would actually upload.
      </p>
      <dl className='mt-6 flex gap-8 text-sm'>
        <div>
          <dd className='font-mono text-xl tabular-nums'>
            {FREE_PLAN.credits}
          </dd>
          <dt className='text-white/60'>free credits</dt>
        </div>
        <div>
          <dd className='font-mono text-xl tabular-nums'>16:9 · 9:16</dd>
          <dt className='text-white/60'>video and Shorts</dt>
        </div>
        <div>
          <dd className='font-mono text-xl tabular-nums'>₹0</dd>
          <dt className='text-white/60'>no card needed</dt>
        </div>
      </dl>
    </div>
  </aside>
);

/**
 * Frame for the sign-in and sign-up pages: the form on the left, centred in
 * its column, and on wide screens a wall of real renders on the right.
 */
export const AuthShell = ({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: ReactNode;
}) => (
  <main className='grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
    <div className='flex min-h-svh flex-col px-5 py-5 sm:px-10 sm:py-6'>
      <div className='flex items-center justify-between'>
        <Logo />
        <div className='flex items-center gap-1'>
          <Link
            href='/'
            className='inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground'
          >
            <ArrowLeft className='size-4' />
            Back to site
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className='mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12'>
        <h1 className='font-serif text-4xl tracking-tight'>{heading}</h1>
        <p className='mt-2 text-[15px] text-muted-foreground text-pretty'>
          {subheading}
        </p>
        <div className='mt-8'>{children}</div>
      </div>

      <p className='text-center text-xs text-muted-foreground'>
        By continuing you agree to our terms and privacy policy.
      </p>
    </div>

    <SampleWall />
  </main>
);
