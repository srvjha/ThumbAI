/**
 * What ThumbAI knows about thumbnail design, one recipe per archetype.
 *
 * The prompt pipeline never sends this whole file anywhere. The classifier
 * sees only each archetype's `signals` line to pick one; the writer then sees
 * only that archetype's `recipe`. Adding an archetype therefore costs the
 * classifier one line and costs every other request nothing.
 *
 * Recipes are distilled from YouTube's own thumbnail guidance
 * (support.google.com/youtube/answer/12340300), vidIQ's 2026 study of 500
 * breakout videos, and 1of10's archetype breakdowns. They describe a
 * default, not a law: anything the user asks for overrides them.
 */

export interface Archetype {
  label: string;
  /** One line for the classifier: what in a request points here. */
  signals: string;
  /** Layout, face, text and visual devices, for the writer. */
  recipe: string;
}

export const YOUTUBE_ARCHETYPES = {
  tutorial: {
    label: 'Tutorial / how-to',
    signals: '"how to", "step by step", "guide", "beginner", "in N minutes"',
    recipe: `Show the finished result as the hero, about 60% of the frame; the process is not the thumbnail. A presenter is optional, on one third, calm and confident. Headline: 1-3 words naming the outcome or the time ("IN 5 MIN"), never "How to". Clean background, at most one arrow pointing at the result. Avoid illegible software screenshots.`,
  },
  explainer: {
    label: 'Explainer / concept',
    signals: '"why", "what is", "explained", "the truth about", a concept',
    recipe: `One symbolic object or simple diagram that captures the core idea, centred or on a third, with generous empty space. A presenter is optional and curious or sceptical, never shocked. Headline: 0-3 words posing the question or tension ("IT'S A LIE?"). Dark or muted background with one accent colour. Do not try to illustrate the whole topic.`,
  },
  launch: {
    label: 'Launch / announcement / news',
    signals:
      '"is here", "launched", "announced", "new", "breaking", "update", a version number',
    recipe: `The product, logo or headline object as the hero, large and accurate; a presenter reacting with genuine surprise or intrigue on one third. Headline: 1-3 words ("IT'S HERE", "NEW", the version number). A small "NEW" badge is fine. Use red only as an accent for urgency. Render logos faithfully or leave them out; never invent one.`,
  },
  review: {
    label: 'Review',
    signals: '"review", "after N days", "worth it?", "honest", a product name',
    recipe: `A clean, well-lit product cut-out as the hero on a plain or muted backdrop, the presenter secondary and restrained (sceptical or approving). Headline: 0-2 words of verdict ("WORTH IT?", "DON'T BUY", "9/10"). One saturated colour taken from the product; an optional score badge or check/cross. Avoid busy desk scenes and invented product details.`,
  },
  comparison: {
    label: 'Comparison (X vs Y)',
    signals: '"vs", "or", "which is better", "compared", two named things',
    recipe: `A symmetrical split, one subject per half at matching scale and lighting, each half colour-coded with contrasting hues and a clear divider. A presenter, if any, sits centre or below, torn or thinking. Headline: "VS" plus at most one word per side. Never more than two items.`,
  },
  listicle: {
    label: 'Top N list',
    signals: 'a number of items in the title, "best", "top", "things", "tools"',
    recipe: `An oversized numeral on one third plus one to three item visuals; never all N items. Optionally tease the top pick behind a blur or "?". A presenter is optional, excited or pointing. Headline: the number, or the number plus one word. Avoid grids of tiny logos.`,
  },
  reaction: {
    label: 'Reaction',
    signals: '"reacting to", "reacts", "watching", "first time hearing"',
    recipe: `The thing being reacted to fills the background or one side; the presenter's face is large (a third of the frame or more) on the opposite side. This is the one archetype where a strong, exaggerated expression works. Headline: 0-3 words, often none. Optionally circle the key moment.`,
  },
  opinion: {
    label: 'Opinion / hot take',
    signals:
      '"is dead", "overrated", "the problem with", "I was wrong", "unpopular opinion"',
    recipe: `The subject (a logo, object or idea) beside the presenter showing a clear stance: sceptical, disappointed or defiant. Headline: 1-3 words stating the stance ("IT'S OVER"), adding to the title rather than repeating it. A visual metaphor such as cracks, a tombstone or a falling arrow can carry the take.`,
  },
  before_after: {
    label: 'Before / after',
    signals:
      '"before and after", "transformation", "glow up", "from X to Y", "I rebuilt"',
    recipe: `A vertical or diagonal split with the same angle and lighting on both sides: a desaturated "before" and a vibrant, larger "after", with an arrow between them. Headline: two short labels or numbers ("DAY 1 / DAY 100", "$0 → $10K"). The difference must be obvious at a glance.`,
  },
  challenge: {
    label: 'Challenge / experiment',
    signals: '"I tried", "for 24 hours", "survive", "100 days", "$1 vs $1000"',
    recipe: `One surprising image of the stakes with the presenter inside it, showing intense, sincere emotion. Scale contrast and bright saturated colour. Headline: 0-2 words, usually the number or the stakes ("$1", "DAY 100"). Show only what the video actually delivers.`,
  },
  story: {
    label: 'Story / documentary',
    signals:
      '"the story of", "what happened to", "rise and fall", "collapse", a historical event',
    recipe: `A single cinematic frame of a person, place or artefact with a moody grade and lots of negative space; teal-orange or dark tones with one red highlight. Faces belong to the story's subject, not a reacting presenter. Headline: 0-3 words of intrigue ("IT WAS FAKE") or none. Never bright YouTuber styling.`,
  },
  results: {
    label: 'Results / case study',
    signals:
      '"how I made", "$", "revenue", "results", "grew", "subscribers", "case study"',
    recipe: `The key number or an upward chart as the hero, the presenter genuine and confident on the opposite third. Headline: the number itself, large and specific, taken from the user's request (never invent figures). Green accents for growth; any dashboard crop enlarged until legible.`,
  },
  podcast: {
    label: 'Podcast / interview',
    signals: '"ft.", "with", "episode", "#", "interview", a guest name',
    recipe: `The guest's face very close, or host and guest facing each other; at most three elements on a plain or gradient background with even lighting. Faces stay real and natural with one genuine emotion. Headline: a 3-5 word pull-quote or hook, never the episode number.`,
  },
  vlog: {
    label: 'Vlog / lifestyle',
    signals:
      '"day in my life", "week", "trip", "moving", "routine", a place name',
    recipe: `A candid moment: the presenter on one third, the recognisable setting filling the rest, warm natural colour. A natural, authentic expression; no exaggeration. Headline: 0-3 words hinting at the story. Avoid generic stock scenery and posed smiles.`,
  },
  gaming: {
    label: 'Gaming',
    signals: 'a game name, "speedrun", "ranked", "boss", "mod", "glitch"',
    recipe: `The key in-game moment or character large, with the presenter or a character reacting; exaggerated expressions are fine. High saturation, glow or rim light, an arrow or circle on the key detail. Headline: 1-4 words. Make the game recognisable at a glance.`,
  },
  coding: {
    label: 'Coding / tech',
    signals:
      'a language or framework, "build", "from scratch", "internals", "system design", "performance"',
    recipe: `A visual of the actual system or technology: a simple architecture diagram built from icons and arrows (servers, databases, devices) for system design, official logos (at most two) for tools, or one enlarged 3-6 token code fragment, on a dark background lit with one accent colour, often the brand's own. The presenter is thoughtful, confident or sceptical on a third, never shocked. Headline: 1-3 words or a short code token ("10x FASTER", "useEffect?"). Never full screenshots of code.`,
  },
  mistakes: {
    label: 'Mistakes / warning',
    signals:
      '"mistakes", "stop", "don\'t", "never", "avoid", "wrong", "warning"',
    recipe: `Show the wrong thing clearly, crossed out or marked with a red X, the presenter concerned or disapproving on the opposite third; optionally a wrong-versus-right split. Red and yellow warning palette. Headline: 1-3 words ("STOP", "DON'T", "WRONG").`,
  },
} satisfies Record<string, Archetype>;

export const BLOG_ARCHETYPES = {
  technology: {
    label: 'Technology',
    signals:
      'software, engineering, AI, infrastructure, a product or framework',
    recipe: `An editorial illustration with one conceptual hero object representing the article's core insight, a dark modern palette with one luminous accent, and generous negative space. Real technology logos only when the article names them. Headline at the top in a clean modern sans-serif.`,
  },
  opinion: {
    label: 'Opinion / editorial',
    signals: 'an argument, commentary, "why X is wrong", essays',
    recipe: `One strong visual metaphor for the argument (a diverging path, a balancing scale), high contrast, black and white with a single accent colour. Headline in a bold serif, magazine-cover style.`,
  },
  listicle: {
    label: 'Listicle',
    signals: 'a numbered list of tips, tools or ideas',
    recipe: `An organised layout where the number is the biggest element, with two or three small illustrations hinting at the items; bright, distinct colour blocks. Clean bold sans-serif headline.`,
  },
  news: {
    label: 'News / announcement',
    signals: 'a release, launch, event or update',
    recipe: `The subject of the news (product, device, logo) as the hero with a subtle broadcast-style band; navy or red-black-white palette with high contrast. A short, heavy headline.`,
  },
  review: {
    label: 'Review',
    signals: 'evaluation of a product or service',
    recipe: `The product well lit and centred on a clean backdrop, an optional rating or verdict badge, trustworthy blues and greens. Headline: the product name plus an optional verdict word.`,
  },
  story: {
    label: 'Story / experience',
    signals: 'personal narrative, travel, a journey, lessons learned',
    recipe: `A single evocative moment as illustration or photo, warm organic tones or moody atmospheric light, minimal text so the image tells the story. A serif or handwritten headline.`,
  },
} satisfies Record<string, Archetype>;

export type YoutubeArchetype = keyof typeof YOUTUBE_ARCHETYPES;
export type BlogArchetype = keyof typeof BLOG_ARCHETYPES;
export type ArchetypeId = YoutubeArchetype | BlogArchetype;

export const archetypesFor = (kind: 'youtube' | 'blog') =>
  (kind === 'blog' ? BLOG_ARCHETYPES : YOUTUBE_ARCHETYPES) as Record<
    string,
    Archetype
  >;

/** The classifier's whole view of the catalogue: one line per archetype. */
export const archetypeCatalogue = (kind: 'youtube' | 'blog') =>
  Object.entries(archetypesFor(kind))
    .map(([id, a]) => `- ${id}: ${a.label}. Signals: ${a.signals}`)
    .join('\n');
