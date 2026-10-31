import 'server-only';
import { OpenAI } from 'openai';
import { FLAG_SEVERITY, FLAG_SOURCE } from '@prisma/client';
import { db } from '@/db';

/**
 * Screens prompts and records a PromptFlag for anything worth an admin's
 * look. Only the kind of problem is stored, never the prompt itself.
 *
 * Two checks: OpenAI's moderation model for harmful content, and a pattern
 * check for attempts to subvert the prompt agent or smuggle code through it.
 */

/** Pattern groups for attacks on the prompt agent or on us. */
const INJECTION_RULES: { category: string; patterns: RegExp[] }[] = [
  {
    category: 'prompt_injection',
    patterns: [
      /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|system|your)\b[^.\n]{0,20}\b(instructions?|prompts?|rules?|guidelines?)/i,
      /\byou are (now|no longer)\b/i,
      /\b(jailbreak|DAN mode|developer mode|god mode)\b/i,
      /\bact as (an? )?(unfiltered|uncensored|unrestricted)\b/i,
      /<\/?(system|assistant|instructions?)>|\[\/?(INST|SYS)\]|<\|im_(start|end)\|>/i,
    ],
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
}

/** The injection check alone. Pure, so it is cheap and testable. */
export const detectInjection = (text: string): Detection | null => {
  const categories = INJECTION_RULES.filter(({ patterns }) =>
    patterns.some((re) => re.test(text)),
  ).map(({ category }) => category);
  if (categories.length === 0) return null;
  const serious = categories.some((c) => c !== 'prompt_leak');
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
  return { source: FLAG_SOURCE.MODERATION, categories, score, severity };
};

let client: OpenAI | null = null;

const moderate = async (text: string): Promise<Detection | null> => {
  client ??= new OpenAI();
  const res = await client.moderations.create({
    model: 'omni-moderation-latest',
    input: text.slice(0, 8000),
  });
  const [result] = res.results;
  return result ? fromModeration(result) : null;
};

/**
 * Checks one prompt and records whatever it trips. Never throws: screening
 * runs after the response and must not affect the generation.
 */
export const screenPrompt = async ({
  userId,
  text,
  thumbnailId,
}: {
  userId: string;
  text: unknown;
  thumbnailId?: string | null;
}) => {
  if (typeof text !== 'string' || !text.trim()) return;
  const detections: Detection[] = [];

  const injection = detectInjection(text);
  if (injection) detections.push(injection);

  try {
    const moderation = await moderate(text);
    if (moderation) detections.push(moderation);
  } catch (err) {
    console.error('[moderation] check failed', err);
  }

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
