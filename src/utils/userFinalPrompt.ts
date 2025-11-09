import { OpenAI } from 'openai';
import { userPromptRewriting } from './userPromptRewriting';
import { THUMBNAIL_DESIGN_INSTRUCTIONS } from './prompts/thumbnail';
const client = new OpenAI();

export const generateThumbnailPrompt = async (
  rawUserPrompt: string,
  choices: string,
  rawUserChoice: any,
) => {
  //  Rewriting user prompt
  const { valid_prompt, enhanced_prompt } =
    await userPromptRewriting(rawUserPrompt);
  if (!valid_prompt) {
    return { valid_prompt, response: 'Please give a meaningfull prompt.' };
  }

  //  Generating final thumbnail design instructions
  const finalResponse = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: THUMBNAIL_DESIGN_INSTRUCTIONS },
      {
        role: 'user',
        content: `
          You are a Thumbnail Prompt Assistant. 
          Your task is to write short, clear, and meaningful thumbnail prompts based on the user's requirements. 
         Focus only on refining the user's given input — do not add extra details or your own ideas.

         Thumbnail Topic: ${enhanced_prompt}
         Choice Type: ${choices}
  ${
    choices.trim() === 'form'
      ? `User Selection: ${JSON.stringify(rawUserChoice, null, 2)}`
      : ''
  }
  `,
      },
    ],
  });

  const finalThumbnailPrompt =
    finalResponse.choices[0].message.content?.trim() ?? enhanced_prompt;

  return { valid_prompt, response: finalThumbnailPrompt };
};
