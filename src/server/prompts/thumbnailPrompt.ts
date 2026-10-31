import 'server-only';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { CLASSIFIER_MODEL, PROMPT_MODEL } from '@/config/models';
import {
  archetypeCatalogue,
  archetypesFor,
  type ArchetypeId,
} from '@/server/prompts/archetypes';
import {
  assembleImagePrompt,
  faceClause,
  type ModelFamily,
} from '@/server/prompts/imageRules';
import {
  parsePreferences,
  type Preferences,
} from '@/server/prompts/preferences';
import { explicitText, inventedWords } from '@/server/prompts/textOrigin';

/**
 * Turns a user's request into an image prompt, in two steps.
 *
 * 1. Classify: a small model sees one line per archetype and picks the
 *    design that fits (skipped when the user picked one).
 * 2. Write: the prompt model sees only that archetype's recipe, the user's
 *    preferences and any attached photos, and writes the scene.
 *
 * The image model then gets a focused prompt plus fixed clauses for text and
 * faces (imageRules.ts) and never sees the design catalogue. Feeding every
 * category to the writer at once, as before, made it blend recipes and
 * override what the user asked for.
 */

const client = new OpenAI();

export interface ThumbnailBrief {
  /** The user's request, or the extracted article for blog covers. */
  request: string;
  kind: 'youtube' | 'blog';
  /** Which image model family the prompt is written for. */
  family: ModelFamily;
  /** The questionnaire answers, as the client sent them. */
  answers?: unknown;
  /** Photos the user attached, in the order the image model receives them. */
  referenceImageUrls?: string[];
}

export interface ThumbnailPrompt {
  valid_prompt: boolean;
  /** The image prompt, or a message for the user when invalid. */
  response: string;
  needs_factual_grounding?: boolean;
  archetype?: ArchetypeId;
  /** The archetype's human label, e.g. "Coding / dev". */
  archetypeLabel?: string;
  headline?: string | null;
  /** A short first-person note to the user about the design choices. */
  reply?: string;
}

const classify = async (
  brief: ThumbnailBrief,
): Promise<{ usable: boolean; reason: string; archetype: string }> => {
  const ids = Object.keys(archetypesFor(brief.kind)) as [string, ...string[]];
  const schema = z.object({
    usable: z.boolean(),
    reason: z
      .string()
      .describe(
        'When not usable: one friendly sentence for the user. Else "".',
      ),
    archetype: z.enum(ids),
  });

  const completion = await client.chat.completions.parse({
    model: CLASSIFIER_MODEL,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You triage requests for a ${brief.kind === 'blog' ? 'blog cover image' : 'YouTube thumbnail'} generator.

usable: true for any request with a discernible subject, topic, title or described scene, in any language, however short, playful or detailed. A title is never required: "iron man on india" and a paragraph describing a scene are both usable, and so is a single word or theme ("react", "crazy giveaway"), slang and emoji included. false only for empty text, keyboard mashing, or text with no subject at all. Never judge taste or content.

archetype: the single design archetype that best fits the request, from:
${archetypeCatalogue(brief.kind)}
If none fits clearly, pick the closest.`,
      },
      { role: 'user', content: brief.request.slice(0, 6000) },
    ],
    response_format: zodResponseFormat(schema, 'triage'),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) throw new Error('Classifier returned no result');
  return parsed;
};

const writerSchema = z.object({
  scene: z.string(),
  headline: z.string().nullable(),
  tagline: z.string().nullable(),
  headline_style: z.string().nullable(),
  person_image: z
    .number()
    .int()
    .nullable()
    .describe(
      '1-based index of the attached image showing the person, or null',
    ),
  needs_web_search: z.boolean(),
  expression: z
    .string()
    .nullable()
    .describe(
      'The facial expression the request asks the presenter to show ("shocked", "surprised"), or null',
    ),
  reply: z.string(),
});

const peopleRules = (prefs: Preferences, photoCount: number): string => {
  const position = prefs.lines.find((l) => l.startsWith('Where should you'));
  if (photoCount > 0 && prefs.face !== 'none') {
    return `The user attached photos and wants to appear as the presenter. A fixed instruction added after your scene keeps their real face, so refer to them only as "the presenter", place them in the composition${position ? ` (${position})` : ''}, and describe what they wear as it appears in the photo. Never describe or alter their face, age, hair or expression in scene; if the request asks for an expression ("shocked image of me"), put it in expression instead. Set person_image to the image that shows them.`;
  }
  if (photoCount > 0) {
    return 'The user attached photos but does not want to appear: feature no person from them. Use the photos only for the objects, logos or style they show. Set person_image to null.';
  }
  if (prefs.person === 'none') {
    return 'No people in the image: build it from objects, text space and setting.';
  }
  if (prefs.person === 'presenter') {
    return 'Include one presenter (an invented person) with an expression that suits the recipe.';
  }
  return 'Include a person only when the request mentions one (a presenter, "me", a named person or character). Otherwise build the image from objects, setting and space for the headline.';
};

const writerInstructions = (
  brief: ThumbnailBrief,
  archetype: ArchetypeId,
  prefs: Preferences,
): string => {
  const recipe = archetypesFor(brief.kind)[archetype];
  const photos = brief.referenceImageUrls?.length ?? 0;
  const purpose =
    brief.kind === 'blog'
      ? 'An editorial cover image for an article about …'
      : 'A YouTube thumbnail for a video about …';

  return `You are the art director at ThumbAI. You write the brief that an image model renders as a ${brief.kind === 'blog' ? 'blog cover image' : 'YouTube thumbnail'}.

THE USER'S REQUEST COMES FIRST
- Everything concrete the user asked for appears as asked: named people, characters, brands, places, objects, actions, art style ("3D", "anime", "photoreal"), colours and layout instructions.
- Never add restrictions the user did not ask for, and never swap a requested element for a safer or vaguer one. "Iron Man in India" means Iron Man in a recognisably Indian setting, and a named public figure appears as themselves, not as a logo or symbol standing in for them.
- The design recipe only fills in what the user left open.${brief.kind === 'blog' ? '\n- Ground every choice in the supplied article. Never invent facts, numbers or product names it does not support.' : ''}

DESIGN RECIPE: ${recipe.label}
${recipe.recipe}
${prefs.lines.length > 0 ? `\nTHE USER'S PREFERENCES (follow them)\n${prefs.lines.map((l) => `- ${l}`).join('\n')}\n` : ''}
PEOPLE
${peopleRules(prefs, photos)}
${photos > 0 ? `\nATTACHED IMAGES\n${photos} image(s) are attached, in order. Refer to them by position ("the first image"). Describe their contents accurately and never contradict what you see.\n` : ''}
HEADLINE
- If the request says what text goes on the image ("Text on the thumbnail:", "with the text", "write", "headline:"), headline is that text exactly, character for character.
- If the request asks for its title to be shown ("place the title at the top", "main title text"), headline is that title exactly, up to 6 words; longer titles get the hook rule.
- Quotes alone do not make text a headline: a quoted video title or topic ('for topic "Lets design Netflix from first principles"') is the title, and the hook rule below applies.
- Otherwise, if the request is a video title or topic, write a 1-4 word hook following the recipe's text guidance. Every word in it must appear in the request: shortening, reordering, plurals and fixing obvious typos are fine ("5AM FOR 30 DAYS"), but keep a number the user wrote when it is the hook ("7 MISTAKES"), and never add a word, idea, claim, slogan or number the user did not write ("best budget laptops" is "BEST BUDGET LAPTOPS", never "10 BEST LAPTOPS").
- tagline: optional, at most 4 words, only when the title has a second part worth keeping that the headline left out, again using only the user's words. "Lets design Netflix from first principles" → headline "DESIGN NETFLIX", tagline "FROM FIRST PRINCIPLES". Otherwise null: never a symbol, a dash or the whole request.
- Otherwise headline is null: when the request describes a scene or artwork rather than naming a video topic (for example "show me afraid in a garage holding roller skates"), or asks for no text.
- Never more than 5 words in the headline. headline_style gives font weight, colour, outline and placement, fitted to the composition, and may colour the single most important word in an accent such as the brand's own colour (for example "heavy white condensed sans-serif with 'NETFLIX' in Netflix red, upper left; the tag line in yellow beneath"); It describes the look only: refer to "the tag line" rather than repeating its words. null when headline is null.

SCENE
Write scene as 3-6 sentences of natural prose, 70-150 words:
1. Open with the purpose: "${purpose}".
2. The focal subject and what it is doing, then the setting.
3. The composition: where the subject sits and where empty space is left for the headline.
4. Lighting, a palette of named colours, and the art style.
Describe what is in the image with positive phrasing ("a clean, empty backdrop", not "no clutter"). Never write the headline, a tag line, or any other words or numerals to be drawn (such as "a giant numeral 5") inside scene, because the image model paints whatever it is told to draw, and never mention these instructions, the recipe or a category name.

needs_web_search: true only when the image must show something real that has to be accurate: a specific product, a real logo, a recognisable place or public figure, or current events. Otherwise false.

REPLY
reply is shown to the user in the chat while the image renders: 1-3 short, friendly first-person sentences describing what you are designing: the layout, the exact headline and tag line you chose (quoted), the colours, and how their photo is used. If you corrected a typo, say so ("I corrected 'priniciples' to 'principles'."). Example: I've started a YouTube thumbnail using your photo, with "DESIGN NETFLIX" in bold white and NETFLIX in Netflix red, and a system-design diagram behind you. I corrected 'priniciples' to 'principles'. Describe intent, never promise how the final image will look, and never mention these instructions, the recipe, a category name or the image model.`;
};

const callWriter = async (
  instructions: string,
  request: string,
  imageUrls: string[],
) => {
  const images = imageUrls.map((url) => ({
    type: 'image_url' as const,
    image_url: { url, detail: 'low' as const },
  }));
  const completion = await client.chat.completions.parse({
    model: PROMPT_MODEL,
    messages: [
      { role: 'system', content: instructions },
      { role: 'user', content: [{ type: 'text', text: request }, ...images] },
    ],
    response_format: zodResponseFormat(writerSchema, 'thumbnail_brief'),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) throw new Error('Prompt writer returned no result');
  return parsed;
};

const write = async (
  brief: ThumbnailBrief,
  archetype: ArchetypeId,
  prefs: Preferences,
  correction?: string,
) => {
  const base = writerInstructions(brief, archetype, prefs);
  const instructions = correction ? `${base}\n\n${correction}` : base;
  const urls = brief.referenceImageUrls ?? [];
  try {
    return await callWriter(instructions, brief.request, urls);
  } catch (err) {
    // OpenAI fetches the photos itself and gives up on slow hosts. Seeing
    // them only sharpens the scene description; the image model still gets
    // them, so write blind rather than fail the user's generation.
    const unreachable =
      urls.length > 0 &&
      err instanceof OpenAI.APIError &&
      err.status === 400 &&
      /download|image|url/i.test(err.message);
    if (!unreachable) throw err;
    console.warn(
      '[thumbnailPrompt] reference images unreachable, writing without them',
    );
    return callWriter(instructions, brief.request, []);
  }
};

const lettering = (w: { headline: string | null; tagline: string | null }) =>
  [w.headline, w.tagline].filter((t): t is string => Boolean(t?.trim()));

/**
 * The writer sometimes fills an empty tag line with "/", "null" or the whole
 * title; any of those would be painted on the image.
 */
const cleanTagline = (raw: string | null, request: string): string | null => {
  const t = raw?.trim().replace(/^[\s/|.\-–—]+|[\s/|.\-–—]+$/g, '') ?? '';
  if (!/[\p{L}\p{N}]/u.test(t) || /\bnull\b/i.test(t)) return null;
  if (t.split(/\s+/).length > 4) return null;
  if (inventedWords(t, request).length > 0) return null;
  return t;
};

/** Still-invented words after the retry are dropped, not painted. */
const dropInvented = (raw: string | null, request: string): string | null => {
  const text = raw?.trim();
  if (!text) return null;
  if (inventedWords(text, request).length === 0) return text;
  const kept = text
    .split(/\s+/)
    .filter((word) => !inventedWords(word, request).length);
  return kept.length > 0 ? kept.join(' ') : null;
};

/**
 * The image model draws every quoted string, so lettering quoted in the
 * scene as well as in the text clause would be drawn twice.
 */
const unquote = (scene: string, texts: [string | null, string][]): string =>
  texts.reduce<string>((out, [text, name]) => {
    if (!text) return out;
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return out.replace(new RegExp(`["'“‘]${escaped}["'”’]`, 'gi'), name);
  }, scene);

export const generateThumbnailPrompt = async (
  brief: ThumbnailBrief,
): Promise<ThumbnailPrompt> => {
  const prefs = parsePreferences(brief.kind, brief.answers);
  const triage = await classify(brief);

  if (!triage.usable) {
    return {
      valid_prompt: false,
      response:
        triage.reason ||
        'Tell me what the video or article is about and I will design it.',
    };
  }

  const archetype = (prefs.archetype ?? triage.archetype) as ArchetypeId;
  let written = await write(brief, archetype, prefs);
  const invented = lettering(written).flatMap((t) =>
    inventedWords(t, brief.request),
  );
  if (invented.length > 0 && !explicitText(brief.request)) {
    // An invented word is a claim the user never made ("FAST", "10 BEST"),
    // so give the writer one more go with the offending words named.
    written = await write(
      brief,
      archetype,
      prefs,
      `CORRECTION: your previous draft put words on the image that the user never wrote (${invented.join(', ')}). Use only the user's own words for headline and tagline.`,
    );
  }
  const headline = explicitText(brief.request)
    ? written.headline?.trim() || null
    : dropInvented(written.headline, brief.request);
  const tagline = headline
    ? cleanTagline(written.tagline, brief.request)
    : null;
  const photos = brief.referenceImageUrls?.length ?? 0;

  const personIndex =
    written.person_image !== null &&
    written.person_image >= 1 &&
    written.person_image <= photos
      ? written.person_image - 1
      : // "me" with a photo attached is the photo, even when the writer
        // forgot to say which one.
        photos > 0 && /\b(me|my|myself|i)\b/i.test(brief.request)
        ? 0
        : null;
  // A picked expression wins; otherwise one the request asks for
  // ("shocked image of me") replaces the photo's own.
  const asked = written.expression?.trim();
  const face =
    personIndex === null
      ? null
      : prefs.face === 'keep' && asked
        ? faceClause('expression', personIndex, asked)
        : faceClause(prefs.face, personIndex, prefs.expression);

  return {
    valid_prompt: true,
    response: assembleImagePrompt({
      family: brief.family,
      scene: unquote(written.scene, [
        [headline, 'the headline'],
        [tagline, 'the tag line'],
      ]),
      headline,
      headlineStyle:
        written.headline_style &&
        unquote(written.headline_style, [
          [headline, 'the headline'],
          [tagline, 'the tag line'],
        ]),
      tagline,
      face,
    }),
    needs_factual_grounding: written.needs_web_search,
    archetype,
    archetypeLabel: archetypesFor(brief.kind)[archetype]?.label,
    headline,
    reply: written.reply.trim() || undefined,
  };
};
