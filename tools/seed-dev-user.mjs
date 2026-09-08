/**
 * Seed a local development user.
 *
 * The Clerk register webhook cannot reach localhost, so signing in locally
 * leaves you with no User row — and every API call returns 401 because
 * requireUser() finds nothing. This creates that row directly.
 *
 * Find your Clerk user id in the Clerk dashboard, or in the session claims.
 *
 *   node --env-file=.env tools/seed-dev-user.mjs user_xxx you@example.com
 *
 * Refuses to run against a non-local database.
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL ?? '';
if (!/localhost|127\.0\.0\.1|host\.docker\.internal/.test(url)) {
  console.error('Refusing to seed: DATABASE_URL does not look local.');
  console.error('This is a development-only helper.');
  process.exit(1);
}

const [clerkId, email] = process.argv.slice(2);
if (!clerkId) {
  console.error('Usage: node --env-file=.env tools/seed-dev-user.mjs <clerk_user_id> [email]');
  process.exit(1);
}

const db = new PrismaClient({ log: ['error'] });
try {
  const user = await db.user.upsert({
    where: { clerk_id: clerkId },
    update: { credits: 100, role: 'ADMIN', plan: 'PAID' },
    create: {
      clerk_id: clerkId,
      email: email ?? 'dev@localhost',
      fullName: 'Local Dev',
      credits: 100,
      role: 'ADMIN',
      plan: 'PAID',
      last_active_at: new Date(),
    },
  });
  console.log('Seeded local user:', {
    id: user.id, email: user.email, clerk_id: user.clerk_id,
    role: user.role, credits: user.credits,
  });
} finally {
  await db.$disconnect();
}
