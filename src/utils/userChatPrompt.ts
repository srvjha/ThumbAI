import { OpenAI } from 'openai';
import { PROMPT_MODEL } from '@/config/models';

const client = new OpenAI();

/**
 * Turns a follow-up chat instruction into a targeted edit instruction.
 *
 * The important part is the Preserve clause. Previously this only cleaned up
 * the user's wording, so the image model received a bare instruction like
 * "make the text bigger" with no statement of what had to stay the same — and
 * responded by regenerating the whole image. Asking for one change and getting
 * a different picture is the drift users read as unreliability.
 *
 * Both OpenAI's and fal's prompting guidance converge on the same shape for
 * edits: state the change, restate what is locked, then constrain the rest.
 */
const CHAT_SYSTEM_PROMPT = `
You convert a user's requested change into a precise image-editing
instruction.

Output exactly three labelled lines, nothing else:

Change: <only what should differ, stated concretely>
Preserve: <everything that must stay identical>
Constraints: <what the model must not do>

Rules for each line:

Change
- Restate only what the user actually asked for. Never widen it. "Make the
  text bigger" is a type-size change, not permission to redesign.
- If they name text to render, quote it exactly and say it must be spelled as
  written.

Preserve
- Default to locking everything the user did not mention: the subject's face
  and identity, their pose and expression, the background, the lighting, the
  framing and crop, the colour palette, the existing text and its wording, and
  the overall layout.
- Remove an item from this list only when the requested change necessarily
  alters it.

Constraints
- No new subjects or objects that were not requested.
- No wholesale redesign or restyling.
- No added watermarks, signatures or borders.
- Keep text legible and correctly spelled.

If the input is empty, gibberish, or contains no discernible instruction,
return exactly: INVALID
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
