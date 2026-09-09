'use server';
import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { MODEL } from '@prisma/client';
import { TEXT_TO_IMAGE_INSTRUCTIONS } from '@/utils/instructions/workflows/textToImage';
import { IMAGE_TO_IMAGE_INSTRUCTIONS } from '@/utils/instructions/workflows/imageToImage';
import { URL_TO_IMAGE_INSTRUCTIONS } from '@/utils/instructions/workflows/urlToImage';
import { PROMPT_MODEL } from '@/config/models';

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
  needs_factual_grounding: z
    .boolean()
    .describe(
      'True when the image must depict something that has to be factually correct — an architecture or process diagram, named technologies, a real product, a logo, a recognisable place or person, current events. False for purely aesthetic or abstract compositions.',
    ),
});

const generateThumbnailPromptAgent = new Agent({
  name: 'Thumbnail Prompt Generator',
  instructions: `
You are an art director who writes prompts for image generation models.

You receive a user's request plus design instructions for the current
workflow. Produce a single, specific, detailed image prompt that follows those
instructions exactly.

Validation: if the request is empty, gibberish, or carries no discernible
subject, set valid_prompt to false and put a short, friendly explanation in
response. Otherwise set valid_prompt to true.

The value you put in response is sent verbatim to the image model. It must be
the prompt itself — never commentary about the prompt, never a preamble, never
a numbered plan addressed to a human.

Set needs_factual_grounding to true when getting the picture *right* depends
on facts the image model may not hold: an architecture or process diagram,
named tools and their real logos, a specific product, a recognisable place or
person, anything current. It costs extra latency, so leave it false for
compositions that are purely aesthetic — a mood, a colour study, an abstract
background.
  `,
  outputType: thumbnailPromptSchema,
  model: PROMPT_MODEL,
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
      needs_factual_grounding: false,
    };
  }
  return result.finalOutput;
};
