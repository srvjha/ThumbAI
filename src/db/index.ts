import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Taken from the validated env rather than read implicitly by Prisma.
    // Without this the module never touches env.ts, so a missing DATABASE_URL
    // slipped past validation and surfaced as a Prisma stack trace on every
    // request instead of one clear message at startup.
    datasourceUrl: env.DATABASE_URL,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
