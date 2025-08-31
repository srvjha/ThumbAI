import { OpenAI } from "openai";

const client = new OpenAI();
/** ---------------- Rewrite Query ---------------- */
const getSystemPrompt = (aspectRatio: string) => {
  const USER_REWRITE_SYSTEM_PROMPT = `
  You are a prompt optimization assistant. 
  Rephrase the user prompt into a clear, search-friendly query. 
  Keep the meaning intact and correct spelling errors if any.
  Add the aspectRatio size to generate for that particular size

  AspectRatio: ${aspectRatio}
  `;

  return USER_REWRITE_SYSTEM_PROMPT;
};

export const queryRewrting = async (prompt: string, aspectRatio: string) => {
  const userRewriteResponse = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: getSystemPrompt(aspectRatio) },
      { role: "user", content: prompt },
    ],
  });

  const rewriteUserPrompt =
    userRewriteResponse.choices[0].message.content?.trim() ?? prompt;

  return rewriteUserPrompt;
};
