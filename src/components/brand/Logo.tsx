import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Wordmark: the app icon beside the name in the serif. */
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
    <Image
      src='/logo-mark.png'
      alt=''
      aria-hidden
      width={28}
      height={28}
      className='size-7'
    />
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
