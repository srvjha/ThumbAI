import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

/**
 * Grades a written prompt against what the user asked for, with a fixed
 * rubric so pass rates are comparable between prompt changes. It reads the
 * prompt, not an image: it judges what the image model was told.
 */
const client = new OpenAI();
const JUDGE_MODEL = process.env.OPENAI_JUDGE_MODEL ?? 'gpt-4.1';

const generationVerdict = z.object({
  missing_elements: z
    .array(z.string())
    .describe('Concrete things the user named that the prompt omits or changes.'),
  added_restrictions: z
    .array(z.string())
    .describe('Restrictions, exclusions or substitutions the user did not ask for.'),
  archetype_fit: z.enum(['yes', 'partly', 'no']),
  headline_faithful: z.boolean(),
  headline_issue: z.string().describe('Why the headline is not faithful, else "".'),
  pass: z.boolean(),
  reason: z.string().describe('One sentence explaining the verdict.'),
});

export type GenerationVerdict = z.infer<typeof generationVerdict>;

const GENERATION_RUBRIC = `You audit prompts written for an image model that makes YouTube thumbnails and blog covers. You get the user's request, the design archetype that was chosen, whether the user attached a photo of themselves, and the final prompt (the scene plus fixed sentences about the person and the lettering).

Judge strictly against the user's request:

missing_elements: every concrete thing the user named — people or characters, brands, products, places, objects, actions, art style ("3D", "anime", "4k", "photoreal"), colours, mood, layout or placement instructions ("title at center", "dark fiery background", "no humans") — that the prompt leaves out or changes. Vague asks ("make it better", "attractive") are not elements. For a blog article, only the article's core subject counts; supporting details are optional. Without an attached photo, "me" or "I" in the request is shown as a presenter; that is not a missing element.

added_restrictions: anything the prompt forbids, swaps or tones down that the user did not ask for: removing people the user wanted, replacing a named place with a generic one, neutralising requested colours, banning landmarks, swapping the art style. Ordinary design choices (lighting, composition, palette when the user gave none) are not restrictions.

archetype_fit: does the chosen design archetype suit the request? yes, partly, or no.

headline_faithful: thumbnails carry a short hook of 1-5 words, never a full sentence. Judge it this way:
- If the user dictated on-image text ('text "X"', 'write "X"', 'headline: X'), the headline must be exactly X.
- If the user explicitly asked to keep the title as written ("keep the text same as the title"), the headline must be the full title.
- Otherwise shortening, rearranging and fixing typos in the user's own words is correct and expected: "I did 100 pushups every day for a month" → "100 PUSHUPS" is faithful. A smaller tag line with more of the user's words is fine. Do not ask for the full title. Translating or transliterating the user's own words is fine. Unfaithful means: new words, claims, numbers or slogans the user never wrote ("IDEAS BLOCKED" for "Zero Project Ideas"), lettering that misstates the subject, or junk such as a placeholder tag line ("/", "null").
- A described scene or artwork with no title may have no lettering, or a hook from the user's words; both are fine. A request with a title or topic should have lettering.
Lettering never counts toward missing_elements or added_restrictions; judge it only here. "The image has no lettering" is not a restriction.

pass: true only when missing_elements and added_restrictions are empty, archetype_fit is not "no", and headline_faithful is true.`;

export const judgeGeneration = async (c: {
  request: string;
  archetype: string | undefined;
  hasPhoto: boolean;
  faceNone: boolean;
  prompt: string;
}): Promise<GenerationVerdict> => {
  const completion = await client.chat.completions.parse({
    model: JUDGE_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: GENERATION_RUBRIC },
      {
        role: 'user',
        content: `USER REQUEST:\n${c.request.slice(0, 6000)}\n\nCHOSEN ARCHETYPE: ${c.archetype ?? 'none'}\nPHOTO OF THE USER ATTACHED: ${c.hasPhoto ? (c.faceNone ? 'yes, but they asked not to appear' : 'yes, they want to appear') : 'no'}\n\nFINAL PROMPT:\n${c.prompt}`,
      },
    ],
    response_format: zodResponseFormat(generationVerdict, 'verdict'),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) throw new Error('Judge returned no verdict');
  return parsed;
};

const editVerdict = z.object({
  faithful: z.boolean().describe('The change states what the user asked, no more and no less.'),
  widened: z.array(z.string()).describe('Changes the prompt makes that the user did not ask for.'),
  wrongly_kept: z
    .array(z.string())
    .describe('Aspects the prompt says to preserve although the user asked to change them.'),
  pass: z.boolean(),
  reason: z.string(),
});

export type EditVerdict = z.infer<typeof editVerdict>;

const EDIT_RUBRIC = `You audit edit prompts for an image model. The user sent a follow-up message about an existing thumbnail (you do not see the image). The prompt states the change and lists what must stay the same.

faithful: the change says what the user asked for, concretely, without inventing extra changes. A reasonable concrete reading of a vague message is fine.
widened: anything the prompt changes beyond the user's ask.
wrongly_kept: anything the prompt says to preserve that the user explicitly asked to change (for example "preserving the background" when the user asked for a new background).
pass: true only when faithful is true and both lists are empty.`;

export const judgeEdit = async (c: {
  request: string;
  prompt: string;
}): Promise<EditVerdict> => {
  const completion = await client.chat.completions.parse({
    model: JUDGE_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: EDIT_RUBRIC },
      { role: 'user', content: `USER MESSAGE:\n${c.request}\n\nEDIT PROMPT:\n${c.prompt}` },
    ],
    response_format: zodResponseFormat(editVerdict, 'verdict'),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) throw new Error('Judge returned no verdict');
  return parsed;
};
