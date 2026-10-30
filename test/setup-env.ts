import { TEST_DATABASE_URL } from './test-db-url';

/**
 * Placeholder values so src/config/env.ts validates. Nothing here reaches a
 * real service: tests that touch Fal, OpenAI or Razorpay mock those modules.
 * The Razorpay secrets are real inputs, though — tests sign payloads with them.
 */
Object.assign(process.env, {
  DATABASE_URL: TEST_DATABASE_URL,
  AI_GATEWAY_API_KEY: 'test',
  OPENAI_API_KEY: 'test',
  GEMINI_API_KEY: 'test',
  FAL_KEY: 'test',
  CLERK_SECRET_KEY: 'test',
  NEXT_CLERK_WEBHOOK_SECRET: 'whsec_test',
  RAZORPAY_KEY_SECRET: 'rzp_key_secret_test',
  RAZORPAY_WEBHOOK_SECRET: 'rzp_webhook_secret_test',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test',
  NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test',
  NEXT_PUBLIC_FAL_WEBHOOK_URL: 'https://example.test',
  SIGNUP_IP_SALT: 'signup-ip-salt-for-tests',
});
