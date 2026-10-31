/**
 * Property checks that hold for any request, so they scale past the cases
 * someone thought to write. Each returns null when it passes, or a short
 * reason when it fails.
 */

import { explicitText, inventedWords } from '@/server/prompts/textOrigin';

export {
  explicitText,
  inventedWords,
  tokens,
  fromRequest,
} from '@/server/prompts/textOrigin';

export interface CheckInput {
  /** What the writer was briefed with (the article text for blog covers). */
  request: string;
  /** The assembled image prompt. */
  prompt: string;
  headline: string | null | undefined;
  hasPhoto: boolean;
  /** The user asked not to appear. */
  faceNone: boolean;
}

export type CheckResult = { name: string; failure: string | null };

/** The tag line the prompt quotes, when it has one. */
export const quotedTagline = (prompt: string): string | null =>
  prompt.match(/tag line "([^"]*)"/)?.[1] ?? null;

/** True when the text, quoted any common way, appears in the passage. */
const quotes = (passage: string, text: string) => {
  const p = passage.toLowerCase();
  const t = text.toLowerCase();
  return ['"', "'", '“'].some((q) =>
    p.includes(`${q}${t}${q === '“' ? '”' : q}`),
  );
};

/** The writer's scene: the prompt before the fixed person and text clauses. */
export const scenePart = (prompt: string): string => {
  const markers = [
    'The only lettering in the image',
    'The image is purely visual',
    'Text (EXACT',
    'Text: none',
    'Use the person in the',
    'Person: Use',
  ];
  const cut = Math.min(
    ...markers.map((m) => prompt.indexOf(m)).filter((i) => i >= 0),
    prompt.length,
  );
  return prompt.slice(0, cut).replace(/^Purpose:[\s\S]*?\n\nImage: /, '');
};

const count = (haystack: string, needle: string) =>
  needle ? haystack.split(`"${needle}"`).length - 1 : 0;

export const runChecks = (c: CheckInput): CheckResult[] => {
  const headline = c.headline?.trim() || null;
  const tagline = quotedTagline(c.prompt);
  const scene = scenePart(c.prompt);
  const given = explicitText(c.request);
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

  const check = (
    name: string,
    failure: string | null | false,
  ): CheckResult => ({
    name,
    failure: failure || null,
  });

  return [
    check(
      'no-category-leak',
      /category\s*:/i.test(c.prompt) && 'prompt contains "category:"',
    ),
    check(
      'explicit-text-exact',
      given !== null &&
        headline !== given &&
        `user gave "${given}", headline is ${headline ? `"${headline}"` : 'none'}`,
    ),
    check(
      'headline-from-request',
      headline !== null &&
        given === null &&
        inventedWords(headline, c.request).length > 0 &&
        `invented: ${inventedWords(headline, c.request).join(', ')}`,
    ),
    check(
      'headline-length',
      headline !== null && words(headline) > 5 && `${words(headline)} words`,
    ),
    check(
      'tagline-from-request',
      tagline !== null &&
        inventedWords(tagline, c.request).length > 0 &&
        `invented: ${inventedWords(tagline, c.request).join(', ')}`,
    ),
    check(
      'tagline-length',
      tagline !== null && words(tagline) > 4 && `${words(tagline)} words`,
    ),
    check(
      'headline-quoted-once',
      headline !== null &&
        count(c.prompt, headline) !== 1 &&
        `quoted ${count(c.prompt, headline)} times`,
    ),
    check(
      'tagline-quoted-once',
      tagline !== null &&
        count(c.prompt, tagline) !== 1 &&
        `quoted ${count(c.prompt, tagline)} times`,
    ),
    check(
      'tagline-is-text',
      tagline !== null &&
        (!/[\p{L}\p{N}]/u.test(tagline) || /\bnull\b/i.test(tagline)) &&
        `tag line is "${tagline}"`,
    ),
    // The image model renders quoted words, so a quote in the scene is a
    // second copy of the lettering.
    check(
      'text-not-in-scene',
      [headline, tagline].some((t) => t && quotes(scene, t)) &&
        'scene quotes the lettering',
    ),
    check(
      'face-clause',
      c.hasPhoto &&
        !c.faceNone &&
        !c.prompt.includes('completely unchanged') &&
        'photo attached but no face clause',
    ),
    check(
      'no-face-when-declined',
      c.hasPhoto &&
        c.faceNone &&
        c.prompt.includes('Use the person in the') &&
        'user declined but face clause present',
    ),
  ];
};
