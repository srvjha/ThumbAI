'use client';

import { ChevronDown, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { downloadImage, type ImageData } from '../shared/imageUtils';

export const EXPORT_SIZES = [
  { id: 'youtube', label: 'YouTube thumbnail', w: 1280, h: 720 },
  { id: 'hd', label: 'HD', w: 1920, h: 1080 },
  { id: 'shorts', label: 'Shorts cover', w: 1080, h: 1920 },
  { id: 'og', label: 'Blog / social card', w: 1200, h: 630 },
] as const;

export type ExportSize = (typeof EXPORT_SIZES)[number];

/** True when the target shape differs enough that /api/resize will crop. */
const crops = (image: ImageData, size: ExportSize) => {
  const source = image.aspectRatio === '9:16' ? 9 / 16 : 16 / 9;
  return Math.abs(source - size.w / size.h) > 0.05;
};

/** Resizes server side (fit: cover) and downloads the JPEG. */
export const exportImage = async (image: ImageData, size: ExportSize) => {
  const id = `export-${size.id}`;
  try {
    toast.loading(`Exporting ${size.w}×${size.h}…`, { id });
    const src = `/api/resize?url=${encodeURIComponent(image.url)}&w=${size.w}&h=${size.h}`;
    await downloadImage(src, `thumbai-${size.id}-${size.w}x${size.h}.jpg`);
    toast.success(`Exported ${size.w}×${size.h}`, { id });
  } catch {
    toast.error('Export failed. Try the original download instead.', { id });
  }
};

export const ExportMenu = ({ image }: { image: ImageData }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button type='button' variant='outline' size='sm'>
        <FileDown className='size-4' />
        Export
        <ChevronDown className='size-3.5 text-muted-foreground' />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align='end' className='w-64'>
      <DropdownMenuLabel className='text-xs font-normal text-muted-foreground'>
        Resized JPEG, cropped to fill
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {EXPORT_SIZES.map((size) => (
        <DropdownMenuItem
          key={size.id}
          onSelect={() => exportImage(image, size)}
          className='flex items-baseline justify-between gap-3'
        >
          <span>
            {size.label}
            {crops(image, size) && (
              <span className='block text-[11px] text-muted-foreground'>
                Crops this {image.aspectRatio} image
              </span>
            )}
          </span>
          <span className='text-xs tabular-nums text-muted-foreground'>
            {size.w}×{size.h}
          </span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
