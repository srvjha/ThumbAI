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
- Do not add extra information or assumptions.

`;


export const userPromptRewriting = async (prompt: string) => {
  const userRewriteResponse = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: USER_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const rewriteUserPrompt =
    userRewriteResponse.choices[0].message.content?.trim() ?? prompt;

  return rewriteUserPrompt;
};
