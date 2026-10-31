import 'server-only';
import { OpenAI } from 'openai';

/**
 * Fal proxies OpenRouter behind an OpenAI-compatible API, so models from
 * other vendors ("anthropic/claude-opus-5.5") run on the Fal account with the
 * same SDK, structured outputs and image inputs, and no extra API key.
 */
const FAL_LLM_BASE_URL = 'https://fal.run/openrouter/router/openai/v1';

let openai: OpenAI | undefined;
let viaFal: OpenAI | undefined;

/**
 * The client for a prompt model: vendor-prefixed ids go through Fal, bare
 * ids ("gpt-4.1-mini") straight to OpenAI.
 */
export const llmFor = (model: string): OpenAI => {
  if (!model.includes('/')) return (openai ??= new OpenAI());
  return (viaFal ??= new OpenAI({
    baseURL: FAL_LLM_BASE_URL,
    apiKey: process.env.FAL_KEY,
  }));
};
