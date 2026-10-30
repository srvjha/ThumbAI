'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLoop, type LoopStep } from './useLoop';

export type TypeMode = 'full' | 'empty' | 'typing' | 'erasing';

/** Ms per character; loops use it to size their typing steps. */
export const TYPE_SPEED = 32;
export const ERASE_SPEED = 14;

/** Time a TypedText needs to finish typing `text`, plus a short settle. */
export const typingMs = (text: string, speed = TYPE_SPEED) =>
  text.length * speed + 250;

const Caret = () => (
  <m.span
    aria-hidden
    className='ml-px inline-block h-[1.1em] w-[1.5px] translate-y-[0.15em] bg-brand'
    animate={{ opacity: [1, 1, 0, 0] }}
    transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.55, 1] }}
  />
);

type TypedTextProps = {
  text: string;
  mode: TypeMode;
  speed?: number;
  /** Other strings this slot may hold; the slot is sized to the longest so nothing shifts. */
  reserve?: readonly string[];
  caret?: boolean;
  className?: string;
};

/**
 * Text that types or erases itself on cue. The parent decides when, through
 * `mode`; all candidate strings sit invisibly underneath to hold the height.
 */
export const TypedText = ({
  text,
  mode,
  speed = TYPE_SPEED,
  reserve = [],
  caret = false,
  className,
}: TypedTextProps) => {
  const [count, setCount] = useState(mode === 'empty' ? 0 : text.length);

  useEffect(() => {
    if (mode === 'full') return setCount(text.length);
    if (mode === 'empty') return setCount(0);
    const typing = mode === 'typing';
    setCount(typing ? 0 : text.length);
    const id = setInterval(
      () => {
        setCount((n) => {
          const next = typing ? n + 1 : n - 1;
          if (next <= 0 || next >= text.length) clearInterval(id);
          return Math.max(0, Math.min(text.length, next));
        });
      },
      typing ? speed : ERASE_SPEED,
    );
    return () => clearInterval(id);
  }, [mode, text, speed]);

  const active = mode === 'typing' || mode === 'erasing';

  return (
    <span className={cn('grid', className)}>
      {[text, ...reserve].map((s, i) => (
        <span key={i} aria-hidden className='invisible col-start-1 row-start-1'>
          {s}
        </span>
      ))}
      <span className='col-start-1 row-start-1'>
        {text.slice(0, count)}
        {caret && active && <Caret />}
      </span>
    </span>
  );
};

type TypewriterProps = {
  strings: readonly string[];
  speed?: number;
  /** How long a finished string stays before it is erased, in ms. */
  holdMs?: number;
  className?: string;
};

/**
 * Types each string, holds it, erases it, moves on. Starts holding the first
 * string, which is also what renders on the server and with reduced motion.
 */
export const Typewriter = ({
  strings,
  speed = TYPE_SPEED,
  holdMs = 2200,
  className,
}: TypewriterProps) => {
  const n = strings.length;
  const steps: LoopStep<'type' | 'hold' | 'erase'>[] = [
    { id: 'type', ms: (c) => typingMs(strings[c % n], speed) },
    { id: 'hold', ms: holdMs },
    { id: 'erase', ms: (c) => strings[c % n].length * ERASE_SPEED + 200 },
  ];
  const { ref, step, cycle } = useLoop<
    'type' | 'hold' | 'erase',
    HTMLSpanElement
  >(steps, { initial: 1 });
  const text = strings[cycle % n];

  return (
    <span ref={ref} className={className}>
      <span className='sr-only'>{strings[0]}</span>
      <span aria-hidden>
        <TypedText
          text={text}
          mode={
            step === 'type' ? 'typing' : step === 'erase' ? 'erasing' : 'full'
          }
          speed={speed}
          reserve={strings}
          caret
        />
      </span>
    </span>
  );
};
