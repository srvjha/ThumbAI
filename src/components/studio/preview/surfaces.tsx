'use client';

import type { CSSProperties, ReactNode } from 'react';
import { EllipsisVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NOW_PLAYING, pickNeighbours, type FeedVideo } from './fixtures';

/*
 * Mock video-feed surfaces. These deliberately do not use the app's paper
 * tokens: they simulate a platform's own light and dark backgrounds with
 * neutral greys, at the pixel sizes viewers actually see.
 */

export type SurfaceMode = 'light' | 'dark';
export type SurfaceId = 'home' | 'search' | 'upnext' | 'mobile';

const SURFACE_VARS: Record<SurfaceMode, CSSProperties> = {
  light: {
    '--s-bg': '#ffffff',
    '--s-text': '#0f0f0f',
    '--s-meta': '#606060',
    '--s-well': '#f2f2f2',
    '--s-frame': '#e5e5e5',
    colorScheme: 'light',
  } as CSSProperties,
  dark: {
    '--s-bg': '#0f0f0f',
    '--s-text': '#f1f1f1',
    '--s-meta': '#aaaaaa',
    '--s-well': '#272727',
    '--s-frame': '#3f3f3f',
    colorScheme: 'dark',
  } as CSSProperties,
};

/** Sets the surface colours for everything inside it. */
export const Surface = ({
  mode,
  className,
  children,
}: {
  mode: SurfaceMode;
  className?: string;
  children: ReactNode;
}) => (
  <div
    data-surface={mode}
    style={SURFACE_VARS[mode]}
    className={cn(
      'rounded-xl bg-[var(--s-bg)] font-sans text-[var(--s-text)] antialiased',
      className,
    )}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ parts */

export const Thumb = ({
  video,
  width,
  radius,
  squint = false,
  compactBadge = false,
}: {
  video: FeedVideo;
  /** Pixel width, or '100%' for full-bleed. */
  width: number | '100%';
  radius: number;
  squint?: boolean;
  /** Smaller inset for the smallest thumbnails. */
  compactBadge?: boolean;
}) => (
  <div
    className='relative shrink-0 overflow-hidden bg-[var(--s-well)]'
    style={{ width, maxWidth: '100%', borderRadius: radius }}
  >
    <div className='aspect-video'>
      {/* Generated images live on fal.media, which next.config does not allow
          for next/image, so a plain img is used for every thumbnail. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={video.src}
        alt={video.alt}
        loading='lazy'
        decoding='async'
        draggable={false}
        className='size-full object-cover transition-[filter] duration-200 motion-reduce:transition-none'
        style={
          squint ? { filter: 'blur(2px)', transform: 'scale(1.03)' } : undefined
        }
      />
    </div>
    <span
      className={cn(
        'absolute rounded-[4px] bg-black/80 px-1 text-xs leading-[18px] font-medium text-white tabular-nums',
        compactBadge ? 'right-1 bottom-1' : 'right-2 bottom-2',
      )}
    >
      {video.duration}
    </span>
  </div>
);

const Avatar = ({
  video,
  size,
  mode,
}: {
  video: FeedVideo;
  size: number;
  mode: SurfaceMode;
}) => (
  <span
    aria-hidden
    className='inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none'
    style={{
      width: size,
      height: size,
      fontSize: Math.round(size * 0.42),
      background:
        mode === 'light'
          ? `hsl(${video.hue} 42% 88%)`
          : `hsl(${video.hue} 28% 26%)`,
      color:
        mode === 'light'
          ? `hsl(${video.hue} 40% 28%)`
          : `hsl(${video.hue} 45% 84%)`,
    }}
  >
    {video.channel.trim().charAt(0).toUpperCase() || '?'}
  </span>
);

const MenuDots = () => (
  <EllipsisVertical
    aria-hidden
    className='mt-0.5 size-5 shrink-0 text-[var(--s-text)]'
  />
);

/** Screen-reader marker so the creator's own card can be found by ear. */
const MineLabel = ({ mine }: { mine?: string }) =>
  mine ? <span className='sr-only'>{mine}: </span> : null;

/* ------------------------------------------------------------- the cards */

type CardProps = {
  video: FeedVideo;
  mode: SurfaceMode;
  /** Set on the creator's card, e.g. "Your video, option A". */
  mine?: string;
};

/** Desktop home grid: 360 × 202 thumbnail, 36px avatar, 16px title. */
export const HomeCard = ({ video, mode, mine }: CardProps) => (
  <article className='w-[360px] max-w-full'>
    <Thumb video={video} width={360} radius={12} />
    <div className='mt-3 flex gap-3'>
      <Avatar video={video} size={36} mode={mode} />
      <div className='min-w-0 flex-1'>
        <h3 className='line-clamp-2 text-base leading-[22px] font-semibold'>
          <MineLabel mine={mine} />
          {video.title}
        </h3>
        <p className='mt-1 truncate text-sm leading-5 text-[var(--s-meta)]'>
          {video.channel}
        </p>
        <p className='text-sm leading-5 text-[var(--s-meta)]'>
          {video.views} · {video.age}
        </p>
      </div>
      <MenuDots />
    </div>
  </article>
);

/** Desktop search results: 360 × 202 on the left, details on the right. */
export const SearchRow = ({
  video,
  mode,
  mine,
  textWidth = 600,
}: CardProps & { textWidth?: number }) => (
  <article className='flex flex-col gap-3 sm:flex-row sm:gap-4'>
    <Thumb video={video} width={360} radius={12} />
    <div className='min-w-0 flex-1' style={{ maxWidth: textWidth }}>
      <div className='flex gap-2'>
        <h3 className='line-clamp-2 flex-1 text-lg leading-[26px] font-normal'>
          <MineLabel mine={mine} />
          {video.title}
        </h3>
        <MenuDots />
      </div>
      <p className='text-xs leading-[18px] text-[var(--s-meta)]'>
        {video.views} · {video.age}
      </p>
      <p className='my-3 flex items-center gap-2 text-xs text-[var(--s-meta)]'>
        <Avatar video={video} size={24} mode={mode} />
        <span className='truncate'>{video.channel}</span>
      </p>
      {video.description && (
        <p className='line-clamp-2 text-xs leading-[18px] text-[var(--s-meta)]'>
          {video.description}
        </p>
      )}
    </div>
  </article>
);

/** Watch-page sidebar: 168 × 94, the smallest desktop size. */
export const UpNextRow = ({ video, mine }: CardProps) => (
  <article className='flex gap-2'>
    <Thumb video={video} width={168} radius={8} compactBadge />
    <div className='min-w-0 flex-1'>
      <h3 className='line-clamp-2 text-sm leading-5 font-semibold'>
        <MineLabel mine={mine} />
        {video.title}
      </h3>
      <p className='mt-1 truncate text-xs leading-[18px] text-[var(--s-meta)]'>
        {video.channel}
      </p>
      <p className='text-xs leading-[18px] text-[var(--s-meta)]'>
        {video.views} · {video.age}
      </p>
    </div>
  </article>
);

/** Phone home feed: full-bleed 390px thumbnail, details underneath. */
export const MobileRow = ({ video, mode, mine }: CardProps) => (
  <article>
    <Thumb video={video} width='100%' radius={0} />
    <div className='flex gap-3 px-3 pt-3 pb-6'>
      <Avatar video={video} size={36} mode={mode} />
      <div className='min-w-0 flex-1'>
        <h3 className='line-clamp-2 text-sm leading-5 font-medium'>
          <MineLabel mine={mine} />
          {video.title}
        </h3>
        <p className='mt-0.5 text-xs leading-[18px] text-[var(--s-meta)]'>
          {video.channel} · {video.views} · {video.age}
        </p>
      </div>
      <MenuDots />
    </div>
  </article>
);

/* -------------------------------------------------------------- surfaces */

type SurfaceProps = {
  mine: FeedVideo;
  mineLabel: string;
  mode: SurfaceMode;
  /** A narrow slice (neighbour, yours, neighbour) for side-by-side compare. */
  compact?: boolean;
  /** Varies the neighbours so stacked panels do not look identical. */
  seed?: number;
};

/** Inserts the creator's video at `at` among `n` neighbours. */
const withMine = (mine: FeedVideo, n: number, at: number, seed = 0) => {
  const list = pickNeighbours(n, seed, [NOW_PLAYING.id]);
  list.splice(at, 0, mine);
  return list;
};

export const HomeSurface = ({
  mine,
  mineLabel,
  mode,
  compact,
}: SurfaceProps) => {
  const list = compact ? withMine(mine, 2, 1, 2) : withMine(mine, 7, 1, 1);
  return (
    <Surface mode={mode} className='p-4 sm:p-6'>
      <div
        className='grid gap-x-4 gap-y-10'
        style={{
          gridTemplateColumns: compact
            ? 'minmax(0, 360px)'
            : 'repeat(auto-fill, minmax(min(360px, 100%), 360px))',
        }}
      >
        {list.map((v, i) => (
          <HomeCard
            key={`${v.id}-${i}`}
            video={v}
            mode={mode}
            mine={v === mine ? mineLabel : undefined}
          />
        ))}
      </div>
    </Surface>
  );
};

export const SearchSurface = ({
  mine,
  mineLabel,
  mode,
  compact,
}: SurfaceProps) => {
  const list = compact ? withMine(mine, 2, 1, 4) : withMine(mine, 4, 1, 4);
  return (
    <Surface mode={mode} className='p-4 sm:p-6'>
      <div className='flex flex-col gap-4'>
        {list.map((v, i) => (
          <SearchRow
            key={`${v.id}-${i}`}
            video={v}
            mode={mode}
            mine={v === mine ? mineLabel : undefined}
            textWidth={compact ? 320 : 600}
          />
        ))}
      </div>
    </Surface>
  );
};

export const UpNextSurface = ({
  mine,
  mineLabel,
  mode,
  compact,
}: SurfaceProps) => {
  const list = compact ? withMine(mine, 4, 2, 3) : withMine(mine, 7, 2, 3);
  const column = (
    <div className='flex w-[402px] max-w-full shrink-0 flex-col gap-2'>
      {list.map((v, i) => (
        <UpNextRow
          key={`${v.id}-${i}`}
          video={v}
          mode={mode}
          mine={v === mine ? mineLabel : undefined}
        />
      ))}
    </div>
  );

  if (compact) {
    return (
      <Surface mode={mode} className='p-4 sm:p-6'>
        {column}
      </Surface>
    );
  }

  return (
    <Surface mode={mode} className='flex gap-6 p-4 sm:p-6'>
      <div className='hidden min-w-0 flex-1 lg:block' aria-hidden>
        <div className='aspect-video overflow-hidden rounded-xl bg-[var(--s-well)]'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={NOW_PLAYING.src}
            alt=''
            className='size-full object-cover opacity-90'
          />
        </div>
        <p className='mt-3 text-xl leading-7 font-semibold'>
          {NOW_PLAYING.title}
        </p>
        <p className='mt-2 flex items-center gap-3 text-sm text-[var(--s-meta)]'>
          <Avatar video={NOW_PLAYING} size={40} mode={mode} />
          <span>
            <span className='block font-medium text-[var(--s-text)]'>
              {NOW_PLAYING.channel}
            </span>
            {NOW_PLAYING.views} · {NOW_PLAYING.age}
          </span>
        </p>
      </div>
      {column}
    </Surface>
  );
};

export const MobileSurface = ({
  mine,
  mineLabel,
  mode,
  compact,
}: SurfaceProps) => {
  const list = compact ? withMine(mine, 2, 1, 5) : withMine(mine, 4, 1, 5);
  return (
    <div className='flex justify-center'>
      <Surface
        mode={mode}
        className='w-[390px] max-w-full overflow-hidden rounded-[28px] pt-2 ring-1 ring-[var(--s-frame)]'
      >
        {list.map((v, i) => (
          <MobileRow
            key={`${v.id}-${i}`}
            video={v}
            mode={mode}
            mine={v === mine ? mineLabel : undefined}
          />
        ))}
      </Surface>
    </div>
  );
};

export const SURFACES: Record<
  SurfaceId,
  {
    label: string;
    note: string;
    Component: (p: SurfaceProps) => ReactNode;
  }
> = {
  home: {
    label: 'Home feed',
    note: 'Desktop home grid. Thumbnails at 360 × 202 px.',
    Component: HomeSurface,
  },
  search: {
    label: 'Search results',
    note: 'Desktop search. A 360 × 202 px thumbnail beside an 18 px title.',
    Component: SearchSurface,
  },
  upnext: {
    label: 'Up next',
    note: 'Watch page sidebar. 168 × 94 px, the smallest size on desktop.',
    Component: UpNextSurface,
  },
  mobile: {
    label: 'Mobile',
    note: 'Phone home feed, 390 px wide. Thumbnails run edge to edge.',
    Component: MobileSurface,
  },
};
