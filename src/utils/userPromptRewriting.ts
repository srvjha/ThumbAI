import { OpenAI } from 'openai';

const client = new OpenAI();

const USER_SYSTEM_PROMPT = `
You are a helpful assistant that rewrites user queries into clearer, concise, 
well-structured text without changing their intent. 
Only Specify the Topic Thumbnail.
If Requirement Mentioned add that as well.
If the prompt has no meaning, mark it invalid.

Guidelines:
- Preserve the meaning.
- Fix grammar, spelling, punctuation.
- Remove filler/repetition.
- Do NOT explain or answer the prompt.


Output strictly in JSON:
{
  "valid_prompt": true/false,
  "enhanced_prompt": "rewritten prompt"
}
`;

export const userPromptRewriting = async (prompt: string) => {
  const userRewriteResponse = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: USER_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' }, // <--- ensures valid JSON
  });

  let raw = userRewriteResponse.choices[0].message.content ?? '';

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed.enhanced_prompt.length > 500 ||
      /here('|’)s|step|follow|to become|you should/i.test(
        parsed.enhanced_prompt,
      )
    ) {
      return { valid_prompt: true, enhanced_prompt: prompt }; // fallback
    }
    console.log({ parsed });
    return parsed;
  } catch {
    return { valid_prompt: true, enhanced_prompt: prompt }; // safe fallback
  }
};
