'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowUp,
  Loader2,
  MessageCircleQuestion,
  Plus,
  Settings2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TEXT_TO_IMAGE_MODELS, type OutputFormat } from '@/config/models';
import { cn } from '@/lib/utils';
import {
  AspectToggle,
  AutoTextarea,
  CountSelect,
  ModelSelect,
  chipClass,
} from '../controls';
import { StylePresetPicker } from '../StylePresetPicker';
import { OUTPUT_FORMAT_OPTIONS } from '../options';
import type { StudioMode } from '../modes';
import { costOf, sendBlocker, type StudioChat } from './useStudioChat';
import type { Attachment, ChatSettings } from './types';

const PLACEHOLDERS: Record<StudioMode, string> = {
  text: 'Describe your video…',
  image: 'Attach a photo, then say what to make of it…',
  blog: 'Paste a blog post URL…',
};

const MAX_ATTACHMENTS = 6;

const toAttachments = (files: File[]): Attachment[] =>
  files
    .filter((f) => f.type.startsWith('image/'))
    .map((file) => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      file,
    }));

/** Format, model, count, text on the image and file type, in one menu. */
const SettingsMenu = ({
  settings,
  onChange,
  usesEditModel,
}: {
  settings: ChatSettings;
  onChange: (next: Partial<ChatSettings>) => void;
  usesEditModel: boolean;
}) => {
  const summary = [
    settings.aspectRatios.join(' + ') || 'No format',
    usesEditModel ? null : TEXT_TO_IMAGE_MODELS[settings.tier].label,
    settings.numImages > 1 ? `×${settings.numImages}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(chipClass(), 'rounded-full')}
          aria-label={`Settings: ${summary}`}
        >
          <Settings2 className='size-4 text-muted-foreground' />
          <span className='tabular-nums'>{summary}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-80 space-y-4 p-4'>
        <div>
          <p className='mb-1.5 text-[13px] font-medium'>Format</p>
          <AspectToggle
            value={settings.aspectRatios}
            onChange={(v) =>
              onChange({ aspectRatios: v as ChatSettings['aspectRatios'] })
            }
          />
          <p className='mt-1.5 text-xs text-muted-foreground'>
            Pick both to get a thumbnail and a Shorts cover in one go.
          </p>
        </div>
        <div className='flex gap-3'>
          {!usesEditModel && (
            <div className='min-w-0 flex-1'>
              <p className='mb-1.5 text-[13px] font-medium'>Model</p>
              <ModelSelect
                models={TEXT_TO_IMAGE_MODELS}
                value={settings.tier}
                onChange={(tier) => onChange({ tier })}
              />
            </div>
          )}
          <div className='min-w-0 flex-1'>
            <p className='mb-1.5 text-[13px] font-medium'>Images</p>
            <CountSelect
              value={settings.numImages}
              onChange={(numImages) => onChange({ numImages })}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor='overlay-text'
            className='mb-1.5 block text-[13px] font-medium'
          >
            Text on the thumbnail
          </label>
          <input
            id='overlay-text'
            value={settings.overlayText}
            onChange={(e) => onChange({ overlayText: e.target.value })}
            autoComplete='off'
            placeholder='e.g. WORTH IT?'
            className='h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-brand focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30'
          />
        </div>
        <div>
          <p className='mb-1.5 text-[13px] font-medium'>File type</p>
          <div
            role='radiogroup'
            aria-label='File type'
            className='grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1'
          >
            {OUTPUT_FORMAT_OPTIONS.map((option) => {
              const on = option.value === settings.outputFormat;
              return (
                <button
                  key={option.value}
                  type='button'
                  role='radio'
                  aria-checked={on}
                  onClick={() =>
                    onChange({ outputFormat: option.value as OutputFormat })
                  }
                  className={cn(
                    'h-7 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    on
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export type ChatComposerHandle = { setText: (text: string) => void };

/**
 * The chat input. Enter sends, Shift+Enter breaks the line. Images can be
 * attached, pasted or dropped. With an image in the thread, a message edits
 * it unless the "Editing" chip is dismissed.
 */
export const ChatComposer = forwardRef<
  ChatComposerHandle,
  { mode: StudioMode; chat: StudioChat; autoFocus?: boolean }
>(({ mode, chat, autoFocus }, ref) => {
  const {
    settings,
    setSettings,
    target,
    pickTarget,
    busy,
    balance,
    send,
    suggestion,
  } = chat;
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    setText: (next) => {
      setText(next);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
  }));

  const update = (next: Partial<ChatSettings>) =>
    setSettings((prev) => ({ ...prev, ...next }));

  const addFiles = (files: File[]) => {
    const added = toAttachments(files);
    if (added.length === 0) return;
    setAttachments((prev) => [...prev, ...added].slice(0, MAX_ATTACHMENTS));
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const request = { target: target ?? undefined, attachments, settings };
  const cost = costOf(request);
  const short = balance !== undefined && balance < cost;
  const empty = !text.trim() && attachments.length === 0;
  const usesEditModel = !!target || attachments.length > 0;
  // Shown as ghost text in the empty input; Tab (or a tap) takes it.
  const ghost = !text && attachments.length === 0 ? suggestion : null;

  const takeGhost = () => {
    if (!ghost) return;
    setText(ghost);
    inputRef.current?.focus();
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || empty) return;
    if (!target && settings.aspectRatios.length === 0) {
      toast.error('Pick a format in settings first.');
      return;
    }
    const blocker = sendBlocker(mode, text, attachments, target);
    if (blocker) {
      toast.error(blocker);
      return;
    }
    send(text, attachments);
    setText('');
    setAttachments([]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !e.shiftKey && ghost) {
      e.preventDefault();
      takeGhost();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith('image/'))) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const onDrop = (e: DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <form
      onSubmit={submit}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragging(false);
        }
      }}
      onDrop={onDrop}
      className={cn(
        'rounded-[1.6rem] border bg-card p-2 shadow-[0_1px_2px_rgb(18_23_43/0.04),0_12px_32px_-16px_rgb(18_23_43/0.18)] transition-colors focus-within:border-foreground/20',
        dragging && 'border-brand bg-accent/50',
      )}
    >
      {(target || attachments.length > 0) && (
        <div className='flex flex-wrap items-center gap-2 px-2 pt-1.5'>
          {target && (
            <span className='flex items-center gap-2 rounded-xl border bg-background py-1 pl-1 pr-1.5 text-xs'>
              <img
                src={target.url}
                alt=''
                className={cn(
                  'rounded-md object-cover',
                  target.aspectRatio === '9:16' ? 'h-9 w-5' : 'h-7 w-12',
                )}
              />
              <span className='text-muted-foreground'>Editing this image</span>
              <button
                type='button'
                onClick={() => pickTarget(null)}
                aria-label='Stop editing, make a new image instead'
                className='rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground'
              >
                <X className='size-3.5' />
              </button>
            </span>
          )}
          {attachments.map((a) => (
            <span key={a.id} className='group relative'>
              <img
                src={a.previewUrl}
                alt='Attached image'
                className='size-12 rounded-xl border object-cover'
              />
              <button
                type='button'
                onClick={() => removeAttachment(a.id)}
                aria-label='Remove attachment'
                className='absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-xs hover:text-foreground'
              >
                <X className='size-3' />
              </button>
            </span>
          ))}
        </div>
      )}

      <label htmlFor='composer-input' className='sr-only'>
        Message
      </label>
      <div className='relative'>
        <AutoTextarea
          ref={inputRef}
          id='composer-input'
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={
            ghost
              ? ''
              : target
                ? 'Describe a change to this image…'
                : PLACEHOLDERS[mode]
          }
          aria-describedby={ghost ? 'composer-suggestion' : undefined}
          className='min-h-12 px-3 pb-1 pt-2.5'
        />
        {ghost && (
          <p
            id='composer-suggestion'
            className='pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-2.5 text-base leading-6 text-muted-foreground/70'
          >
            <span className='sr-only'>Suggestion: </span>
            <span className='min-w-0 truncate'>{ghost}</span>
            <button
              type='button'
              onClick={takeGhost}
              className='pointer-events-auto inline-flex shrink-0 items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-[11px] font-medium leading-4 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
            >
              <kbd className='font-sans max-sm:hidden'>Tab</kbd>
              <span className='max-sm:hidden'>to use</span>
              <span className='sm:hidden'>Use</span>
            </button>
          </p>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <div className='-my-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]'>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                onClick={() => fileRef.current?.click()}
                aria-label='Attach images'
                className={cn(
                  chipClass(),
                  'w-9 justify-center rounded-full px-0',
                )}
              >
                <Plus className='size-4' />
              </button>
            </TooltipTrigger>
            <TooltipContent>Attach a photo, logo or reference</TooltipContent>
          </Tooltip>
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            multiple
            hidden
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
          <SettingsMenu
            settings={settings}
            onChange={update}
            usesEditModel={usesEditModel}
          />
          {!target && (
            <>
              <div className='[&>button]:rounded-full'>
                <StylePresetPicker
                  value={settings.stylePreset}
                  onChange={(stylePreset) => update({ stylePreset })}
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type='button'
                    aria-pressed={settings.guided}
                    onClick={() => update({ guided: !settings.guided })}
                    className={cn(chipClass(settings.guided), 'rounded-full')}
                  >
                    <MessageCircleQuestion className='size-4' />
                    Ask me
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Answer a few style questions before it generates
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <span
          className={cn(
            'shrink-0 text-xs tabular-nums',
            short ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {short ? (
            <Link
              href='/billing'
              className='underline-offset-2 hover:underline'
            >
              {cost} cr · top up
            </Link>
          ) : (
            `${cost} cr`
          )}
        </span>
        <Button
          type='submit'
          size='icon'
          variant='brand'
          disabled={busy || empty}
          aria-label={target ? 'Apply edit' : 'Generate'}
          className='size-9 shrink-0 rounded-full'
        >
          {busy ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <ArrowUp className='size-4' />
          )}
        </Button>
      </div>
    </form>
  );
});
ChatComposer.displayName = 'ChatComposer';
