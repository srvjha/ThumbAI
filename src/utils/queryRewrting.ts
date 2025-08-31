import { OpenAI } from "openai";

const client = new OpenAI();

const getSystemPrompt = (aspectRatio: string) => {
  const USER_REWRITE_SYSTEM_PROMPT = `
  You are a prompt optimization assistant. 
  Your job is to rephrase the user prompt into a clear, search-friendly, 
  image-generation-ready query while keeping the meaning intact.

  Rules:
  1. Only support aspect ratios "16:9" (landscape) and "9:16" (portrait). Ignore others.
  2. Always explicitly mention the aspect ratio in the final rewritten prompt.
  3. If aspect ratio is "16:9":
     - The composition must be landscape.
     - Content should be horizontally balanced and fill the frame width.
     - The uploaded person image (if any) must appear prominently on the **left side**, leaving space on the right for text or other elements.
  4. If aspect ratio is "9:16":
     - The composition must be portrait.
     - Content should be vertically balanced and fill the frame height.
     - The uploaded person image (if any) must appear in the **bottom half**, leaving the top half for text or design elements.
  5. Always ensure the uploaded person image is visible, clear, and naturally integrated (not cropped awkwardly, not distorted).
  6. Correct spelling and grammar if needed, but do not change the user’s intent.
  
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
