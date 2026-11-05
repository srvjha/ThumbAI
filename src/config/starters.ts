/**
 * The ready-made prompts behind the landing page's "kind of video" cards. A
 * link carries only the id, so a crafted URL cannot put arbitrary words in
 * someone's prompt box. Nothing here generates anything: the prompt is filled
 * in and the visitor still presses send, because sending spends credits.
 */
const STARTER_PROMPTS = {
  coding:
    'Coding tutorial, build an API in 15 minutes. Developer pointing at a glowing laptop, title “API in 15 min”.',
  recipe:
    'Weeknight ramen, ready in ten minutes. A steaming bowl with a soft egg, title “10 min ramen”.',
  travel:
    'Travel vlog, a weekend in Lisbon. Leaning out of a yellow tram on a steep street at sunset, title “48 hours in Lisbon”.',
  review:
    'Honest review of $399 headphones. Sceptical reviewer holding green headphones, title “Worth $399?”.',
  gaming:
    'Survival series, day 100 in the frozen north. Explorer on an icy cliff under an aurora, title “Day 100”.',
  podcast:
    'Podcast episode, we changed our minds on remote work. Two hosts at microphones, one laughing and one doubtful, title “We were wrong”.',
} as const;

export type StarterId = keyof typeof STARTER_PROMPTS;

/** Carries the starter through sign-in, which drops the URL's query string. */
export const STARTER_COOKIE = 'thumbai_starter';

export const starterHref = (id: StarterId): string =>
  `/studio/text-to-image?starter=${id}`;

/** The prompt for an id from a URL or cookie; null for anything unknown. */
export const starterPrompt = (id: string | null | undefined): string | null =>
  id && Object.hasOwn(STARTER_PROMPTS, id)
    ? STARTER_PROMPTS[id as StarterId]
    : null;
