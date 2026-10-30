'use client';

import type { FormEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Two-pane studio: a controls column on the left that scrolls on its own and
 * a canvas on the right. Stacks (controls, then canvas) below lg.
 */
export const StudioLayout = ({
  controls,
  canvas,
}: {
  controls: ReactNode;
  canvas: ReactNode;
}) => (
  <div className='grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start xl:gap-8'>
    {controls}
    <section aria-label='Canvas' className='min-w-0'>
      {canvas}
    </section>
  </div>
);

/**
 * The controls column. It is the <form>, so the generate bar in `footer` can
 * submit it; on desktop the body scrolls while the footer stays put.
 */
export const ControlsPanel = ({
  onSubmit,
  children,
  footer,
}: {
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  footer: ReactNode;
}) => (
  <form
    onSubmit={onSubmit}
    className='flex flex-col rounded-2xl border bg-card shadow-xs lg:sticky lg:top-8 lg:max-h-[calc(100svh-4rem)]'
  >
    <div className='flex-1 space-y-6 p-5 lg:min-h-0 lg:overflow-y-auto'>
      {children}
    </div>
    {footer}
  </form>
);

/** A labelled group inside the controls panel. */
export const ControlSection = ({
  label,
  hint,
  htmlFor,
  aside,
  error,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  aside?: ReactNode;
  error?: string;
  children: ReactNode;
}) => (
  <div>
    <div className='mb-2 flex items-baseline justify-between gap-3'>
      <label htmlFor={htmlFor} className='text-sm font-medium text-foreground'>
        {label}
      </label>
      {aside && <span className='text-xs text-muted-foreground'>{aside}</span>}
    </div>
    {children}
    {hint && !error && (
      <p className='mt-1.5 text-xs text-muted-foreground'>{hint}</p>
    )}
    {error && <p className='mt-1.5 text-xs text-destructive'>{error}</p>}
  </div>
);

/** Shared look for text inputs and textareas in the panel. */
export const fieldClass = (invalid?: boolean) =>
  cn(
    'w-full rounded-xl border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
    invalid
      ? 'border-destructive focus:border-destructive'
      : 'border-input focus:border-brand',
  );

/** Segmented control used for small enumerations (count, format). */
export const SegmentedControl = <T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) => (
  <div
    role='radiogroup'
    aria-label={ariaLabel}
    className='grid auto-cols-fr grid-flow-col gap-1 rounded-xl border bg-secondary p-1'
  >
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={String(option.value)}
          type='button'
          role='radio'
          aria-checked={selected}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            selected
              ? 'bg-card text-foreground shadow-xs ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
