/**
 * The fixed parts of every image prompt, assembled in code rather than left
 * to the prompt-writing LLM.
 *
 * Exact text, keeping a real person's face, and "change only this" are the
 * three things users notice instantly when they go wrong, so they are
 * sentences we own and test, not instructions an LLM might paraphrase away.
 *
 * Two model families read prompts differently:
 * - Gemini (nano-banana*) wants narrative prose with positive phrasing:
 *   describe an empty street rather than say "no cars"
 *   (ai.google.dev/gemini-api/docs/image-generation).
 * - gpt-image wants short labelled segments and handles explicit exclusions
 *   ("no watermark") well (OpenAI cookbook, image-gen prompting guide).
 */

export type ModelFamily = 'gemini' | 'openai';

/**
 * How a person in the user's reference photos is treated.
 * - keep: their real face and their real expression, untouched.
 * - expression: their real face, with the expression the user picked.
 * - none: the photos are context only; nobody is featured.
 */
export type FaceMode = 'keep' | 'expression' | 'none';

/**
 * Sent as Gemini's system_prompt. Its effect is undocumented, so nothing
 * here is load-bearing: the clauses below repeat what must hold.
 */
export const THUMBNAIL_SYSTEM_PROMPT = `You design YouTube thumbnails and blog cover images. They are seen at roughly 160 to 360 pixels wide in a crowded feed, so each image has one clear focal subject, strong brightness contrast between the subject and the background, uncluttered space, and bold, legible lettering when the prompt asks for text. Lettering appears only where the prompt quotes it, spelled exactly as quoted. The bottom-right corner stays free of important detail because the video length is shown there. When reference photos of a person are provided, that person keeps their real face.`;

/** Sent as Gemini's system_prompt for conversational edits. */
export const EDIT_SYSTEM_PROMPT = `You edit an existing image. Apply only the change the prompt asks for and keep everything else identical: the composition and framing, every person's face, features and expression, all existing lettering, the colours, the lighting and the style.`;

/** gpt-image has no system prompt field, so its rules lead the prompt. */
const OPENAI_RULES = `Purpose: a thumbnail or cover image that must read clearly at 160-360 px wide.
Rules: one focal subject; strong brightness contrast between subject and background; uncluttered composition; keep the bottom-right corner free of important detail. No watermark, no signature, no UI chrome, no extra or misspelled text.`;

const ordinal = (index: number) =>
  ['first', 'second', 'third', 'fourth', 'fifth'][index] ?? `${index + 1}th`;

/**
 * Identity clause for reference photos of a person. Wording follows Google's
 * "Ensure the [person's] face and features remain completely unchanged"
 * and OpenAI's "Preserve her exact likeness, expression, hairstyle".
 */
export const faceClause = (
  mode: FaceMode,
  personImageIndex: number,
  expression?: string,
): string | null => {
  if (mode === 'none') return null;
  const who = `the person in the ${ordinal(personImageIndex)} image`;
  const features =
    'their face shape, eyes, nose, mouth, skin tone, hairline and hairstyle';
  if (mode === 'expression' && expression) {
    return `Use ${who} as the presenter. Keep ${features} completely unchanged so they are unmistakably the same real person; only their facial expression changes, to ${expression}. Do not beautify, restyle or age their face.`;
  }
  return `Use ${who} as the presenter. Keep their face exactly as it is in the photo: ${features}, as well as their natural facial expression, remain completely unchanged, so they are unmistakably the same real person. Do not beautify, restyle or re-pose their face.`;
};

export const textClause = (
  family: ModelFamily,
  headline: string | null,
  style: string | null,
): string => {
  if (!headline) {
    return family === 'openai'
      ? 'Text: none. No words, letters or numbers anywhere in the image.'
      : 'The image is purely visual, free of any words, letters or numbers.';
  }
  const look =
    style?.trim() ||
    'a heavy, bold sans-serif with a thick dark outline, large and high-contrast';
  return family === 'openai'
    ? `Text (EXACT, verbatim, appears once): "${headline}" set in ${look}. No other text.`
    : `The only lettering in the image is the headline "${headline}", spelled exactly as written and appearing once, set in ${look}.`;
};

/** Puts the writer's scene and the fixed clauses together for one family. */
export const assembleImagePrompt = ({
  family,
  scene,
  headline,
  headlineStyle,
  face,
}: {
  family: ModelFamily;
  scene: string;
  headline: string | null;
  headlineStyle: string | null;
  face: string | null;
}): string => {
  const text = textClause(family, headline, headlineStyle);
  if (family === 'openai') {
    return [
      OPENAI_RULES,
      `Image: ${scene.trim()}`,
      face && `Person: ${face}`,
      text,
    ]
      .filter(Boolean)
      .join('\n\n');
  }
  return [scene.trim(), face, text].filter(Boolean).join('\n\n');
};

/** Everything an edit keeps unless the requested change needs it. */
export const EDIT_LOCKS = {
  composition: 'the composition, framing and crop',
  person: "every person's face, features and pose",
  expression: 'their facial expressions',
  text: 'all existing lettering and its exact wording',
  colours: 'the colour palette',
  lighting: 'the lighting',
  style: 'the overall art style',
  background: 'the background',
} as const;

export type EditLock = keyof typeof EDIT_LOCKS;

/**
 * Google's targeted-edit template: "Using the provided image, change only
 * the [element] … Keep everything else in the image exactly the same,
 * preserving the original style, lighting, and composition."
 */
export const assembleEditPrompt = ({
  change,
  unlocked,
  referenceCount,
}: {
  change: string;
  unlocked: EditLock[];
  referenceCount: number;
}): string => {
  const kept = (Object.keys(EDIT_LOCKS) as EditLock[])
    .filter((lock) => !unlocked.includes(lock))
    .map((lock) => EDIT_LOCKS[lock]);
  const refs =
    referenceCount > 0
      ? ` The first image is the thumbnail being edited; the other ${referenceCount === 1 ? 'image is a reference' : `${referenceCount} images are references`} for the change.`
      : '';
  const keep =
    kept.length > 0
      ? ` Keep everything else exactly the same, preserving ${kept.join(', ')}.`
      : '';
  return `Using the provided image, make only this change: ${change.trim()}${refs}${keep}`;
};
