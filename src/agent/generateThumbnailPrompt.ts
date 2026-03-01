'use server';
import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { MODEL } from '@prisma/client';
import { TEXT_TO_IMAGE_INSTRUCTIONS } from '@/utils/instructions/workflows/textToImage';
import { IMAGE_TO_IMAGE_INSTRUCTIONS } from '@/utils/instructions/workflows/imageToImage';
import { URL_TO_IMAGE_INSTRUCTIONS } from '@/utils/instructions/workflows/urlToImage';

const thumbnailPromptSchema = z.object({
  valid_prompt: z
    .boolean()
    .describe(
      'Set to false if the prompt is meaningless or invalid, true otherwise.',
    ),
  response: z
    .string()
    .describe(
      'The detailed, step-by-step design prompt if valid. If invalid, a polite error message.',
    ),
});

const generateThumbnailPromptAgent = new Agent({
  name: 'Thumbnail Prompt Generator',
  instructions: `
    You are an expert Design Assistant specialized in creating detailed image generation prompts.
    
    Your goal is to parse the User's Request and the provided Design Instructions (Context) to output a structured design prompt.
    
    You are also responsible for validating the user's prompt. 
    If the prompt is meaningless, gibberish, or empty, set valid_prompt to false and provide a polite message asking for a meaningful prompt in the response field.
    Otherwise, set valid_prompt to true and generate the design instructions as per the rules provided in the user context.
  `,
  outputType: thumbnailPromptSchema,
  model: 'gpt-4o-mini',
});

export const generateThumbnailPrompt = async (
  rawUserPrompt: string,
  workflow: string,
  choicesMode: 'random' | 'personalized',
  rawUserChoice?: any,
) => {
  let designInstructions = '';
  if (workflow === MODEL.TEXT_TO_IMAGE || workflow === 'Text-to-Image') {
    designInstructions = TEXT_TO_IMAGE_INSTRUCTIONS;
  } else if (
    workflow === MODEL.IMAGE_TO_IMAGE ||
    workflow === 'Image-to-Image'
  ) {
    designInstructions = IMAGE_TO_IMAGE_INSTRUCTIONS;
  } else if (workflow === MODEL.URL_TO_IMAGE || workflow === 'Url-to-Image') {
    designInstructions = URL_TO_IMAGE_INSTRUCTIONS;
  } else {
    designInstructions = TEXT_TO_IMAGE_INSTRUCTIONS; // fallback
  }

  const userSelectionText =
    choicesMode === 'personalized' && rawUserChoice
      ? `\nUser Selection (Personalized Choices): ${JSON.stringify(rawUserChoice, null, 2)}`
      : '';

  const context = `
    ${designInstructions}
    ---
    User Prompt: ${rawUserPrompt}
    Choices Mode: ${choicesMode}
    Workflow: ${workflow}${userSelectionText}
  `;

  const result = await run(generateThumbnailPromptAgent, context);
  if (!result.finalOutput) {
    return {
      valid_prompt: false,
      response: 'Failed to generate prompt from agent.',
    };
  }
  return result.finalOutput;
};
