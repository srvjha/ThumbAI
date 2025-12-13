"use server"
import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { THUMBNAIL_DESIGN_INSTRUCTIONS } from '@/utils/instructions/thumbnail';
import { BLOG_DESIGN_INSTRUCTIONS } from '@/utils/instructions/blog';

const thumbnailPromptSchema = z.object({
    valid_prompt: z.boolean().describe("Set to false if the prompt is meaningless or invalid, true otherwise."),
    response: z.string().describe("The detailed, step-by-step design prompt if valid. If invalid, a polite error message."),
});

const generateThumbnailPromptAgent = new Agent({
    name: 'Thumbnail Prompt Generator',
    instructions: `
    You are an expert AI Design Assistant specialized in creating detailed image generation prompts.
    
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
    choices: string,
    rawUserChoice: any,
    type: 'youtube' | 'blog' = 'youtube'
) => {
    const designInstructions = type === 'blog' ? BLOG_DESIGN_INSTRUCTIONS : THUMBNAIL_DESIGN_INSTRUCTIONS;

    const context = `
    ${designInstructions}

    ---
    User Request Data:
    User Prompt: ${rawUserPrompt}
    Choice Type: ${choices}
    ${choices === 'form' ? `User Selection: ${JSON.stringify(rawUserChoice, null, 2)}` : ''}
  `;

    const result = await run(generateThumbnailPromptAgent, context);

    if (!result.finalOutput) {
        return { valid_prompt: false, response: "Failed to generate prompt from agent." };
    }
    return result.finalOutput;
};
