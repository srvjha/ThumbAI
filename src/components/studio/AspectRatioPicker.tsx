'use client';

import { cn } from '@/lib/utils';

export const RATIO_OPTIONS = [
  { value: '16:9', label: 'YouTube', detail: '16:9 · 1280×720' },
  { value: '9:16', label: 'Shorts', detail: '9:16 · 720×1280' },
] as const;

/** A tiny outlined frame in the given ratio. */
export const RatioGlyph = ({
  ratio,
  active,
  className,
}: {
  ratio: string;
  active?: boolean;
  className?: string;
}) => (
  <span
    aria-hidden
    className={cn(
      'inline-block rounded-[3px] border-[1.5px]',
      ratio === '9:16' ? 'h-5 w-3' : 'h-3 w-5',
      active ? 'border-brand bg-brand-muted' : 'border-muted-foreground/60',
      className,
    )}
  />
);

/**
 * Multi-select: each ratio picked is generated as its own job, so choosing
 * both gives a thumbnail and a Shorts cover from one prompt.
 */
export const AspectRatioPicker = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) => (
  <div className='grid grid-cols-2 gap-2.5'>
    {RATIO_OPTIONS.map((option) => {
      const checked = value?.includes(option.value) || false;
      return (
        <button
          key={option.value}
          type='button'
          role='checkbox'
          aria-checked={checked}
          onClick={() => {
            const current = value || [];
            onChange(
              checked
                ? current.filter((r) => r !== option.value)
                : [...current, option.value],
            );
          }}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
            checked
              ? 'border-brand bg-accent'
              : 'bg-background hover:border-foreground/20',
          )}
        >
          <span className='flex size-6 items-center justify-center'>
            <RatioGlyph ratio={option.value} active={checked} />
          </span>
          <span className='min-w-0'>
            <span className='block text-sm font-medium'>{option.label}</span>
            <span className='block font-mono text-[11px] tabular-nums text-muted-foreground'>
              {option.detail}
            </span>
          </span>
        </button>
      );
    })}
  </div>
);
