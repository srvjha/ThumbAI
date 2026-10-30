import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Wordmark: a small blue frame (a thumbnail) beside the name in the serif. */
export const Logo = ({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) => (
  <Link
    href='/'
    className={cn('inline-flex items-center gap-2', className)}
    aria-label='ThumbAI home'
  >
    <span
      aria-hidden
      className='relative inline-block h-[18px] w-[26px] rounded-[5px] border-[1.5px] border-brand bg-brand-muted'
    >
      <span className='absolute bottom-[3px] left-[3px] h-[5px] w-[9px] rounded-[1.5px] bg-brand' />
    </span>
    <span
      className={cn(
        'font-serif text-[22px] leading-none tracking-tight',
        inverted ? 'text-white' : 'text-foreground',
      )}
    >
      ThumbAI
    </span>
  </Link>
);
