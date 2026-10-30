'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEventHandler,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import Link from 'next/link';
import {
  Loader2,
  Settings2,
  SlidersHorizontal,
  Type,
  Wand2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Kbd } from '../ui/kbd';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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
import { IMAGE_COUNT_OPTIONS, OUTPUT_FORMAT_OPTIONS } from './options';
import { useModKey } from './useModKey';
import { useQuestionnaireStore } from '@/store/questionnaireStore';
import { cn } from '@/lib/utils';

/** The form the Generate button and ⌘↵ submit; also used by the palette. */
export const STUDIO_FORM_ID = 'studio-form';

export const submitStudioForm = () =>
  (
    document.getElementById(STUDIO_FORM_ID) as HTMLFormElement | null
  )?.requestSubmit();

export const focusComposer = () =>
  document.getElementById('composer-input')?.focus();

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

const credits = (n: number) => `${n} ${n === 1 ? 'credit' : 'credits'}`;

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

/** Credit cost for this run, with the maths and the balance on hover. */
const CostLabel = ({
  cost,
  costNote,
  balance,
}: {
  cost: number;
  costNote?: string;
  balance?: number;
}) => {
  const short = balance !== undefined && balance < cost;
  return (
    <span className='flex items-center gap-2 text-[13px]'>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              'rounded tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              short ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {credits(cost)}
          </span>
        </TooltipTrigger>
        <TooltipContent className='tabular-nums'>
          {costNote && <span className='block'>{costNote}</span>}
          <span className='block'>
            Balance: {balance ?? '—'} {balance === 1 ? 'credit' : 'credits'}
          </span>
        </TooltipContent>
      </Tooltip>
      {short && (
        <Link
          href='/billing'
          className='font-medium text-brand underline-offset-2 hover:underline'
        >
          Top up
        </Link>
      )}
    </span>
  );
};

/**
 * The studio's one prompt bar. It is the <form>: the input (and, in Image
 * mode, the attachments) on top, one row of compact controls under it, and
 * the cost and Generate on the right. ⌘/Ctrl+Enter submits from any field.
 */
export const Composer = ({
  onSubmit,
  children,
  controls,
  error,
  cost,
  costNote,
  balance,
  isGenerating,
  disabled,
  label = 'Generate',
  busyLabel = 'Generating…',
  onDropFiles,
}: {
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  controls: ReactNode;
  error?: string;
  cost: number;
  costNote?: string;
  balance?: number;
  isGenerating: boolean;
  disabled: boolean;
  label?: string;
  busyLabel?: string;
  /** Enables dropping image files anywhere on the composer. */
  onDropFiles?: (event: DragEvent<HTMLElement>) => void;
}) => {
  const mod = useModKey();
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const dropHandlers = onDropFiles
    ? {
        onDragEnter: (e: DragEvent<HTMLElement>) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        },
        onDragOver: (e: DragEvent<HTMLElement>) => e.preventDefault(),
        onDragLeave: () => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        },
        onDrop: (e: DragEvent<HTMLElement>) => {
          dragDepth.current = 0;
          setDragging(false);
          onDropFiles(e);
        },
      }
    : {};

  return (
    <form
      id={STUDIO_FORM_ID}
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
      aria-label='Generate'
      className={cn(
        'relative rounded-2xl border bg-card shadow-[0_1px_2px_rgb(18_23_43/0.04),0_8px_24px_-12px_rgb(18_23_43/0.12)] transition-colors focus-within:border-foreground/20',
        dragging && 'border-brand bg-accent/40',
      )}
      {...dropHandlers}
    >
      <div className='px-4 pb-2 pt-4 sm:px-5'>
        {children}
        {error && (
          <p role='alert' className='mt-1.5 text-[13px] text-destructive'>
            {error}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-3 px-3 pb-3 sm:px-4 md:flex-row md:items-center'>
        <div className='-mx-3 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] md:mx-0 md:px-0 md:pb-0'>
          {controls}
        </div>
        {/* Below md this docks to the bottom of the screen. */}
        <div className='flex items-center gap-3 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:border-t max-md:bg-card max-md:px-4 max-md:py-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]'>
          <CostLabel cost={cost} costNote={costNote} balance={balance} />
          <Button
            type='submit'
            variant='brand'
            disabled={disabled}
            className='h-10 rounded-xl px-4 max-md:flex-1'
          >
            {isGenerating ? (
              <>
                <Loader2 className='size-4 animate-spin' />
                {busyLabel}
              </>
            ) : (
              <>
                <Wand2 className='size-4' />
                {label}
                <Kbd className='ml-0.5 hidden bg-white/20 text-white md:inline-flex'>
                  {mod}↵
                </Kbd>
              </>
            )}
          </Button>
        </div>
      </div>

      {dragging && (
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl text-sm font-medium text-brand'>
          Drop images to add them
        </div>
      )}
    </form>
  );
};

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

/** For Image mode, which always runs on the edit model. */
export const FixedModelChip = ({ model }: { model: ModelDefinition }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span tabIndex={0} className={cn(chipClass(), 'cursor-default')}>
        {model.label}
        <span className='font-normal tabular-nums text-muted-foreground'>
          · {model.creditsPerImage} cr
        </span>
      </span>
    </TooltipTrigger>
    <TooltipContent>{model.description}</TooltipContent>
  </Tooltip>
);

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

/** "Text": the words to set on the thumbnail, in a popover. */
export const OverlayTextPopover = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) => {
  const set = !!value?.trim();
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button type='button' className={chipClass(set)}>
              <Type className='size-4' />
              <span className='max-w-36 truncate'>
                {set ? `“${value.trim()}”` : 'Text'}
              </span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Words to set on the thumbnail</TooltipContent>
      </Tooltip>
      <PopoverContent align='start' className='w-80 p-3'>
        <label
          htmlFor='overlay-text'
          className='mb-1.5 block text-[13px] font-medium'
        >
          Text on thumbnail
        </label>
        <input
          id='overlay-text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete='off'
          placeholder='e.g. WORTH IT?…'
          className='h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-brand focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30'
        />
        <p className='mt-1.5 text-xs text-muted-foreground'>
          Two to four words read best at feed size.
        </p>
      </PopoverContent>
    </Popover>
  );
};

/**
 * "Style": the guided questionnaire, in a popover. Controlled so a failed
 * submit can open it to show what is missing.
 */
export const StylePopover = ({
  open,
  onOpenChange,
  answered,
  invalid,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answered: boolean;
  invalid: boolean;
  children: ReactNode;
}) => (
  <Popover
    open={open}
    onOpenChange={(next) => {
      // The questionnaire dialog opens from inside this popover; closing the
      // popover underneath it would unmount the dialog too.
      if (!next && useQuestionnaireStore.getState().isOpen) return;
      onOpenChange(next);
    }}
  >
    <Tooltip>
      <TooltipTrigger asChild>
        <PopoverTrigger asChild>
          <button
            type='button'
            aria-invalid={invalid || undefined}
            className={chipClass(answered, invalid)}
          >
            <SlidersHorizontal className='size-4' />
            Style
            {answered && (
              <span
                className='size-1.5 rounded-full bg-brand'
                aria-label='set'
              />
            )}
          </button>
        </PopoverTrigger>
      </TooltipTrigger>
      <TooltipContent>
        Let ThumbAI decide, or guide tone and layout
      </TooltipContent>
    </Tooltip>
    <PopoverContent
      align='start'
      className='w-[min(24rem,calc(100vw-2rem))] p-3'
    >
      {children}
    </PopoverContent>
  </Popover>
);

/** "Advanced": output format and a reset, out of the way. */
export const AdvancedPopover = ({
  format,
  onFormatChange,
  onReset,
}: {
  format: string;
  onFormatChange: (format: string) => void;
  onReset: () => void;
}) => (
  <Popover>
    <Tooltip>
      <TooltipTrigger asChild>
        <PopoverTrigger asChild>
          <button
            type='button'
            className={chipClass()}
            aria-label='Advanced settings'
          >
            <Settings2 className='size-4 text-muted-foreground' />
          </button>
        </PopoverTrigger>
      </TooltipTrigger>
      <TooltipContent>Advanced: output format, reset</TooltipContent>
    </Tooltip>
    <PopoverContent align='end' className='w-64 p-3'>
      <p className='mb-1.5 text-[13px] font-medium'>Output format</p>
      <div
        role='radiogroup'
        aria-label='Output format'
        className='grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1'
      >
        {OUTPUT_FORMAT_OPTIONS.map((option) => {
          const selected = option.value === format;
          return (
            <button
              key={option.value}
              type='button'
              role='radio'
              aria-checked={selected}
              onClick={() => onFormatChange(option.value)}
              className={cn(
                'h-7 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                selected
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <button
        type='button'
        onClick={onReset}
        className='mt-3 w-full rounded-lg py-1.5 text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground'
      >
        Reset all settings
      </button>
    </PopoverContent>
  </Popover>
);

/** Opens the Style popover when a submit fails on a field that lives there. */
export const useStylePopover = () => {
  const [open, setOpen] = useState(false);
  const onInvalid = useCallback((errors: Record<string, unknown>) => {
    if (errors.choices || errors.questionnaire) setOpen(true);
  }, []);
  return { open, setOpen, onInvalid };
};
