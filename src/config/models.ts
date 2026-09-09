/**
 * Image model registry — the single source of truth for which Fal endpoint we
 * call, what it costs, and how app-level options map onto its input schema.
 *
 * The tiers do not share a request shape (gpt-image-2 takes an `image_size`
 * object, the nano-banana family takes `aspect_ratio` + `resolution`), so each
 * definition owns that translation. Swapping a model is then a change here
 * rather than a hunt for endpoint strings across route handlers.
 *
 * Schemas verified against the live queue OpenAPI documents.
 */

import { DESIGN_SYSTEM_PROMPT } from '@/utils/instructions/shared';

export type ModelTier = 'draft' | 'quality';

export type AspectRatio = '16:9' | '9:16';

export type OutputFormat = 'jpeg' | 'png' | 'webp';

export interface ModelInputOptions {
  prompt: string;
  aspectRatio: AspectRatio;
  numImages: number;
  outputFormat: OutputFormat;
  /** Reference images, for editing endpoints. */
  imageUrls?: string[];
  /**
   * Fixing the seed makes a generation reproducible, which is what lets a
   * prompt change be evaluated against a like-for-like baseline instead of a
   * fresh random draw. Also powers "make a variation".
   */
  seed?: number;
  /**
   * Grounds the render in web search. Worth it when the image contains
   * something that has to be factually right — an architecture diagram, a
   * real product, a logo — and wasteful otherwise.
   */
  enableWebSearch?: boolean;
}

export interface ModelDefinition {
  endpointId: string;
  label: string;
  description: string;
  /** App credits charged per generated image. */
  creditsPerImage: number;
  /** Approximate Fal cost per image, in USD. For budgeting and admin views. */
  usdPerImage: number;
  /**
   * Whether the endpoint accepts a seed. gpt-image-2 does not, so Draft
   * generations cannot be reproduced or re-rolled deterministically.
   */
  supportsSeed: boolean;
  /** Whether the endpoint can ground the render in web search. */
  supportsWebSearch: boolean;
  buildInput: (options: ModelInputOptions) => Record<string, unknown>;
}

/**
 * gpt-image-2 requires concrete sizes to be multiples of 16 with total pixels
 * between 655,360 and 8,294,400. 1280x720 and 720x1280 satisfy that and are
 * exactly 16:9 / 9:16 — they are also YouTube's own thumbnail and Shorts
 * dimensions, so no re-cropping is needed downstream.
 */
const GPT_IMAGE_SIZES: Record<AspectRatio, { width: number; height: number }> =
  {
    '16:9': { width: 1280, height: 720 },
    '9:16': { width: 720, height: 1280 },
  };

const draftModel: ModelDefinition = {
  endpointId: 'openai/gpt-image-2',
  label: 'Draft',
  description: 'Fast, strong text rendering. Best value per image.',
  creditsPerImage: 1,
  usdPerImage: 0.04,
  supportsSeed: false,
  supportsWebSearch: false,
  buildInput: ({ prompt, aspectRatio, numImages, outputFormat }) => ({
    // gpt-image-2 exposes no system_prompt field, so the invariant rules are
    // prepended. It also has no seed or web-search parameter — those are
    // silently unavailable on this tier, which is a reason to prefer Quality
    // when reproducibility or factual accuracy matters.
    prompt: `${DESIGN_SYSTEM_PROMPT}\n\n---\n\n${prompt}`,
    image_size: GPT_IMAGE_SIZES[aspectRatio],
    // 'high' costs ~4x 'medium'. Text renders cleanly at medium in practice,
    // which is the only part of the difference that survives downscaling.
    quality: 'medium',
    num_images: numImages,
    output_format: outputFormat,
  }),
};

const qualityModel: ModelDefinition = {
  endpointId: 'fal-ai/nano-banana-pro',
  label: 'Quality',
  description: 'Sharpest typography and face consistency. Slower.',
  creditsPerImage: 3,
  usdPerImage: 0.15,
  supportsSeed: true,
  supportsWebSearch: true,
  buildInput: ({
    prompt,
    aspectRatio,
    numImages,
    outputFormat,
    seed,
    enableWebSearch,
  }) => ({
    prompt,
    system_prompt: DESIGN_SYSTEM_PROMPT,
    aspect_ratio: aspectRatio,
    resolution: '2K',
    num_images: numImages,
    output_format: outputFormat,
    enable_web_search: enableWebSearch ?? false,
    ...(seed === undefined ? {} : { seed }),
  }),
};

export const TEXT_TO_IMAGE_MODELS: Record<ModelTier, ModelDefinition> = {
  draft: draftModel,
  quality: qualityModel,
};

/**
 * Editing runs on nano-banana-2/edit regardless of tier: it accepts up to 14
 * reference images and preserves the subject's identity, which is the whole
 * point of the image-to-image workflow.
 */
export const EDIT_MODEL: ModelDefinition = {
  endpointId: 'fal-ai/nano-banana-2/edit',
  label: 'Edit',
  description: 'Edits and composites up to 14 reference images.',
  creditsPerImage: 2,
  usdPerImage: 0.08,
  supportsSeed: true,
  supportsWebSearch: true,
  buildInput: ({
    prompt,
    aspectRatio,
    numImages,
    outputFormat,
    imageUrls = [],
    seed,
    enableWebSearch,
  }) => ({
    prompt,
    system_prompt: DESIGN_SYSTEM_PROMPT,
    image_urls: imageUrls,
    aspect_ratio: aspectRatio,
    resolution: '1K',
    num_images: numImages,
    output_format: outputFormat,
    // Reason about the composition before rendering. Editing has to respect
    // an existing subject, which is exactly where planning pays off.
    thinking_level: 'high',
    enable_web_search: enableWebSearch ?? false,
    ...(seed === undefined ? {} : { seed }),
  }),
};

export const DEFAULT_TIER: ModelTier = 'draft';

export const isModelTier = (value: unknown): value is ModelTier =>
  value === 'draft' || value === 'quality';

export const resolveTier = (value: unknown): ModelTier =>
  isModelTier(value) ? value : DEFAULT_TIER;

export const getTextToImageModel = (tier: unknown): ModelDefinition =>
  TEXT_TO_IMAGE_MODELS[resolveTier(tier)];

export const ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16'];

export const isAspectRatio = (value: unknown): value is AspectRatio =>
  value === '16:9' || value === '9:16';

export const OUTPUT_FORMATS: OutputFormat[] = ['jpeg', 'png', 'webp'];

export const isOutputFormat = (value: unknown): value is OutputFormat =>
  value === 'jpeg' || value === 'png' || value === 'webp';

export const MAX_IMAGES_PER_REQUEST = 4;

/** Fal seeds are 32-bit unsigned integers. */
export const MAX_SEED = 2 ** 32 - 1;

export const isValidSeed = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_SEED;

/**
 * Chosen here rather than left to the provider, because a seed we did not pick
 * is a seed we cannot record — and an unrecorded seed cannot be reused to make
 * a variation or to re-run an eval.
 */
export const randomSeed = (): number =>
  Math.floor(Math.random() * (MAX_SEED + 1));

/**
 * Model used for prompt authoring (not image generation).
 *
 * Kept in one place so it can be bumped without touching agent files. The
 * default is deliberately conservative: gpt-4.1 is a known-good id and an
 * upgrade on the gpt-4o-mini / gpt-4.1-mini this code used before.
 *
 * Newer families (GPT-5.x, GPT-6) are available and would likely write better
 * design prompts — set OPENAI_PROMPT_MODEL to one once you have confirmed the
 * exact id against your account's /v1/models listing.
 */
export const PROMPT_MODEL = process.env.OPENAI_PROMPT_MODEL ?? 'gpt-4.1';
