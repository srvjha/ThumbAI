'use client';

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { ModelDefinition, ModelTier } from '@/config/models';
import { RATIO_OPTIONS, RatioGlyph } from './AspectRatioPicker';
import { IMAGE_COUNT_OPTIONS } from './options';
import { cn } from '@/lib/utils';

/** Shared look for the compact buttons in the controls row. */
export const chipClass = (active?: boolean, invalid?: boolean) =>
  cn(
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
    invalid
      ? 'border-destructive text-destructive'
      : active
        ? 'border-transparent bg-accent text-accent-foreground'
        : 'bg-card text-foreground hover:bg-secondary',
  );

/**
 * A textarea that is one line when empty and grows with its content up to
 * about six lines, then scrolls.
 */
export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, value, ...props }, ref) => {
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [value]);

  return (
    <textarea
      ref={inner}
      rows={1}
      value={value}
      className={cn(
        'block max-h-44 w-full resize-none overflow-y-auto bg-transparent text-base leading-6 text-foreground placeholder:text-muted-foreground/70 focus:outline-none',
        className,
      )}
      {...props}
    />
  );
});
AutoTextarea.displayName = 'AutoTextarea';

/** Multi-select ratio toggle: each ratio picked is its own job. */
export const AspectToggle = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) => (
  <ToggleGroup
    type='multiple'
    value={value ?? []}
    onValueChange={onChange}
    aria-label='Format'
    className='h-9 shrink-0 gap-0.5 rounded-lg border bg-card p-0.5'
  >
    {RATIO_OPTIONS.map((option) => {
      const on = value?.includes(option.value);
      return (
        <Tooltip key={option.value}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={option.value}
              aria-label={`${option.label} ${option.value}`}
              className='h-7 gap-1.5 rounded-md px-2 text-[13px] font-medium data-[state=on]:bg-accent data-[state=on]:text-accent-foreground'
            >
              <RatioGlyph ratio={option.value} active={on} />
              <span className='tabular-nums'>{option.value}</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            {option.label} · {option.detail.split(' · ')[1]}
          </TooltipContent>
        </Tooltip>
      );
    })}
  </ToggleGroup>
);

/** Draft or Quality, with its price per image. */
export const ModelSelect = ({
  models,
  value,
  onChange,
}: {
  models: Record<ModelTier, ModelDefinition>;
  value: ModelTier;
  onChange: (tier: ModelTier) => void;
}) => (
  <Select value={value} onValueChange={(v) => onChange(v as ModelTier)}>
    <SelectTrigger
      aria-label='Model'
      className='h-9 shrink-0 gap-1.5 rounded-lg bg-card px-2.5 text-[13px] font-medium shadow-none'
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent className='w-72'>
      {(Object.keys(models) as ModelTier[]).map((key) => (
        <SelectItem key={key} value={key} className='items-start py-2'>
          <span className='flex flex-col'>
            <span className='font-medium'>
              {models[key].label}{' '}
              <span className='font-normal tabular-nums text-muted-foreground'>
                · {models[key].creditsPerImage} cr
              </span>
            </span>
            <span className='text-xs text-muted-foreground in-data-[slot=select-value]:hidden'>
              {models[key].description}
            </span>
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/** How many images per format. */
export const CountSelect = ({
  value,
  onChange,
  noun = 'image',
}: {
  value: number;
  onChange: (n: number) => void;
  noun?: string;
}) => (
  <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
    <SelectTrigger
      aria-label={`Number of ${noun}s`}
      className='h-9 shrink-0 gap-1.5 rounded-lg bg-card px-2.5 text-[13px] font-medium tabular-nums shadow-none'
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {IMAGE_COUNT_OPTIONS.map((option) => (
        <SelectItem
          key={option.value}
          value={String(option.value)}
          className='tabular-nums'
        >
          {option.value} {option.value === 1 ? noun : `${noun}s`}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
