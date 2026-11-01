import { TEST_DATABASE_URL } from './test-db-url';

/**
 * Placeholder values so src/config/env.ts validates. Nothing here reaches a
 * real service: tests that touch Fal, OpenAI or Dodo mock those modules.
 * The Dodo webhook key is a real input, though — tests sign payloads with it.
 */
Object.assign(process.env, {
  DATABASE_URL: TEST_DATABASE_URL,
  AI_GATEWAY_API_KEY: 'test',
  OPENAI_API_KEY: 'test',
  GEMINI_API_KEY: 'test',
  FAL_KEY: 'test',
  CLERK_SECRET_KEY: 'test',
  NEXT_CLERK_WEBHOOK_SECRET: 'whsec_test',
  DODO_PAYMENTS_API_KEY: 'dodo_test',
  // Standard Webhooks secret: whsec_ + base64.
  DODO_PAYMENTS_WEBHOOK_KEY:
    'whsec_' + Buffer.from('dodo-webhook-secret-for-tests').toString('base64'),
  DODO_PRODUCT_CREATOR_PRO: 'pdt_creator_pro_test',
  DODO_PRODUCT_BUSINESS_ELITE: 'pdt_business_elite_test',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test',
  NEXT_PUBLIC_FAL_WEBHOOK_URL: 'https://example.test',
  SIGNUP_IP_SALT: 'signup-ip-salt-for-tests',
});
