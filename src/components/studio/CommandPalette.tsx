'use client';

import { useRouter } from 'next/navigation';
import {
  Eye,
  FileDown,
  FileText,
  History,
  ImagePlus,
  LayoutGrid,
  Pin,
  Shuffle,
  Type,
  Wand2,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../ui/command';
import type { ImageData } from '../shared/imageUtils';
import { EXPORT_SIZES, exportImage } from './ExportMenu';
import { STUDIO_MODES, type StudioMode } from './modes';

const MODE_ICONS: Record<StudioMode, typeof Type> = {
  text: Type,
  image: ImagePlus,
  blog: FileText,
};

/** ⌘K: every studio action, reachable from the keyboard. */
export const CommandPalette = ({
  open,
  onOpenChange,
  mode,
  active,
  pinned,
  canGenerate,
  onGenerate,
  onVary,
  onTogglePin,
  onOpenPreview,
  onOpenHistory,
  previewDisabledReason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StudioMode;
  active: ImageData | null;
  pinned: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onVary?: () => void;
  onTogglePin: () => void;
  onOpenPreview: () => void;
  onOpenHistory: () => void;
  previewDisabledReason: string | null;
}) => {
  const router = useRouter();

  // Close first so the dialog's focus return doesn't fight the action.
  const run = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Studio commands'
      description='Search for an action to run'
    >
      <CommandInput placeholder='Type a command…' />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>
        <CommandGroup heading='Create'>
          <CommandItem disabled={!canGenerate} onSelect={run(onGenerate)}>
            <Wand2 />
            Generate
            <CommandShortcut>⌘↵</CommandShortcut>
          </CommandItem>
          {onVary && (
            <CommandItem disabled={!active} onSelect={run(onVary)}>
              <Shuffle />
              Vary the current result
            </CommandItem>
          )}
        </CommandGroup>

        {active && (
          <>
            <CommandSeparator />
            <CommandGroup heading='Current image'>
              <CommandItem onSelect={run(onTogglePin)}>
                <Pin />
                {pinned ? 'Unpin from compare set' : 'Pin to compare set'}
              </CommandItem>
              {EXPORT_SIZES.map((size) => (
                <CommandItem
                  key={size.id}
                  value={`export ${size.label} ${size.w}x${size.h}`}
                  onSelect={run(() => exportImage(active, size))}
                >
                  <FileDown />
                  Export {size.label}
                  <CommandShortcut className='tracking-normal tabular-nums'>
                    {size.w}×{size.h}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading='Compare'>
          <CommandItem
            disabled={!!previewDisabledReason}
            onSelect={run(onOpenPreview)}
          >
            <Eye />
            Preview in feed
            {previewDisabledReason && (
              <span className='ml-auto text-xs text-muted-foreground'>
                {previewDisabledReason}
              </span>
            )}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading='Go to'>
          {STUDIO_MODES.filter((m) => m.id !== mode).map((m) => {
            const Icon = MODE_ICONS[m.id];
            return (
              <CommandItem
                key={m.id}
                value={`switch to ${m.label} mode`}
                onSelect={run(() => router.push(m.href))}
              >
                <Icon />
                Switch to {m.label} mode
              </CommandItem>
            );
          })}
          <CommandItem onSelect={run(onOpenHistory)}>
            <History />
            Open history
          </CommandItem>
          <CommandItem onSelect={run(() => router.push('/dashboard'))}>
            <LayoutGrid />
            Open library
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
