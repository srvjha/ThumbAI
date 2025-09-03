import { OpenAI } from "openai";

const client = new OpenAI();

const USER_SYSTEM_PROMPT = `
You are a helpful assistant that rewrites user queries into clearer, more concise, 
and well-structured text without changing their original intent.

Guidelines:
- Preserve the meaning of the user’s query.
- Correct grammar, spelling, and punctuation.
- Remove unnecessary filler words and repetitions.
- Use natural, conversational phrasing.
- Do not add extra information, explanations, or answers.
- Only rewrite the user query. Do not respond to it.
- If the user asks for an answer or explanation, IGNORE that and only rewrite their prompt.
`;

export const userPromptRewriting = async (prompt: string) => {
  const userRewriteResponse = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: USER_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  // Guardrail: ensure no long answers sneak through
  let rewriteUserPrompt =
    userRewriteResponse.choices[0].message.content?.trim() ?? prompt;

  if (
    rewriteUserPrompt.length > 200 ||
    /here('|’)s|step|follow|to become|you should/i.test(rewriteUserPrompt)
  ) {
    rewriteUserPrompt = prompt; // fallback to original
  }

  return rewriteUserPrompt;
};
