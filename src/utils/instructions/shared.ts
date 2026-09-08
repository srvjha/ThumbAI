/**
 * Guidance shared by every workflow.
 *
 * Modern image models render legible text and reward specific, detailed
 * prompts. The previous instructions capped output at "2-3 steps, under 150
 * words", which starved the model of exactly the detail it needed — while the
 * blog workflow asked for 6-8 steps from the same pipeline.
 */
export const SHARED_OUTPUT_RULES = `
OUTPUT FORMAT
- Write flowing descriptive prose, not a numbered list and not instructions to
  a human designer. The output is fed straight to an image model.
- Be specific and concrete. Name colours, materials, lighting, lens, and
  composition. Vague prompts are why generations come out inconsistent.
- Aim for 120-220 words. Do not pad, but do not omit specifics either.

TYPOGRAPHY (this is what makes or breaks a thumbnail)
- State the exact headline text to render, in quotes, and keep it to 5 words
  or fewer. Short text renders cleanly; long text does not.
- Say where it sits, that it is bold and high-contrast against what is behind
  it, and that it must be spelled exactly as quoted.
- Never ask for a paragraph of text, small print, or more than two text
  elements.

AVOID
- Garbled or misspelled lettering, watermarks, signatures, UI chrome.
- Extra limbs or fingers, warped faces.
- Muddy low-contrast composition: a thumbnail is judged at ~320px wide, so the
  subject must read instantly at that size.
`;
