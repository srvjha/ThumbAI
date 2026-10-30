/**
 * Tests run against their own database on the docker-compose Postgres, never
 * the one `pnpm dev` uses. Override with TEST_DATABASE_URL (CI does).
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://thumbai:thumbai@localhost:5433/thumbai_test';
