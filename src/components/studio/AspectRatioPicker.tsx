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
