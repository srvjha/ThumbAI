import 'server-only';
import { OpenAI } from 'openai';
import { llmFor } from '@/server/prompts/llm';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { PROMPT_MODEL } from '@/config/models';
import {
  EDIT_LOCKS,
  assembleEditPrompt,
  type EditLock,
} from '@/server/prompts/imageRules';

const lockIds = Object.keys(EDIT_LOCKS) as [EditLock, ...EditLock[]];

const schema = z.object({
  valid: z.boolean(),
  change: z
    .string()
    .describe('The edit as one or two imperative sentences. "" when invalid.'),
  unlocked: z
    .array(z.enum(lockIds))
    .describe('Only the aspects the change itself must alter.'),
  needs_web_search: z
    .boolean()
    .describe(
      'True when the change adds a real logo, product or public figure.',
    ),
  reply: z
    .string()
    .describe('One short first-person sentence telling the user the edit.'),
});

/**
 * Turns a follow-up chat message into a targeted edit.
 *
 * The LLM sees the image being edited, because follow-ups are written
 * against it: "remove the word fast" only means something once you can read
 * "DESIGN NETFLIX FAST" on it. It restates the change and says which aspects
 * that change must touch; the "keep everything else exactly the same"
 * sentence is assembled in code from Google's edit template, so a vague
 * message can never become permission to redraw the whole thumbnail.
 */
const SYSTEM = `You turn a user's follow-up message about the attached thumbnail into a precise edit instruction. The first attached image is the thumbnail being edited; any others are references the user supplied.

change: one or two imperative sentences stating exactly what differs, concretely ("Make the headline about 30% larger", "Replace the blue background with a deep red gradient"). Restate only what the user asked for and never widen it. Refer to people in the third person ("the person", "the presenter"), never "me" or "I".

Text: read the lettering currently on the thumbnail. When the user says "title X", "headline X", "text X", "write X" or asks to remove or add words, X is the new lettering, not a design style: state the complete new headline in double quotes, in the same letter case as the current lettering, and say it is spelled exactly as written. Example: the thumbnail reads "LEARN RUST TODAY" and the user says "remove the word today" → Change the headline to exactly "LEARN RUST". If no thumbnail is attached or you cannot read its lettering, never guess the rest of the headline: state the change against the current lettering instead (Remove the word "TODAY" from the headline, keeping the other words exactly as they are).

Where: locate people, body parts and objects by where they are in the image as seen ("the arm cut off at the bottom-right edge", "the hand on the left of the frame"), never by the person's own left or right. When the user says left or right, they mean as seen in the image unless they say "my left" or "his right"; look at the image to find what they mean. A cut-off, missing or malformed body part is fixed by redrawing it whole and natural where it belongs, and the change says to remove any leftover fragment of it.

unlocked: the aspects the change itself necessarily alters, from: ${lockIds.join(', ')}. Everything not listed is preserved. Changing the headline unlocks "text"; making someone smile unlocks "expression"; fixing or moving a body part, or adding or removing a person, unlocks "person"; a new background unlocks "background", and also "colours" when its colour changes; any colour change unlocks "colours". When in doubt, leave it locked.

needs_web_search: true when the change adds or corrects a real logo, product, place or public figure that has to look accurate; otherwise false.

reply: one short, friendly first-person sentence for the user saying what you will change, quoting any new text, e.g. I'll change the headline to "DESIGN NETFLIX" and keep everything else the same. Never promise how the result will look. "" when invalid.

valid: true for any instruction about the image, however vague ("make it better", "more eye-catching"): turn a vague one into a concrete improvement that keeps the design, such as stronger contrast and a bolder headline. false only when the message is empty or gibberish.`;

const askEditor = (chatPrompt: string, imageUrls: string[]) =>
  llmFor(PROMPT_MODEL).chat.completions.parse({
    model: PROMPT_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: chatPrompt },
          ...imageUrls.map((url) => ({
            type: 'image_url' as const,
            image_url: { url, detail: 'low' as const },
          })),
        ],
      },
    ],
    response_format: zodResponseFormat(schema, 'edit'),
  });

/** imageUrls: the image being edited first, then any references. */
export const generateChatPrompt = async (
  chatPrompt: string,
  imageUrls: string[] = [],
) => {
  if (!chatPrompt?.trim()) {
    return { valid_prompt: false, response: 'Tell me what to change.' };
  }

  let completion;
  try {
    completion = await askEditor(chatPrompt, imageUrls);
  } catch (err) {
    // Seeing the image only sharpens the instruction; don't fail the edit
    // because OpenAI could not fetch it in time.
    if (
      !(
        imageUrls.length > 0 &&
        err instanceof OpenAI.APIError &&
        err.status === 400
      )
    ) {
      throw err;
    }
    console.warn('[chatPrompt] edit image unreachable, writing without it');
    completion = await askEditor(chatPrompt, []);
  }

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed?.valid || !parsed.change.trim()) {
    return {
      valid_prompt: false,
      response: 'Tell me what to change, for example "make the headline red".',
    };
  }

  return {
    valid_prompt: true,
    response: assembleEditPrompt({
      change: parsed.change,
      unlocked: parsed.unlocked,
      referenceCount: Math.max(0, imageUrls.length - 1),
    }),
    needs_factual_grounding: parsed.needs_web_search,
    unlocked: parsed.unlocked,
    reply: parsed.reply.trim() || undefined,
  };
};
