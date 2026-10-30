/**
 * Style presets. Each is a look, described in words the prompt agent can act
 * on, with a sample from public/samples that shows it.
 */
export const STYLE_PRESETS = [
  {
    id: 'reaction',
    label: 'Reaction close-up',
    image: '/samples/tech-api.webp',
    phrase:
      'a close, expressive face reacting to the topic, one bold short headline, saturated rim light',
  },
  {
    id: 'cinematic',
    label: 'Cinematic scene',
    image: '/samples/gaming-frozen.webp',
    phrase:
      'a wide cinematic scene with one small figure, dramatic painterly light, a huge outlined headline',
  },
  {
    id: 'explainer',
    label: 'Clean explainer',
    image: '/samples/finance-salary.webp',
    phrase:
      'a clean bright background, one person and one simple prop or chart, a heavy black headline',
  },
  {
    id: 'hero-object',
    label: 'Hero object',
    image: '/samples/cooking-ramen.webp',
    phrase:
      'an extreme close-up of the hero object with texture and warm light, a short white headline',
  },
  {
    id: 'golden-hour',
    label: 'Golden hour',
    image: '/samples/travel-lisbon.webp',
    phrase:
      'a sunlit location shot with a person in the scene, warm sunset colour, a soft-shadowed headline',
  },
  {
    id: 'verdict',
    label: 'Product verdict',
    image: '/samples/review-headphones.webp',
    phrase:
      'a product held up to camera on a solid colour backdrop, the price or verdict as the headline',
  },
  {
    id: 'split',
    label: 'Split headline',
    image: '/samples/fitness-5am.webp',
    phrase:
      'a split composition, subject on one side and huge type on the other, one accent-coloured word',
  },
  {
    id: 'two-up',
    label: 'Two people',
    image: '/samples/podcast-remote.webp',
    phrase:
      'two people facing camera with contrasting expressions, the headline on a solid band',
  },
] as const;

export type StylePresetId = (typeof STYLE_PRESETS)[number]['id'];

export const presetById = (id?: string | null) =>
  STYLE_PRESETS.find((preset) => preset.id === id);

/**
 * Folds the composer's optional fields into the prompt the API receives.
 * With both empty the prompt is sent exactly as typed.
 */
export const composePrompt = (
  prompt: string,
  overlayText?: string,
  presetId?: string,
) => {
  const parts = [prompt.trim()];
  const text = overlayText?.trim();
  if (text) parts.push(`Text on the thumbnail: "${text}"`);
  const preset = presetById(presetId);
  if (preset) parts.push(`Style: ${preset.phrase}.`);
  return parts.length === 1 ? prompt : parts.join('\n');
};
