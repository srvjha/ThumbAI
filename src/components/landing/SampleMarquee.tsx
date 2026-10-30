'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  animate,
  m,
  useAnimationFrame,
  useInView,
  useMotionValue,
  type AnimationPlaybackControls,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/motion/tokens';
import {
  usePageVisible,
  usePrefersReducedMotion,
} from '@/components/motion/hooks';
import type { Sample } from './samples';

type Row = {
  items: Sample[];
  /** Pixels per second; rows differ so the wall has depth. */
  speed: number;
  /** 1 drifts left, -1 drifts right. */
  direction: 1 | -1;
};

// One height per row; each item takes its width from its own aspect ratio.
const ROW_H = 'h-36 sm:h-44 lg:h-56';

const ASPECT: Record<Sample['kind'], string> = {
  video: 'aspect-video',
  cover: 'aspect-video',
  short: 'aspect-[9/16]',
};

// Rendered widths at the lg row height (224px): 16:9 ≈ 400px, 9:16 ≈ 126px.
const SIZES: Record<Sample['kind'], string> = {
  video: '(min-width: 1024px) 400px, (min-width: 640px) 314px, 256px',
  cover: '(min-width: 1024px) 400px, (min-width: 640px) 314px, 256px',
  short: '(min-width: 1024px) 126px, (min-width: 640px) 99px, 81px',
};

// Soft edges; a mask, not a visible gradient.
const EDGE_FADE = {
  maskImage:
    'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)', // taste-skill-ignore
  WebkitMaskImage:
    'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)', // taste-skill-ignore
};

const Tile = ({ sample, hidden }: { sample: Sample; hidden?: boolean }) => (
  // Padding, not gap, so both copies of the list are exactly the same width.
  <li aria-hidden={hidden} className={cn('shrink-0 pr-3 sm:pr-4', ROW_H)}>
    <figure
      className={cn(
        'group relative h-full overflow-hidden rounded-lg bg-muted',
        'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-fine:hover:-translate-y-1.5',
        ASPECT[sample.kind],
      )}
    >
      <Image
        src={sample.src}
        alt={hidden ? '' : sample.alt}
        fill
        sizes={SIZES[sample.kind]}
        className='object-cover'
      />
      <figcaption
        className={cn(
          'absolute inset-x-0 bottom-0 bg-foreground/80 px-3 py-2 text-xs leading-snug text-background',
          'translate-y-2 opacity-0 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'group-hover:translate-y-0 group-hover:opacity-100',
          sample.kind === 'short' && 'line-clamp-4 px-2',
        )}
      >
        {sample.prompt}
      </figcaption>
    </figure>
  </li>
);

/** One endless row: the list twice over, moved by exactly one copy and wrapped. */
const MarqueeRow = ({ items, speed, direction }: Row) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const inView = useInView(wrapRef);
  const visible = usePageVisible();
  const x = useMotionValue(0);
  // Multiplies the speed; hover eases it to 0 instead of stopping dead.
  const throttle = useMotionValue(1);
  const throttleAnim = useRef<AnimationPlaybackControls | null>(null);
  const copyWidth = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => {
      copyWidth.current = track.scrollWidth / 2;
    });
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    const w = copyWidth.current;
    if (!inView || !visible || !w) return;
    // Clamp delta so a dropped frame does not jump the row.
    const step = (speed * throttle.get() * Math.min(delta, 50)) / 1000;
    const next = x.get() - direction * step;
    // Keep x in [-w, 0): the second copy then sits where the first began.
    x.set((((next % w) + w) % w) - w);
  });

  const easeTo = (target: number) => {
    throttleAnim.current?.stop();
    throttleAnim.current = animate(throttle, target, {
      duration: target === 0 ? 0.9 : 0.6,
      ease: EASE,
    });
  };

  return (
    <div
      ref={wrapRef}
      className='overflow-hidden py-2'
      style={EDGE_FADE}
      onPointerEnter={(e) => e.pointerType === 'mouse' && easeTo(0)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && easeTo(1)}
    >
      <m.ul ref={trackRef} className='flex w-max' style={{ x }}>
        {[0, 1].map((copy) =>
          items.map((s, i) => (
            <Tile key={`${copy}-${i}`} sample={s} hidden={copy === 1} />
          )),
        )}
      </m.ul>
    </div>
  );
};

/** Reduced motion: the same rows, still, scrolled by hand. */
const StaticRow = ({ items }: { items: Sample[] }) => (
  <ul className='flex snap-x overflow-x-auto px-4 py-2 sm:px-6 lg:px-8'>
    {items.map((s, i) => (
      <Tile key={i} sample={s} />
    ))}
  </ul>
);

export const SampleMarquee = ({ rows }: { rows: Row[] }) => {
  const reduce = usePrefersReducedMotion();
  return (
    <div className='mx-auto max-w-[1600px] space-y-1 sm:space-y-2'>
      {rows.map((row, i) =>
        reduce ? (
          <StaticRow key={i} items={row.items} />
        ) : (
          <MarqueeRow key={i} {...row} />
        ),
      )}
    </div>
  );
};
