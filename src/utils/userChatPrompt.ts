import { OpenAI } from 'openai';
import { PROMPT_MODEL } from '@/config/models';

const client = new OpenAI();

/**
 * Rewrites a follow-up chat instruction into a clean edit instruction.
 *
 * One call, not two. This used to run userPromptRewriting() and then a second
 * rewrite pass, each on a small model, and each free to drop detail the user
 * had actually asked for. The first pass also had a regex heuristic that
 * silently threw its own output away and fell back to the raw prompt whenever
 * the result happened to contain words like "step" or "follow".
 */
const CHAT_SYSTEM_PROMPT = `
You clean up a user's image-editing instruction so an image model can follow it.

Rules:
- Preserve the intent and the action exactly. If they asked to change one
  thing, do not turn it into a request to regenerate everything.
- Never introduce subjects, objects, colours or styles the user did not ask
  for.
- Fix grammar, spelling and phrasing. Resolve vague references where the
  meaning is unambiguous.
- If the instruction includes text to render, quote it exactly and state that
  it must be spelled correctly and legible.
- Return only the rewritten instruction. No preamble, no explanation.

If the input is empty, gibberish, or has no discernible instruction, return
exactly: INVALID
`;

export const generateChatPrompt = async (chatPrompt: string) => {
  if (!chatPrompt?.trim()) {
    return { valid_prompt: false, response: 'Please give a meaningful prompt.' };
  }

  const completion = await client.chat.completions.create({
    model: PROMPT_MODEL,
    messages: [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      { role: 'user', content: chatPrompt },
    ],
  });

  const response = completion.choices[0]?.message?.content?.trim() ?? '';

  if (!response || response === 'INVALID') {
    return { valid_prompt: false, response: 'Please give a meaningful prompt.' };
  }

  return { valid_prompt: true, response };
};
