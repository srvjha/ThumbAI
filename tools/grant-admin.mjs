/**
 * Inspect users, and optionally promote one to ADMIN with a credit top-up.
 *
 * Run with Node's env-file flag so DATABASE_URL is loaded from .env:
 *
 *   # 1. See who exists (read-only)
 *   node --env-file=.env scripts/grant-admin.mjs
 *
 *   # 2. Promote a specific account
 *   node --env-file=.env scripts/grant-admin.mjs you@example.com
 *   node --env-file=.env scripts/grant-admin.mjs you@example.com 100
 *
 * Deliberately requires an explicit email: matching on a name like "saurav"
 * could hit the wrong row, and this grants admin access.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const [email, creditsArg] = process.argv.slice(2);
const credits = creditsArg === undefined ? 100 : Number(creditsArg);

try {
  if (!email) {
    const users = await db.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, credits: true, plan: true },
      orderBy: { createdAt: 'asc' },
    });

    if (users.length === 0) {
      console.log('No users yet. Sign up in the app first — the Clerk');
      console.log('register webhook creates the row.');
    } else {
      console.table(users);
      console.log('\nPromote one with:');
      console.log('  node --env-file=.env scripts/grant-admin.mjs <email> [credits]');
    }
    process.exit(0);
  }

  if (!Number.isInteger(credits) || credits < 0) {
    console.error(`Credits must be a non-negative integer, got: ${creditsArg}`);
    process.exit(1);
  }

  // Email is not unique in the schema, and this database already contains two
  // rows sharing one address (two distinct Clerk accounts). findFirst would
  // silently pick one of them, so match on id too and refuse when ambiguous.
  const matches = await db.user.findMany({
    where: { OR: [{ email }, { id: email }] },
    orderBy: { createdAt: 'asc' },
  });

  if (matches.length === 0) {
    console.error(`No user matching ${email}.`);
    console.error('Run without arguments to list existing users.');
    process.exit(1);
  }

  if (matches.length > 1) {
    console.error(`${matches.length} users share that email. Re-run with the id:`);
    for (const m of matches) {
      console.error(`  ${m.id}  role=${m.role} credits=${m.credits} clerk=${m.clerk_id}`);
    }
    process.exit(1);
  }

  const user = matches[0];

  console.log('Before:', {
    email: user.email, role: user.role, credits: user.credits, plan: user.plan,
  });

  // Credits are SET, not incremented, so re-running is idempotent.
  const updated = await db.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN', credits, plan: 'PAID' },
  });

  console.log('After: ', {
    email: updated.email, role: updated.role, credits: updated.credits, plan: updated.plan,
  });
} finally {
  await db.$disconnect();
}
