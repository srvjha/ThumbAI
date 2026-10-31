/**
 * Where the words on a thumbnail came from. A hook may shorten, reorder or
 * fix the spelling of the user's words, but every word must trace back to
 * the request: an invented "FAST" or "10 BEST" is a claim the user never
 * made. Used by the prompt writer to reject its own draft, and by the evals.
 */

/** Splits into lowercase word tokens, separating letters from digits ("5AM" → 5, am). */
export const tokens = (text: string): string[] =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/(\p{N})(\p{L})/gu, '$1 $2')
    .replace(/(\p{L})(\p{N})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const distance = (a: string, b: string): number => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = cur;
    }
  }
  return row[b.length];
};

/** Spellings a headline may use for a word the user wrote. */
const ALIASES: Record<string, string[]> = {
  vs: ['versus', 'v'],
  and: ['&'],
  k: ['thousand', '000'],
  m: ['million'],
};

/** Connectives a hook may add without adding an idea ("IRON MAN IN INDIA"). */
const GLUE = new Set([
  'a',
  'an',
  'the',
  'in',
  'on',
  'of',
  'to',
  'for',
  'at',
  'with',
  'and',
  'or',
  'vs',
  'is',
  'my',
  'your',
  'how',
  'why',
  'what',
]);

const stem = (w: string) => w.replace(/(es|s)$/, '');

/** True when a headline word can be traced to a word the user wrote. */
export const fromRequest = (
  word: string,
  requestWords: Set<string>,
): boolean => {
  if (requestWords.has(word) || GLUE.has(word)) return true;
  if (ALIASES[word]?.some((a) => requestWords.has(a))) return true;
  for (const r of requestWords) {
    if (stem(r) === stem(word)) return true;
    // Same word family: "SURVIVING" for "survival".
    const shared = [...word].findIndex((ch, i) => r[i] !== ch);
    const prefix = shared === -1 ? word.length : shared;
    if (prefix >= 5 && prefix >= 0.7 * Math.min(word.length, r.length))
      return true;
    // Abbreviation: "SUBS" for "subscribers", "DEV" for "developers".
    if (stem(word).length >= 3 && r.startsWith(stem(word))) return true;
    // Typo correction: "priniciples" → "PRINCIPLES".
    if (word.length >= 5 && r.length >= 4 && distance(word, r) <= 2)
      return true;
  }
  return false;
};

/** Headline (or tag line) words that appear nowhere in the request. */
export const inventedWords = (text: string, request: string): string[] => {
  // A request in another script may be transliterated ("पनीर" → "PANEER"),
  // which word matching cannot follow; the judge covers those.
  if (!/[a-z]/i.test(request)) return [];
  const words = new Set(tokens(request));
  // A headline may restyle numbers ("10,000" → "10K") and add punctuation.
  if (/\d/.test(request)) words.add('k');
  return tokens(text).filter((w) => !fromRequest(w, words));
};

/**
 * Text the user said goes on the image: 'Text on the thumbnail: "X"',
 * 'with the text "X"', 'write "X"', 'headline: "X"'. A quoted title is not.
 */
export const explicitText = (request: string): string | null => {
  const m = request.match(
    /(?:text(?: on (?:the|my) (?:thumbnail|image|cover))?|headline|write|yazı)\s*[:=]?\s*["“«]([^"”»]+)["”»]/i,
  );
  return m?.[1]?.trim() ?? null;
};
