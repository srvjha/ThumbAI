'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Command as CommandIcon,
  FileText,
  ImagePlus,
  Type,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Kbd } from '../ui/kbd';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../ui/resizable';
import type { ImageData } from '../shared/imageUtils';
import type {
  GenerationDetail,
  GenerationItem,
} from '@/components/dashboard/types';
import { useGeneration } from '@/hooks/user/generations';
import { SHORTLIST_LIMIT, useStudioStore } from '@/store/studioStore';
import { Canvas, type CanvasProps, type CanvasRefine } from './Canvas';
import { CommandPalette } from './CommandPalette';
import { CompareSet, previewable } from './CompareSet';
import { HistoryRail } from './HistoryRail';
import { STUDIO_MODES, modeById, type StudioMode } from './modes';
import { submitStudioForm } from './StudioLayout';
import { useMediaQuery, useModKey } from './useMediaQuery';

// The feed mock is only needed once someone opens it.
const FeedPreview = dynamic(
  () => import('./preview/FeedPreview').then((m) => m.FeedPreview),
  { ssr: false },
);

const MODE_ICONS: Record<StudioMode, typeof Type> = {
  text: Type,
  image: ImagePlus,
  blog: FileText,
};

const toImages = (item: GenerationItem): ImageData[] =>
  item.image_url.map((url) => ({
    url,
    aspectRatio: item.aspect_ratio ?? '16:9',
  }));

const shortLabel = (item: GenerationItem) => {
  const text = item.prompt?.trim() || 'Past generation';
  return text.length > 32 ? `${text.slice(0, 32)}…` : text;
};

const ModeSwitcher = ({ mode }: { mode: StudioMode }) => {
  const router = useRouter();

  useEffect(() => {
    STUDIO_MODES.forEach((m) => m.id !== mode && router.prefetch(m.href));
  }, [mode, router]);

  return (
    <ToggleGroup
      type='single'
      value={mode}
      onValueChange={(value) => {
        if (value && value !== mode) {
          router.push(modeById(value as StudioMode).href);
        }
      }}
      aria-label='Studio mode'
      className='rounded-xl bg-secondary p-1'
    >
      {STUDIO_MODES.map((m) => {
        const Icon = MODE_ICONS[m.id];
        return (
          <ToggleGroupItem
            key={m.id}
            value={m.id}
            className='h-8 gap-1.5 rounded-lg px-3 text-sm text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs'
          >
            <Icon className='size-4' />
            {m.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
};

export interface StudioWorkspaceProps {
  mode: StudioMode;
  /** One line under the mode switcher saying what this mode makes. */
  description: string;
  /** The workflow's <ControlsPanel> form. */
  controls: ReactNode;
  status: CanvasProps['status'];
  images: ImageData[];
  ratios: string[];
  outputFormat: string;
  empty: CanvasProps['empty'];
  isGenerating: boolean;
  /** Whether the form can be submitted right now (palette's Generate). */
  canGenerate: boolean;
  onVary?: () => void;
  onEdit?: (image: ImageData) => void;
  editLabel?: string;
  refine?: CanvasRefine;
  /** Puts images from history (or nothing) on the canvas. */
  onLoadImages: (images: ImageData[]) => void;
  /** For `?from=<id>`: restore that generation's inputs into the form. */
  onRestoreInputs?: (generation: GenerationDetail) => void;
  /** Seeds the feed preview's video title. */
  previewTitle?: string;
}

/**
 * The studio frame shared by all three workflows: mode switcher and compare
 * set on top; Controls | Canvas | History as resizable panes on desktop,
 * stacked on smaller screens.
 */
export const StudioWorkspace = ({
  mode,
  description,
  controls,
  status,
  images,
  ratios,
  outputFormat,
  empty,
  isGenerating,
  canGenerate,
  onVary,
  onEdit,
  editLabel,
  refine,
  onLoadImages,
  onRestoreInputs,
  previewTitle,
}: StudioWorkspaceProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const mod = useModKey();

  const shortlist = useStudioStore((s) => s.shortlist);
  const togglePin = useStudioStore((s) => s.togglePin);
  const previewOpen = useStudioStore((s) => s.previewOpen);
  const setPreviewOpen = useStudioStore((s) => s.setPreviewOpen);
  const paletteOpen = useStudioStore((s) => s.paletteOpen);
  const setPaletteOpen = useStudioStore((s) => s.setPaletteOpen);

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [refining, setRefining] = useState<string | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const seen = useRef(new Set<string>());
  // What was on the canvas before a history item replaced it.
  const sessionImages = useRef<ImageData[] | null>(null);

  useEffect(() => {
    useStudioStore.persist.rehydrate();
  }, []);

  // New images take the stage: the first one not seen before wins, so a
  // refinement or a fresh batch shows itself without losing older versions.
  useEffect(() => {
    const fresh = images.find((img) => !seen.current.has(img.url));
    images.forEach((img) => seen.current.add(img.url));
    if (fresh) setSelectedUrl(fresh.url);
    else if (!images.some((img) => img.url === selectedUrl)) {
      setSelectedUrl(images[0]?.url ?? null);
    }
    // selectedUrl is read, not tracked: a manual pick must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  useEffect(() => {
    if (!isGenerating) setRefining(null);
  }, [isGenerating]);

  // A fresh run replaces whatever was loaded from history.
  useEffect(() => {
    if (status === 'generating' && !refining) {
      setLoadedFrom(null);
      sessionImages.current = null;
    }
    // Keep the history rail current once a run lands.
    if (status === 'completed') {
      queryClient.invalidateQueries({ queryKey: ['me', 'generations'] });
    }
  }, [status, refining, queryClient]);

  // ⌘K / Ctrl+K toggles the palette from anywhere in the studio.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(!useStudioStore.getState().paletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  const loadGeneration = useCallback(
    (item: GenerationItem) => {
      if (!loadedFrom) sessionImages.current = images;
      onLoadImages(toImages(item));
      setLoadedFrom({ id: item.id, label: shortLabel(item) });
    },
    [images, loadedFrom, onLoadImages],
  );

  const clearLoaded = () => {
    onLoadImages(sessionImages.current ?? []);
    sessionImages.current = null;
    setLoadedFrom(null);
  };

  // ?from=<id>: open a past generation, e.g. from the library's "Open in
  // studio". Wrong mode for it? Hop to the right one, keeping the param.
  const fromId = searchParams.get('from');
  const deepLink = useGeneration(fromId);
  const appliedFrom = useRef<string | null>(null);
  useEffect(() => {
    const gen = deepLink.data;
    if (!gen || appliedFrom.current === gen.id) return;
    const target = STUDIO_MODES.find((m) => m.workflow === gen.model_used);
    if (target && target.id !== mode) {
      router.replace(`${target.href}?from=${gen.id}`);
      return;
    }
    appliedFrom.current = gen.id;
    if (gen.status !== 'COMPLETED' || gen.image_url.length === 0) {
      toast.error('That generation has no finished images to open.');
      return;
    }
    loadGeneration(gen);
    onRestoreInputs?.(gen);
  }, [deepLink.data, mode, router, loadGeneration, onRestoreInputs]);

  useEffect(() => {
    if (deepLink.isError) toast.error('Couldn’t open that generation.');
  }, [deepLink.isError]);

  const active = images.find((img) => img.url === selectedUrl) ?? null;
  const pinned = !!active && shortlist.some((p) => p.url === active.url);

  const handleTogglePin = (image: ImageData) => {
    const result = togglePin(image);
    if (result === 'full') {
      toast.error(`The compare set holds ${SHORTLIST_LIMIT}. Unpin one first.`);
    }
  };

  // Preview the compare set; with nothing pinned, the image on stage.
  const pinnedForPreview = previewable(shortlist).map((p) => p.url);
  const previewImages =
    pinnedForPreview.length > 0
      ? pinnedForPreview
      : active && active.aspectRatio !== '9:16'
        ? [active.url]
        : [];
  const previewDisabledReason =
    previewImages.length > 0
      ? null
      : active?.aspectRatio === '9:16'
        ? 'Shorts covers can’t be previewed'
        : 'Pin a 16:9 result first';

  const refineWithFeedback: CanvasRefine | undefined = refine && {
    ...refine,
    onSend: (text) => {
      setRefining(text);
      refine.onSend(text);
    },
  };

  const canvas = (
    <Canvas
      status={status}
      images={images}
      selectedUrl={selectedUrl}
      onSelect={setSelectedUrl}
      ratios={ratios}
      outputFormat={outputFormat}
      empty={empty}
      isGenerating={isGenerating}
      refining={refining}
      onVary={onVary}
      onEdit={onEdit}
      editLabel={editLabel}
      refine={refineWithFeedback}
      shortlist={shortlist}
      onTogglePin={handleTogglePin}
      loadedFrom={
        loadedFrom && { label: loadedFrom.label, onClear: clearLoaded }
      }
    />
  );

  const history = (
    <HistoryRail
      workflow={modeById(mode).workflow}
      activeId={loadedFrom?.id ?? null}
      onSelect={loadGeneration}
    />
  );

  return (
    <div className='flex flex-col lg:h-[calc(100svh-4rem)]'>
      <header className='mb-4 flex flex-wrap items-center gap-x-4 gap-y-3'>
        <div className='mr-auto flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2'>
          <h1 className='font-serif text-3xl tracking-tight'>Studio</h1>
          <ModeSwitcher mode={mode} />
          <p className='basis-full text-sm text-muted-foreground xl:basis-auto'>
            {description}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <CompareSet onPreview={() => setPreviewOpen(true)} />
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setPaletteOpen(true)}
            aria-label='Open command palette'
          >
            <CommandIcon className='size-4' />
            <span className='hidden sm:inline'>Commands</span>
            <Kbd className='hidden sm:inline-flex'>{mod} K</Kbd>
          </Button>
        </div>
      </header>

      {isDesktop ? (
        <div className='min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card'>
          <ResizablePanelGroup orientation='horizontal'>
            <ResizablePanel
              id='controls'
              defaultSize='30'
              minSize={320}
              maxSize='42'
            >
              {controls}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel id='canvas' minSize='36'>
              {canvas}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              id='history'
              defaultSize='18'
              minSize={200}
              maxSize='28'
            >
              {history}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        <div className='flex flex-col gap-4'>
          <div className='overflow-clip rounded-2xl border'>{controls}</div>
          <div className='overflow-hidden rounded-2xl border'>{canvas}</div>
          <div className='h-[22rem] overflow-hidden rounded-2xl border bg-card'>
            {history}
          </div>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        mode={mode}
        active={active}
        pinned={pinned}
        canGenerate={canGenerate}
        onGenerate={submitStudioForm}
        onVary={onVary}
        onTogglePin={() => active && handleTogglePin(active)}
        onOpenPreview={() => setPreviewOpen(true)}
        previewDisabledReason={previewDisabledReason}
      />

      {previewOpen && (
        <FeedPreview
          images={previewImages}
          title={previewTitle}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </div>
  );
};
