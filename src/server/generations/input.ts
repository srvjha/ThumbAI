import 'server-only';
import { MODEL } from '@prisma/client';
import { ApiError } from '@/server/errors';

/**
 * Bounds on what a generation request may carry.
 *
 * Every one of these values is forwarded to a paid API — the prompt agent, the
 * image model, or both — so an unbounded field is a way to spend our money.
 */
export const MAX_PROMPT_CHARS = 4000;
export const MAX_CHOICES_CHARS = 4000;
export const MAX_URL_CHARS = 2048;

/**
 * Rejects an unknown workflow up front.
 *
 * It is written to an enum column only after credits are charged and the job
 * is queued at Fal. An invalid value used to fail that write, which refunded
 * the credits but not the Fal job — a loop that generated images for free.
 */
export const parseWorkflow = (value: unknown): MODEL | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  // Own keys only: `in` also matches inherited names like 'toString'.
  if (typeof value === 'string' && Object.hasOwn(MODEL, value)) {
    return value as MODEL;
  }
  throw new ApiError('Unknown workflow', 400);
};

export const assertPromptLength = (prompt: string): void => {
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new ApiError(
      `Prompt must be at most ${MAX_PROMPT_CHARS} characters`,
      400,
    );
  }
};

export const assertChoicesSize = (choices: unknown): void => {
  if (choices === undefined || choices === null || choices === '') return;
  if (JSON.stringify(choices).length > MAX_CHOICES_CHARS) {
    throw new ApiError('Style choices are too large', 400);
  }
};

/**
 * Checks the balance before any paid work starts.
 *
 * The real charge still happens atomically in deductCredits; this only stops
 * a user who cannot afford the request from running the prompt agent (or a
 * page fetch) on our account first.
 */
export const assertCanAfford = (credits: number, cost: number): void => {
  if (credits < cost) {
    throw new ApiError('Not enough credits', 402);
  }
};

export const assertImageUrls = (urls: unknown[]): string[] =>
  urls.map((url) => {
    if (typeof url !== 'string' || url.length > MAX_URL_CHARS) {
      throw new ApiError('images_urls must be a list of URLs', 400);
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ApiError('images_urls must be a list of URLs', 400);
    }
    if (parsed.protocol !== 'https:') {
      throw new ApiError('Reference images must be https URLs', 400);
    }
    return url;
  });
