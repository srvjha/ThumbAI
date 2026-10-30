import { execFileSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { TEST_DATABASE_URL } from './test-db-url';

/** Creates the test database if needed and brings it to the latest migration. */
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.slice(1);

  if (!/^[a-z0-9_]+$/i.test(dbName) || !dbName.includes('test')) {
    throw new Error(
      `Refusing to run tests against "${dbName}": the name must contain "test".`,
    );
  }

  const admin = new URL(TEST_DATABASE_URL);
  admin.pathname = '/postgres';
  const client = new PrismaClient({ datasourceUrl: admin.toString() });
  try {
    const existing = await client.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (existing.length === 0) {
      await client.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.$disconnect();
  }

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}
