'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLoop, type LoopStep } from '@/components/motion/useLoop';
import { CSS_ENTER } from '@/components/motion/tokens';
import { SAMPLES } from './samples';

/*
 * Each verb brings a real render and a tint picked from it. 'Earn' comes first
 * because the server, a paused loop and reduced motion all rest on it, and
 * "Thumbnails that earn the click." is the sentence the page has to say.
 */
const VERBS = [
  { word: 'Earn', sample: SAMPLES.techApi },
  { word: 'Win', sample: SAMPLES.gaming },
  { word: 'Grab', sample: SAMPLES.cooking },
  { word: 'Steal', sample: SAMPLES.review },
  { word: 'Get', sample: SAMPLES.travel },
];
const N = VERBS.length;

const STEPS: LoopStep<string>[] = VERBS.map((v) => ({ id: v.word, ms: 2600 }));

const SWAP_IN =
  'animate-in fade-in slide-in-from-bottom-[45%] fill-mode-both duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none';
const SWAP_OUT =
  'absolute inset-0 animate-out fade-out slide-out-to-top-[45%] fill-mode-both duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:hidden';

/** The pill's own measure: the label's width in em, so it survives resizing. */
const useWordWidths = () => {
  const measures = useRef<(HTMLSpanElement | null)[]>([]);
  const [widths, setWidths] = useState<number[] | null>(null);

  useEffect(() => {
    let live = true;
    const measure = () => {
      const fontSize = parseFloat(
        getComputedStyle(measures.current[0]!).fontSize,
      );
      if (live && fontSize) {
        setWidths(
          measures.current.map(
            (el) => el!.getBoundingClientRect().width / fontSize,
          ),
        );
      }
    };
    measure();
    // Inter arrives with font-display: swap; measure again on the real face.
    document.fonts?.ready.then(measure);
    return () => {
      live = false;
    };
  }, []);

  return { measures, widths };
};

/**
 * The hero's headline. The verb sits in a tinted pill with a small real render
 * beside it; on each swap the pill eases to the new word's width, so the words
 * around it make room. Screen readers get the plain sentence, once.
 */
export const HeroHeadline = () => {
  const [hovered, setHovered] = useState(false);
  const { ref, index, cycle } = useLoop<string, HTMLSpanElement>(STEPS, {
    enabled: !hovered,
  });
  const { measures, widths } = useWordWidths();

  const moved = cycle > 0 || index > 0;
  const previous = VERBS[(index - 1 + N) % N];

  return (
    <h1 className='font-serif text-[clamp(2rem,10.2vw,6rem)] leading-[1.04] tracking-[-0.045em]'>
      <span className={cn('block', CSS_ENTER)}>Thumbnails that </span>
      <span className='sr-only'>earn </span>
      <span
        className={cn(
          'mt-[0.04em] flex items-center justify-center gap-[0.22em] whitespace-nowrap [--tw-animation-delay:90ms]',
          CSS_ENTER,
        )}
      >
        <span
          ref={ref}
          aria-hidden
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          className='inline-flex h-[1.14em] items-center gap-[0.17em] rounded-full pr-[0.36em] pl-[0.13em] tracking-[-0.03em] font-medium transition-colors duration-300'
          style={{ backgroundColor: `var(--hero-pill-${index + 1})` }}
        >
          <span className='relative inline-block aspect-video h-[0.82em] shrink-0 overflow-hidden rounded-[0.3em]'>
            {VERBS.map(({ sample }, i) => (
              <Image
                key={sample.src}
                src={sample.src}
                alt=''
                fill
                loading='eager'
                sizes='(min-width: 941px) 140px, 15vw'
                className={cn(
                  'object-cover transition-opacity duration-300',
                  i === index ? 'opacity-100' : 'opacity-0',
                )}
              />
            ))}
          </span>

          <span
            className='relative inline-block overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.86,0,0.07,1)]'
            style={{ width: widths ? `${widths[index]}em` : undefined }}
          >
            {/* Out of the flow: what each word's width comes from. */}
            {VERBS.map(({ word }, i) => (
              <span
                key={word}
                ref={(el) => {
                  measures.current[i] = el;
                }}
                className='invisible absolute top-0 left-0 whitespace-nowrap'
              >
                {word}
              </span>
            ))}
            {moved && (
              <span key={`out-${cycle}-${index}`} className={SWAP_OUT}>
                {previous.word}
              </span>
            )}
            <span
              key={`in-${cycle}-${index}`}
              className={cn('block', moved && SWAP_IN)}
            >
              {VERBS[index].word}
            </span>
          </span>
        </span>
        <span>the click.</span>
      </span>
    </h1>
  );
};
