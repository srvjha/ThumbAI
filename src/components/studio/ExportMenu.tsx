'use client';

import toast from 'react-hot-toast';
import { downloadImage, type ImageData } from '../shared/imageUtils';

export const EXPORT_SIZES = [
  { id: 'youtube', label: 'YouTube thumbnail', w: 1280, h: 720 },
  { id: 'hd', label: 'HD', w: 1920, h: 1080 },
  { id: 'shorts', label: 'Shorts cover', w: 1080, h: 1920 },
  { id: 'og', label: 'Blog / social card', w: 1200, h: 630 },
] as const;

export type ExportSize = (typeof EXPORT_SIZES)[number];

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
