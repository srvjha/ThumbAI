'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { FeedVideo } from './fixtures';
import {
  SURFACES,
  Surface,
  Thumb,
  type SurfaceId,
  type SurfaceMode,
} from './surfaces';

export type FeedPreviewProps = {
  /** 1 to 3 thumbnail URLs. Two or more turn on compare mode. */
  images: string[];
  /** Seeds the editable video title. */
  title?: string;
  /** Seeds the editable channel name. */
  channel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LETTERS = ['A', 'B', 'C'] as const;
const SURFACE_IDS = Object.keys(SURFACES) as SurfaceId[];
const STRIP_WIDTHS = [360, 246, 168] as const;

const DEFAULT_TITLE = 'My new video';
const DEFAULT_CHANNEL = 'Your channel';

/**
 * Shows 1 to 3 thumbnails where viewers will actually meet them: a home grid,
 * search results, the up-next sidebar and a phone feed, among other videos.
 * Renders a large Dialog on desktop and a full-screen Sheet on phones.
 */
export const FeedPreview = ({
  images,
  title,
  channel,
  open,
  onOpenChange,
}: FeedPreviewProps) => {
  const isMobile = useIsMobile();

  // Kept outside the body so they survive closing and reopening.
  const [surface, setSurface] = useState<SurfaceId>('home');
  const [mode, setMode] = useState<SurfaceMode>('light');

  const body = (
    <PreviewBody
      images={images}
      initialTitle={title}
      initialChannel={channel}
      surface={surface}
      onSurfaceChange={setSurface}
      mode={mode}
      onModeChange={setMode}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side='bottom'
          className='h-[100dvh] max-h-[100dvh] gap-0 border-0 p-0'
        >
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[calc(100dvh-2rem)] max-h-[1000px] w-[calc(100vw-2rem)] max-w-[1480px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1480px]'>
        {body}
      </DialogContent>
    </Dialog>
  );
};

/* ------------------------------------------------------------------ body */

type BodyProps = {
  images: string[];
  initialTitle?: string;
  initialChannel?: string;
  surface: SurfaceId;
  onSurfaceChange: (s: SurfaceId) => void;
  mode: SurfaceMode;
  onModeChange: (m: SurfaceMode) => void;
};

/** Mounted only while open, so the inputs reseed from props on each open. */
const PreviewBody = ({
  images,
  initialTitle,
  initialChannel,
  surface,
  onSurfaceChange,
  mode,
  onModeChange,
}: BodyProps) => {
  const ids = useId();
  const [title, setTitle] = useState(initialTitle?.trim() || DEFAULT_TITLE);
  const [channel, setChannel] = useState(
    initialChannel?.trim() || DEFAULT_CHANNEL,
  );
  const [duration, setDuration] = useState('12:48');
  const [view, setView] = useState('all');
  const [squint, setSquint] = useState(false);

  const shortlist = useMemo(() => images.filter(Boolean).slice(0, 3), [images]);
  const comparing = shortlist.length > 1;

  const candidates: FeedVideo[] = useMemo(
    () =>
      shortlist.map((src, i) => {
        const letter = comparing ? ` ${LETTERS[i]}` : '';
        return {
          id: `mine-${i}`,
          src,
          alt: `Your thumbnail${letter}`,
          title: title.trim() || DEFAULT_TITLE,
          channel: channel.trim() || DEFAULT_CHANNEL,
          views: '12K views',
          age: '2 days ago',
          duration: duration.trim() || '0:00',
          description: '',
          hue: 220,
        };
      }),
    [shortlist, comparing, title, channel, duration],
  );

  // Which candidates the surface shows: all side by side, or one of them.
  // Falls back to compare if the shortlist shrank under a selected option.
  const picked = comparing && view !== 'all' ? candidates[Number(view)] : null;
  const shown = picked
    ? [{ video: picked, index: Number(view) }]
    : candidates.map((video, index) => ({ video, index }));
  const sideBySide = comparing && !picked;

  return (
    <Tabs
      value={surface}
      onValueChange={(v) => onSurfaceChange(v as SurfaceId)}
      className='flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto sm:overflow-hidden'
    >
      <header className='bg-background px-4 pt-5 pb-4 sm:px-6'>
        <div className='pr-10'>
          <DialogTitle className='font-serif text-3xl leading-none font-normal tracking-tight'>
            See it in the feed
          </DialogTitle>
          <DialogDescription className='mt-2 max-w-[60ch]'>
            {comparing
              ? 'Your shortlist among other videos, at the sizes viewers meet it. Change the title to test both together.'
              : 'Your thumbnail among other videos, at the sizes viewers meet it. Change the title to test both together.'}
          </DialogDescription>
        </div>

        <div className='mt-4 grid grid-cols-[1fr_88px] gap-3 sm:grid-cols-[minmax(0,1fr)_200px_88px_auto] sm:items-end'>
          <div className='col-span-2 grid gap-1.5 sm:col-span-1'>
            <Label htmlFor={`${ids}-title`}>Video title</Label>
            <Input
              id={`${ids}-title`}
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className='bg-card'
            />
          </div>
          <div className='grid min-w-0 gap-1.5'>
            <Label htmlFor={`${ids}-channel`}>Channel</Label>
            <Input
              id={`${ids}-channel`}
              value={channel}
              maxLength={60}
              onChange={(e) => setChannel(e.target.value)}
              className='bg-card'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor={`${ids}-length`}>Length</Label>
            <Input
              id={`${ids}-length`}
              value={duration}
              maxLength={8}
              inputMode='numeric'
              onChange={(e) => setDuration(e.target.value)}
              className='bg-card tabular-nums'
            />
          </div>
          <div className='col-span-2 grid gap-1.5 sm:col-span-1'>
            <span
              id={`${ids}-mode`}
              className='text-sm leading-none font-medium'
            >
              Background
            </span>
            <ToggleGroup
              type='single'
              variant='outline'
              value={mode}
              onValueChange={(v) => v && onModeChange(v as SurfaceMode)}
              aria-labelledby={`${ids}-mode`}
              className='bg-card'
            >
              <ToggleGroupItem value='light' className='h-9 px-4'>
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value='dark' className='h-9 px-4'>
                Dark
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </header>

      <div className='sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y bg-background px-4 py-2.5 sm:static sm:px-6'>
        <div className='-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0'>
          <TabsList aria-label='Where to preview'>
            {SURFACE_IDS.map((id) => (
              <TabsTrigger key={id} value={id} className='flex-none px-3'>
                {SURFACES[id].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {comparing && (
          <ToggleGroup
            type='single'
            variant='outline'
            size='sm'
            value={picked ? view : 'all'}
            onValueChange={(v) => v && setView(v)}
            aria-label='Candidates to show'
          >
            <ToggleGroupItem value='all'>Compare</ToggleGroupItem>
            {shortlist.map((_, i) => (
              <ToggleGroupItem
                key={i}
                value={String(i)}
                aria-label={`Only option ${LETTERS[i]}`}
                className='min-w-9 tabular-nums'
              >
                {LETTERS[i]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      <div className='bg-muted/70 sm:min-h-0 sm:flex-1 sm:overflow-auto'>
        {candidates.length === 0 ? (
          <p className='px-6 py-16 text-center text-sm text-muted-foreground'>
            Generate a thumbnail first, then preview it here.
          </p>
        ) : (
          <>
            {SURFACE_IDS.map((id) => {
              const { Component, note } = SURFACES[id];
              return (
                <TabsContent
                  key={id}
                  value={id}
                  className='px-4 pt-4 pb-8 sm:px-6'
                >
                  <p className='mb-4 text-sm text-muted-foreground'>{note}</p>
                  <div
                    className={cn(
                      sideBySide
                        ? 'flex flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-start'
                        : 'block',
                    )}
                  >
                    {shown.map(({ video, index }) => (
                      <section
                        key={video.id}
                        aria-label={
                          comparing ? `Option ${LETTERS[index]}` : undefined
                        }
                        className={cn('min-w-0', sideBySide && 'lg:flex-none')}
                      >
                        {comparing && <CandidateMark index={index} />}
                        <div className='overflow-x-auto'>
                          <Component
                            mine={video}
                            mineLabel={
                              comparing
                                ? `Your video, option ${LETTERS[index]}`
                                : 'Your video'
                            }
                            mode={mode}
                            compact={sideBySide}
                          />
                        </div>
                      </section>
                    ))}
                  </div>
                </TabsContent>
              );
            })}

            <ReadabilityStrip
              candidates={candidates}
              comparing={comparing}
              mode={mode}
              squint={squint}
              onSquintChange={setSquint}
            />
          </>
        )}
      </div>
    </Tabs>
  );
};

/* ------------------------------------------------------------ small bits */

const CandidateMark = ({ index }: { index: number }) => (
  <p className='mb-2 flex items-center gap-2 text-sm font-medium'>
    <span
      aria-hidden
      className='inline-flex size-6 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background'
    >
      {LETTERS[index]}
    </span>
    Option {LETTERS[index]}
  </p>
);

const ReadabilityStrip = ({
  candidates,
  comparing,
  mode,
  squint,
  onSquintChange,
}: {
  candidates: FeedVideo[];
  comparing: boolean;
  mode: SurfaceMode;
  squint: boolean;
  onSquintChange: (v: boolean) => void;
}) => {
  const switchId = useId();
  return (
    <section
      aria-labelledby={`${switchId}-h`}
      className='border-t bg-background px-4 pt-6 pb-10 sm:px-6'
    >
      <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-3'>
        <div>
          <h3 id={`${switchId}-h`} className='text-base font-semibold'>
            Readability at three sizes
          </h3>
          <p className='mt-1 max-w-[62ch] text-sm text-muted-foreground'>
            Squint blurs each thumbnail slightly. If the subject and the words
            still stand out, it will hold up in a busy feed.
          </p>
        </div>
        <div className='flex items-center gap-2.5'>
          <Switch
            id={switchId}
            checked={squint}
            onCheckedChange={onSquintChange}
          />
          <Label htmlFor={switchId}>Squint</Label>
        </div>
      </div>

      <Surface mode={mode} className='mt-5 overflow-x-auto p-4 sm:p-6'>
        <div className='flex flex-col gap-8'>
          {candidates.map((video, i) => (
            <StripRow key={video.id} label={comparing ? LETTERS[i] : null}>
              {STRIP_WIDTHS.map((w) => (
                <figure
                  key={w}
                  className='flex-none'
                  style={{ width: w, maxWidth: '100%' }}
                >
                  <Thumb
                    video={{
                      ...video,
                      alt: `${video.alt} at ${w} pixels wide`,
                    }}
                    width={w}
                    radius={w > 200 ? 12 : 8}
                    squint={squint}
                    compactBadge={w < 200}
                  />
                  <figcaption className='mt-2 text-xs text-[var(--s-meta)] tabular-nums'>
                    {w} px
                  </figcaption>
                </figure>
              ))}
            </StripRow>
          ))}
        </div>
      </Surface>
    </section>
  );
};

const StripRow = ({
  label,
  children,
}: {
  label: string | null;
  children: ReactNode;
}) => (
  <div className='flex gap-4'>
    {label && (
      <span className='inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--s-text)] text-xs font-semibold text-[var(--s-bg)]'>
        <span className='sr-only'>Option </span>
        {label}
      </span>
    )}
    <div className='flex min-w-0 flex-wrap items-end gap-4'>{children}</div>
  </div>
);
