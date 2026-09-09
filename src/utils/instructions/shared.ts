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

/**
 * Invariant design rules, sent as a system instruction rather than folded into
 * the prompt.
 *
 * These never change per request, so they belong in the model's system slot
 * where they don't compete with the actual brief for attention. The nano-banana
 * models accept `system_prompt` directly; gpt-image-2 has no such field, so the
 * registry prepends it (see src/config/models.ts).
 *
 * The specifics come from published thumbnail CTR research rather than taste:
 * faces with visible emotion, high subject/background contrast, and very short
 * text all correlate with materially higher click-through.
 */
export const DESIGN_SYSTEM_PROMPT = `
You render thumbnails and cover images that must work at small size in a
crowded feed. A thumbnail is judged at roughly 320px wide, and on mobile
closer to 168px. Anything that does not survive that size is wasted.

Hold these rules unless the brief explicitly overrides them:

TEXT
- Render only the text given in quotes, spelled exactly as written.
- Never exceed five words of headline text; three to four is better.
- Set it bold and high-contrast against whatever sits behind it.
- No paragraphs, no small print, no more than two text elements, no invented
  words, no lorem ipsum.

SUBJECT
- One focal subject. Everything else supports it or is removed.
- When a person is present, show visible emotion and eye contact with the
  viewer.
- Keep the subject clearly separated from the background — noticeably
  brighter or darker, not merely a different hue.

COMPOSITION
- Leave the frame uncluttered. Empty space is preferable to a second competing
  element.
- Keep the important content away from the extreme edges.

NEVER PRODUCE
- Garbled, misspelled or duplicated lettering.
- Watermarks, signatures, stock-photo artefacts or UI chrome.
- Extra limbs or fingers, warped or melted faces.
- Muddy low-contrast composition that turns to grey mush when scaled down.
`;
