import 'server-only';
import { OpenAI } from 'openai';
import { FLAG_SEVERITY, FLAG_SOURCE } from '@prisma/client';
import { db } from '@/db';
import { env } from '@/config/env';
import { ApiError } from '@/server/errors';

/**
 * Screens a request before anything is charged or generated, and records a
 * PromptFlag for anything worth an admin's look. Only the kind of problem is
 * stored, never the prompt itself.
 *
 * Two checks: OpenAI's moderation model for harmful text and images, and a
 * pattern check for attempts to subvert the prompt agent or smuggle code
 * through it. Clear violations are refused; the rest is only flagged, because
 * thumbnail titles legitimately say things like "you are now a millionaire".
 */

/** Pattern groups for attacks on the prompt agent or on us. */
const INJECTION_RULES: { category: string; patterns: RegExp[] }[] = [
  {
    category: 'prompt_injection',
    patterns: [
      /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|system|your)\b[^.\n]{0,20}\b(instructions?|prompts?|rules?|guidelines?)/i,
      /\b(jailbreak|DAN mode|developer mode|god mode)\b/i,
      /\bact as (an? )?(unfiltered|uncensored|unrestricted)\b/i,
      /<\/?(system|assistant|instructions?)>|\[\/?(INST|SYS)\]|<\|im_(start|end)\|>/i,
    ],
  },
  {
    category: 'role_override',
    patterns: [/\byou are (now|no longer)\b/i],
  },
  {
    category: 'prompt_leak',
    patterns: [
      /\b(reveal|show|print|repeat|output|leak)\b[^.\n]{0,30}\b(system prompt|instructions|hidden prompt|initial prompt)/i,
      /\bwhat (are|were) your (instructions|rules)\b/i,
    ],
  },
  {
    category: 'code_injection',
    patterns: [
      /<script\b|javascript:|onerror\s*=|onload\s*=/i,
      /\{\{.*\}\}|\$\{.*\}/,
      /\b(rm -rf|curl\s+https?:|wget\s+https?:|eval\(|exec\()/i,
    ],
  },
  {
    category: 'sql_injection',
    patterns: [
      /('|")\s*(or|and)\s+('?\d+'?\s*=\s*'?\d+|'[^']*'\s*=\s*')/i,
      /;\s*(drop|delete|truncate|alter|insert|update)\s+(table|from|into)?\b/i,
      /\bunion\s+(all\s+)?select\b/i,
    ],
  },
];

export interface Detection {
  source: FLAG_SOURCE;
  categories: string[];
  score: number | null;
  severity: FLAG_SEVERITY;
  /** Refused outright, rather than only flagged for a look. */
  blocked: boolean;
}

/** Shown to the user when a request is refused. */
export const BLOCKED_MESSAGE =
  'This request breaks our acceptable use policy, so it was not generated and no credits were charged. Repeated attempts can get your account banned.';

/** The injection check alone. Pure, so it is cheap and testable. */
export const detectInjection = (text: string): Detection | null => {
  const categories = INJECTION_RULES.filter(({ patterns }) =>
    patterns.some((re) => re.test(text)),
  ).map(({ category }) => category);
  if (categories.length === 0) return null;
  const serious = categories.some(
    (c) => c !== 'prompt_leak' && c !== 'role_override',
  );
  return {
    source: FLAG_SOURCE.INJECTION,
    categories,
    score: null,
    severity:
      categories.length > 1
        ? FLAG_SEVERITY.HIGH
        : serious
          ? FLAG_SEVERITY.MEDIUM
          : FLAG_SEVERITY.LOW,
    // Telling the agent to drop its rules is never a thumbnail brief. The
    // others need a second signal: a coding video can mention curl.
    blocked: categories.includes('prompt_injection') || categories.length > 1,
  };
};

/** Moderation categories that are never borderline. */
const SEVERE = new Set([
  'sexual/minors',
  'self-harm/instructions',
  'illicit/violent',
  'hate/threatening',
  'violence/graphic',
]);

/** What we refuse to generate when the model flags it. */
const BLOCKED_CONTENT = new Set([
  ...SEVERE,
  'sexual',
  'hate',
  'harassment/threatening',
  'violence/graphic',
]);

/** Below the model's own threshold but high enough to keep an eye on. */
const WATCH_SCORE = 0.5;

/**
 * Turns a moderation result into a detection, or null when it is clean.
 * Exported for tests; the shape is OpenAI's Moderation object.
 */
export const fromModeration = (result: {
  flagged: boolean;
  categories: object;
  category_scores: object;
}): Detection | null => {
  const flags = result.categories as Record<string, boolean>;
  const scores = result.category_scores as Record<string, number>;
  const categories = Object.keys(flags).filter(
    (key) => flags[key] || (scores[key] ?? 0) >= WATCH_SCORE,
  );
  if (categories.length === 0) return null;
  const score = Math.max(...categories.map((key) => scores[key] ?? 0));
  const severity = categories.some((c) => SEVERE.has(c) && flags[c])
    ? FLAG_SEVERITY.HIGH
    : score >= 0.9
      ? FLAG_SEVERITY.HIGH
      : result.flagged
        ? FLAG_SEVERITY.MEDIUM
        : FLAG_SEVERITY.LOW;
  const blocked = categories.some((c) => BLOCKED_CONTENT.has(c) && flags[c]);
  return {
    source: FLAG_SOURCE.MODERATION,
    categories,
    score,
    severity,
    blocked,
  };
};

let client: OpenAI | null = null;

const moderate = async (
  input: OpenAI.Moderations.ModerationCreateParams['input'],
): Promise<Detection | null> => {
  client ??= new OpenAI();
  const res = await client.moderations.create({
    model: 'omni-moderation-latest',
    input,
  });
  const [result] = res.results;
  return result ? fromModeration(result) : null;
};

/** Largest image we will pull down to screen. Uploads are capped below this. */
const MAX_SCREEN_BYTES = 12 * 1024 * 1024;

/** Where uploads and renders live. Nothing else is fetched from the server. */
const isFalHost = (url: URL): boolean =>
  url.protocol === 'https:' &&
  (url.hostname === 'fal.media' || url.hostname.endsWith('.fal.media'));

/**
 * The image inline, for the moderation model. Sent by URL, the model's own
 * download fails on some hosts, and a failed check would let the image through.
 * Null when it cannot be read as an image, which counts as a failed check.
 */
const inlineImage = async (raw: string): Promise<string | null> => {
  const url = new URL(raw);
  if (!isFalHost(url)) return null;
  const res = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('image/')) return null;
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_SCREEN_BYTES) return null;
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
};

const moderateImage = async (raw: string): Promise<Detection | null> => {
  const url = await inlineImage(raw);
  if (!url) {
    console.error('[moderation] image not screened', new URL(raw).hostname);
    return null;
  }
  return moderate([{ type: 'image_url', image_url: { url } }]);
};

const screenableImages = (urls: unknown): string[] =>
  Array.isArray(urls)
    ? urls.filter((url): url is string => {
        if (typeof url !== 'string') return false;
        return URL.canParse(url);
      })
    : [];

/**
 * Runs both checks on a prompt and its images. If the moderation model is
 * unreachable the request goes through unscreened: an OpenAI outage should not
 * take the studio down. The pattern check still runs.
 */
export const screenRequest = async ({
  text,
  imageUrls,
}: {
  text: unknown;
  imageUrls?: unknown;
}): Promise<Detection[]> => {
  const prompt = typeof text === 'string' ? text.trim() : '';
  const checks: Promise<Detection | null>[] =
    screenableImages(imageUrls).map(moderateImage);
  if (prompt) checks.push(moderate(prompt.slice(0, 8000)));

  const results = await Promise.allSettled(checks);
  const detections: Detection[] = [];
  const injection = prompt ? detectInjection(prompt) : null;
  if (injection) detections.push(injection);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[moderation] check failed', result.reason);
    } else if (result.value) {
      detections.push(result.value);
    }
  }
  return detections;
};

/** Never throws: a failed write must not change the outcome of a request. */
export const recordFlags = async (
  userId: string,
  detections: Detection[],
  thumbnailId?: string | null,
) => {
  if (detections.length === 0) return;
  try {
    await db.promptFlag.createMany({
      data: detections.map((d) => ({
        user_id: userId,
        thumbnail_id: thumbnailId ?? null,
        source: d.source,
        categories: d.categories,
        score: d.score,
        severity: d.severity,
      })),
    });
  } catch (err) {
    console.error('[moderation] flag not recorded', err);
  }
};

/**
 * Posts a blocked request to ADMIN_ALERT_WEBHOOK_URL. Slack reads `text` and
 * Discord reads `content`. Never includes the prompt. Never throws.
 */
const alertAdmin = async (
  user: { id: string; email: string },
  detections: Detection[],
) => {
  const url = env.ADMIN_ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    const openFlags = await db.promptFlag.count({
      where: { user_id: user.id, resolved_at: null },
    });
    const categories = [...new Set(detections.flatMap((d) => d.categories))];
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thumbai.app';
    const message = `ThumbAI blocked a request from ${user.email}: ${categories.join(', ')}. Open flags: ${openFlags}. ${site}/admin/users/${user.id}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, content: message }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) console.error('[moderation] alert refused', res.status);
  } catch (err) {
    console.error('[moderation] alert failed', err);
  }
};

/**
 * The gate in front of every generation. A clear violation is recorded, sent
 * to the admin and refused here, before any credit or model is touched.
 * Otherwise it returns what to record once the generation exists.
 */
export const guardRequest = async (
  user: { id: string; email: string },
  body: { prompt?: unknown; images_urls?: unknown } | null | undefined,
): Promise<Detection[]> => {
  const detections = await screenRequest({
    text: body?.prompt,
    imageUrls: body?.images_urls,
  });
  if (detections.some((d) => d.blocked)) {
    await recordFlags(user.id, detections);
    await alertAdmin(user, detections);
    throw new ApiError(BLOCKED_MESSAGE, 422);
  }
  return detections;
};
