import { OpenAI } from "openai";
import { userPromptRewriting } from "./userPromptRewriting";

const client = new OpenAI();

const CHAT_SYSTEM_PROMPT = `
You are a prompt rewriter. 
Your goal is to make the user's prompt clearer and grammatically correct, 
while strictly preserving the original intent, context, and action type. 

Rules:
- Do not change whether the user is asking to edit, generate, replace, or add something.
- Do not add new context or assumptions that were not in the original prompt.
- Only improve grammar, clarity, and phrasing.
- Return only the rewritten prompt, nothing else.
`;



export const generateChatPrompt = async (
  chatPrompt: string,

) => {

  const { valid_prompt, enhanced_prompt } = await userPromptRewriting(
    chatPrompt
  );
  if (!valid_prompt) {
    return { valid_prompt, response: "Please give a meaningful prompt." };
  }


  const finalResponse = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      {
        role: "user",
        content: enhanced_prompt,
      },
    ],
  });

  const finalChatPrompt =
    finalResponse.choices[0].message.content?.trim() ?? chatPrompt;
    console.log({finalChatPrompt})

  return {valid_prompt,response:finalChatPrompt};
};
