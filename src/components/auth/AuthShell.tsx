import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { FREE_PLAN } from '@/config/plans';

interface AuthShellProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

/** Sketch of a 16:9 thumbnail in brand ink, so the panel shows the product. */
const ThumbnailSketch = () => (
  <div
    aria-hidden
    className='relative aspect-video w-full overflow-hidden rounded-xl border-[1.5px] border-brand/70 bg-card'
  >
    <div className='absolute inset-y-0 right-0 w-[42%] border-l border-brand/20 bg-brand-muted'>
      <div className='absolute bottom-0 left-1/2 h-[70%] w-[62%] -translate-x-1/2 rounded-t-full border-[1.5px] border-b-0 border-brand/60' />
      <div className='absolute top-[18%] left-1/2 size-[30%] -translate-x-1/2 rounded-full border-[1.5px] border-brand/60 bg-card' />
    </div>
    <div className='absolute top-[16%] left-[7%] w-[46%] space-y-2'>
      <div className='h-3 w-full rounded-sm bg-foreground' />
      <div className='h-3 w-4/5 rounded-sm bg-foreground' />
      <div className='mt-3 h-3 w-2/5 rounded-sm bg-brand' />
    </div>
    <div className='absolute bottom-[10%] right-[4%] rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background'>
      12:48
    </div>
  </div>
);

/**
 * Frame for the sign-in and sign-up pages: the form on paper, and on wide
 * screens a quiet blue-ink panel saying what the account is for.
 */
export const AuthShell = ({
  heading,
  subheading,
  children,
}: AuthShellProps) => (
  <main className='min-h-svh bg-background px-4 pt-24 pb-12 sm:px-6 lg:pt-28'>
    <div className='mx-auto grid w-full max-w-5xl items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14'>
      <div className='mx-auto flex w-full max-w-[26rem] flex-col items-center lg:items-start'>
        <Logo className='mb-8' />
        <h1 className='text-center font-serif text-4xl tracking-tight sm:text-5xl lg:text-left'>
          {heading}
        </h1>
        <p className='mt-2 mb-8 text-center text-sm text-muted-foreground lg:text-left'>
          {subheading}
        </p>

        {children}

        <p className='mt-8 text-center text-xs text-muted-foreground lg:text-left'>
          By continuing you agree to our terms and privacy policy.
        </p>
      </div>

      <aside className='hidden rounded-2xl border bg-accent p-8 text-accent-foreground lg:block'>
        <ThumbnailSketch />
        <p className='mt-8 font-serif text-3xl leading-tight tracking-tight'>
          Describe the video. Get a thumbnail you would actually upload.
        </p>
        <dl className='mt-8 grid grid-cols-3 gap-4 border-t border-brand/20 pt-6'>
          <div>
            <dd className='font-mono text-2xl tabular-nums'>
              {FREE_PLAN.credits}
            </dd>
            <dt className='mt-0.5 text-xs opacity-75'>free credits</dt>
          </div>
          <div>
            <dd className='font-mono text-2xl tabular-nums'>16:9</dd>
            <dt className='mt-0.5 text-xs opacity-75'>and 9:16 sizes</dt>
          </div>
          <div>
            <dd className='font-mono text-2xl tabular-nums'>₹0</dd>
            <dt className='mt-0.5 text-xs opacity-75'>no card needed</dt>
          </div>
        </dl>
      </aside>
    </div>
  </main>
);
