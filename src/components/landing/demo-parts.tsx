'use client';

import Image from 'next/image';
import { AnimatePresence, m } from 'framer-motion';
import { EASE } from '@/components/motion/tokens';
import type { Sample } from './samples';

/** A render in progress: a light band sweeping across a muted frame. */
export const RenderSkeleton = ({
  show,
  label = 'Rendering…',
}: {
  show: boolean;
  label?: string;
}) => (
  <AnimatePresence>
    {show && (
      <m.div
        key='skeleton'
        aria-hidden
        className='absolute inset-0 flex items-center justify-center overflow-hidden bg-muted'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <m.div
          className='absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.7),transparent)]' // taste-skill-ignore
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
        />
        <span className='relative text-xs font-medium text-muted-foreground'>
          {label}
        </span>
      </m.div>
    )}
  </AnimatePresence>
);

/**
 * Stacked images; the active one is revealed with a left-to-right clip-path
 * wipe, the rest are clipped away. All of them load up front, so a wipe never
 * reveals a half-loaded file.
 */
export const WipeStack = ({
  samples,
  active,
  show,
  sizes,
  label,
}: {
  samples: readonly Sample[];
  active: number;
  show: boolean;
  sizes: string;
  /** Accessible description of what the frame shows. */
  label: string;
}) => (
  <div
    role='img'
    aria-label={label}
    className='relative aspect-video overflow-hidden rounded-lg bg-muted'
  >
    <RenderSkeleton show={!show} />
    {samples.map((s, i) => {
      const visible = show && i === active;
      return (
        <m.div
          key={s.src}
          className='absolute inset-0'
          initial={false}
          animate={{
            clipPath: visible ? 'inset(0% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)',
          }}
          transition={visible ? { duration: 0.9, ease: EASE } : { duration: 0 }}
        >
          <Image
            src={s.src}
            alt=''
            fill
            sizes={sizes}
            className='object-cover'
          />
        </m.div>
      );
    })}
  </div>
);
