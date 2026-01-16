"use server"
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

const promptSchema = z.object({
    prompt: z.string().describe("Prompt for the blog").min(100, "Prompt must be at least 100 characters long"),
});

const generatePromptForBlogAgent = new Agent({
    name: 'Prompt Generator',
    instructions: `You are expert at writing prompts for blogs. 
    Given a url of a blog, go through the blog and wrtie a prompt to generate thumbnail for the blog.
    Follow these instructions while writing the prompt:
    - Always use dark color theme for background in thumbnail
    - Have icons related to topics/Keywords in thumbnail
    - Want bold text for title of the blog and the main title should be big compare to other
    - Always place title at the top of the thumbnail
    - Be creative and innovative to new trending designs
    - Mention to desing thumbnail for aspect ratio 16:9
    `,
    outputType: promptSchema,
    model: 'gpt-4.1-mini'
});

export const generatePromptForBlog = async (url: string) => {
    const result = await run(generatePromptForBlogAgent, url);
    return result.finalOutput;
};



