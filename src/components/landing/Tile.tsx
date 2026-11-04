import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RevealItem } from '@/components/motion/Reveal';

/** The round arrow in a tile's corner; it nudges when the tile is hovered. */
export const TileArrow = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    aria-label={label}
    className='grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-200 group-hover:translate-x-0.5 active:scale-95'
  >
    <ArrowRight className='size-4' />
  </Link>
);

export const TileTitle = ({
  label,
  title,
}: {
  label: string;
  title: string;
}) => (
  <div>
    <p className='text-sm'>{label}</p>
    <h3 className='mt-1 text-xl leading-tight font-bold tracking-[-0.02em] text-balance sm:text-[22px]'>
      {title}
    </h3>
  </div>
);

/** A bento tile: small label, bold line and arrow on top, the working demo below. */
export const Tile = ({
  label,
  title,
  href,
  linkLabel,
  className,
  children,
}: {
  label: string;
  title: string;
  href: string;
  linkLabel: string;
  className?: string;
  children: ReactNode;
}) => (
  <RevealItem
    as='article'
    className={cn(
      'group flex min-w-0 flex-col rounded-2xl bg-secondary p-5 sm:p-6',
      className,
    )}
  >
    <div className='flex items-start justify-between gap-4'>
      <TileTitle label={label} title={title} />
      <TileArrow href={href} label={linkLabel} />
    </div>
    {children}
  </RevealItem>
);
