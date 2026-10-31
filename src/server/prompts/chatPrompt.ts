import 'server-only';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { PROMPT_MODEL } from '@/config/models';
import {
  EDIT_LOCKS,
  assembleEditPrompt,
  type EditLock,
} from '@/server/prompts/imageRules';

const client = new OpenAI();

const lockIds = Object.keys(EDIT_LOCKS) as [EditLock, ...EditLock[]];

const schema = z.object({
  valid: z.boolean(),
  change: z
    .string()
    .describe('The edit as one or two imperative sentences. "" when invalid.'),
  unlocked: z
    .array(z.enum(lockIds))
    .describe('Only the aspects the change itself must alter.'),
});

/**
 * Turns a follow-up chat message into a targeted edit.
 *
 * The LLM only restates the change and says which aspects that change must
 * touch; the "keep everything else exactly the same" sentence is assembled
 * in code from Google's edit template, so a vague message can never become
 * permission to redraw the whole thumbnail.
 */
const SYSTEM = `You turn a user's follow-up message about an existing thumbnail into a precise edit instruction.

change: one or two imperative sentences stating exactly what differs, concretely ("Make the headline about 30% larger", "Replace the blue background with a deep red gradient"). Restate only what the user asked for and never widen it. Refer to people in the third person ("the person", "the presenter"), never "me" or "I". If the user gives text to render, quote it exactly and say it is spelled exactly as written.

unlocked: the aspects the change itself necessarily alters, from: ${lockIds.join(', ')}. Everything not listed is preserved. Changing the headline unlocks "text"; making someone smile unlocks "expression"; a new background unlocks "background", and also "colours" when its colour changes; any colour change unlocks "colours". When in doubt, leave it locked.

valid: false only when the message is empty, gibberish, or contains no instruction about the image.`;

export const generateChatPrompt = async (
  chatPrompt: string,
  referenceCount = 0,
) => {
  if (!chatPrompt?.trim()) {
    return { valid_prompt: false, response: 'Tell me what to change.' };
  }

  const completion = await client.chat.completions.parse({
    model: PROMPT_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: chatPrompt },
    ],
    response_format: zodResponseFormat(schema, 'edit'),
  });

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
      referenceCount,
    }),
  };
};
