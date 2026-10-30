/**
 * Wire shapes for /api/me/generations and /api/me/analytics. Shared by the
 * route handlers and the client hooks so the two cannot drift apart.
 */

export type Workflow = 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE' | 'URL_TO_IMAGE';
export type Tier = 'DRAFT' | 'QUALITY';
export type GenerationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED';

export interface GenerationItem {
  id: string;
  prompt: string;
  image_url: string[];
  status: GenerationStatus;
  model_used: Workflow | null;
  model_tier: Tier | null;
  aspect_ratio: string | null;
  num_of_images: number | null;
  createdAt: string;
}

export interface GenerationDetail extends GenerationItem {
  enhanced_prompt: string;
  seed: number | null;
  content_type: string | null;
  /** Estimated from the model's per-image price; spend isn't stored per row. */
  estimated_credits: number;
}

export interface GenerationsPage {
  items: GenerationItem[];
  nextCursor: string | null;
}

/** 'PENDING' matches both queued and in-progress rows. */
export type StatusFilter = 'COMPLETED' | 'FAILED' | 'PENDING';

export interface GenerationFilters {
  workflow?: Workflow;
  status?: StatusFilter;
  aspect_ratio?: string;
  q?: string;
}

export type AnalyticsRange = '7d' | '30d' | '90d' | 'all' | 'mtd';

export interface SeriesPoint {
  /** Local date (YYYY-MM-DD) the bucket starts on. */
  date: string;
  generations: number;
  images: number;
  failed: number;
  creditsSpent: number;
  creditsPurchased: number;
}

export interface BreakdownRow {
  key: string;
  generations: number;
  images: number;
  credits: number;
}

export interface AnalyticsData {
  range: AnalyticsRange;
  from: string | null;
  to: string;
  granularity: 'day' | 'week';
  totals: {
    generations: number;
    images: number;
    completed: number;
    failed: number;
    pending: number;
    /** completed / (completed + failed); null when nothing has finished. */
    successRate: number | null;
    /** Estimate — see estimateCredits() in the analytics route. */
    creditsSpent: number;
    creditsPurchased: number;
    ordersPaid: number;
    balance: number;
  };
  series: SeriesPoint[];
  byWorkflow: BreakdownRow[];
  byTier: BreakdownRow[];
  byAspectRatio: BreakdownRow[];
  /** [weekday 0=Mon..6=Sun][hour 0..23] generation counts, local time. */
  heatmap: number[][];
  recent: GenerationItem[];
}
