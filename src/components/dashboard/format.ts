import type { GenerationStatus, Workflow } from './types';

export const WORKFLOW_LABELS: Record<string, string> = {
  TEXT_TO_IMAGE: 'Text to image',
  IMAGE_TO_IMAGE: 'Image to image',
  URL_TO_IMAGE: 'Blog cover',
  UNKNOWN: 'Unknown',
};

export const TIER_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  QUALITY: 'Quality',
  EDIT: 'Edit model',
  UNKNOWN: 'Unknown',
};

export const ASPECT_LABELS: Record<string, string> = {
  '16:9': '16:9 thumbnail',
  '9:16': '9:16 Shorts',
  UNKNOWN: 'Unknown',
};

export const STUDIO_ROUTES: Record<Workflow, string> = {
  TEXT_TO_IMAGE: '/studio/text-to-image',
  IMAGE_TO_IMAGE: '/studio/image-to-image',
  URL_TO_IMAGE: '/studio/blog-cover',
};

export const studioRouteFor = (workflow: Workflow | null) =>
  workflow ? STUDIO_ROUTES[workflow] : STUDIO_ROUTES.TEXT_TO_IMAGE;

export const isRunning = (status: GenerationStatus) =>
  status === 'PENDING' || status === 'IN_PROGRESS';

const numberFormat = new Intl.NumberFormat('en-US');
const compactFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** In full under 10,000, compact above. */
export const formatCount = (value: number) =>
  Math.abs(value) < 10_000
    ? numberFormat.format(value)
    : compactFormat.format(value);

export const formatPercent = (value: number | null) =>
  value === null ? '—' : `${Math.round(value * 1000) / 10}%`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const formatRelative = (iso: string) => {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86_400) {
    return relative.format(Math.round(seconds / 86_400), 'day');
  }
  return formatDate(iso);
};

/** A YYYY-MM-DD bucket key, read as a calendar date (no timezone shift). */
export const formatBucket = (date: string, withYear = false) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...(withYear ? { year: 'numeric' } : {}),
  });
