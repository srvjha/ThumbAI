"use server"
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

const blogDetectionSchema = z.object({
    url: z.string().describe("URL of the blog"),
    isBlog: z.boolean().describe("Is the URL a blog or not?"),
    reason: z.string().describe("Reason for the detection").min(20, "Reason must be at least 20 characters long"),
});

const blogDetectorAgent = new Agent({
    name: 'Blog Detector',
    instructions: 'You are a blog detector. You will be given a URL and you will detect if it is a blog or not.',
    outputType: blogDetectionSchema,
    model: 'gpt-4.1-mini'
});

export const detectBlog = async (url: string) => {
    const result = await run(blogDetectorAgent, url);
    return result.finalOutput;
};



