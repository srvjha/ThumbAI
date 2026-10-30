import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { FREE_PLAN } from '@/config/plans';
import {
  clientIp,
  ensureSignupCredits,
  hashIp,
  ipBucket,
  normalizeEmail,
  signupRefusal,
} from '@/server/signupCredits';
import { creditsOf, expectLedgerBalanced, resetDb } from '../../test/factories';

beforeEach(resetDb);

/** A user as the Clerk webhook now creates them: unchecked, zero credits. */
const newUser = (email = `${randomUUID()}@example.com`) =>
  db.user.create({
    data: {
      email,
      fullName: 'New User',
      clerk_id: `user_${randomUUID()}`,
      credits: 0,
      last_active_at: new Date(),
    },
  });

const fromIp = (ip: string) => new Headers({ 'x-real-ip': ip });

describe('normalizeEmail', () => {
  it.each([
    ['Alice@Example.com', 'alice@example.com'],
    ['alice+promo@example.com', 'alice@example.com'],
    ['a.l.i.c.e@gmail.com', 'alice@gmail.com'],
    ['A.Lice+x@GoogleMail.com', 'alice@gmail.com'],
    ['a.lice@outlook.com', 'a.lice@outlook.com'],
  ])('%s → %s', (email, normalized) => {
    expect(normalizeEmail(email).normalized).toBe(normalized);
  });

  it('agrees with the SQL backfill in the migration', async () => {
    const emails = [
      'Alice@Example.com',
      'bob+tag+more@example.com',
      'c.a.r.o.l@gmail.com',
      'D.ave+x@GoogleMail.com',
      ' eve@Example.org ',
    ];
    for (const email of emails) await newUser(email);

    const dir = path.join(process.cwd(), 'prisma/migrations');
    const migration = readdirSync(dir).find((d) =>
      d.endsWith('_signup_credit_checks'),
    )!;
    const sql = readFileSync(
      path.join(dir, migration, 'migration.sql'),
      'utf8',
    );
    const backfill = sql.slice(sql.indexOf('INSERT INTO'));
    await db.$executeRawUnsafe(backfill);

    const rows = await db.signupCreditAttempt.findMany({
      include: { user: { select: { email: true } } },
    });
    expect(rows).toHaveLength(emails.length);
    for (const row of rows) {
      const expected = normalizeEmail(row.user.email);
      expect(row.email_normalized).toBe(expected.normalized);
      expect(row.email_domain).toBe(expected.domain);
    }
  });
});

describe('ipBucket', () => {
  it('keeps IPv4 as is', () => {
    expect(ipBucket('203.0.113.7')).toBe('203.0.113.7');
  });

  it('unwraps IPv4-mapped IPv6', () => {
    expect(ipBucket('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('groups IPv6 by /64', () => {
    const a = ipBucket('2001:db8:1:2:aaaa::1');
    expect(a).toBe('2001:0db8:0001:0002::/64');
    expect(ipBucket('2001:db8:1:2:ffff:ffff:ffff:ffff')).toBe(a);
    expect(ipBucket('2001:db8:1:3::1')).not.toBe(a);
    expect(ipBucket('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
  });

  it('rejects garbage', () => {
    expect(ipBucket('not-an-ip')).toBeNull();
  });
});

describe('clientIp / hashIp', () => {
  it('prefers x-real-ip, then the first x-forwarded-for hop', () => {
    expect(
      clientIp(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })),
    ).toBe('198.51.100.1');
    expect(
      clientIp(
        new Headers({
          'x-real-ip': '203.0.113.9',
          'x-forwarded-for': '1.1.1.1',
        }),
      ),
    ).toBe('203.0.113.9');
    expect(clientIp(new Headers())).toBeNull();
  });

  it('hashes the bucket, never storing the raw address', () => {
    const hash = hashIp('2001:db8:1:2::1');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp('2001:db8:1:2::99')).toBe(hash);
    expect(hashIp(null)).toBeNull();
  });
});

describe('ensureSignupCredits', () => {
  it('grants the free credits once and records the attempt', async () => {
    const user = await newUser();

    const after = await ensureSignupCredits(user, fromIp('203.0.113.1'));
    await ensureSignupCredits(after, fromIp('203.0.113.1'));

    expect(after.signup_checked_at).not.toBeNull();
    expect(await creditsOf(user.id)).toBe(FREE_PLAN.credits);
    expect(await signupRefusal(user.id)).toBeNull();
    await expectLedgerBalanced(user.id);
  });

  it('grants exactly once under concurrent first requests', async () => {
    const user = await newUser();

    await Promise.all(
      Array.from({ length: 5 }, () =>
        ensureSignupCredits(user, fromIp('203.0.113.1')),
      ),
    );

    expect(await creditsOf(user.id)).toBe(FREE_PLAN.credits);
    expect(await db.signupCreditAttempt.count()).toBe(1);
    await expectLedgerBalanced(user.id);
  });

  it('refuses a disposable address', async () => {
    const user = await newUser(`${randomUUID()}@mailinator.com`);

    await ensureSignupCredits(user, fromIp('203.0.113.1'));

    expect(await creditsOf(user.id)).toBe(0);
    expect(await signupRefusal(user.id)).toBe('disposable_email');
  });

  it('refuses an alias of an email that already claimed', async () => {
    const first = await newUser('jane.doe@gmail.com');
    await ensureSignupCredits(first, fromIp('203.0.113.1'));
    // The first account is deleted; its address is freed for reuse.
    await db.user.update({
      where: { id: first.id },
      data: { email: 'deleted@deleted.invalid' },
    });

    const second = await newUser('JaneDoe+again@googlemail.com');
    await ensureSignupCredits(second, fromIp('198.51.100.1'));

    expect(await creditsOf(second.id)).toBe(0);
    expect(await signupRefusal(second.id)).toBe('email_reused');
  });

  it('refuses the fourth grant from one network in a day', async () => {
    const users = await Promise.all(Array.from({ length: 4 }, () => newUser()));
    // Different addresses in one IPv6 /64 count as one network.
    for (const [i, user] of users.entries()) {
      await ensureSignupCredits(user, fromIp(`2001:db8:1:2::${i + 1}`));
    }

    const credits = await Promise.all(users.map((u) => creditsOf(u.id)));
    const free = FREE_PLAN.credits;
    expect(credits).toEqual([free, free, free, 0]);
    expect(await signupRefusal(users[3].id)).toBe('ip_limit');
  });

  it('applies the 30-day cap across days', async () => {
    const ipHash = hashIp('203.0.113.50')!;
    const earlier = await Promise.all(
      Array.from({ length: 6 }, () => newUser()),
    );
    await db.signupCreditAttempt.createMany({
      data: earlier.map((u) => ({
        user_id: u.id,
        email_normalized: normalizeEmail(u.email).normalized,
        email_domain: 'example.com',
        ip_hash: ipHash,
        granted: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      })),
    });

    const user = await newUser();
    await ensureSignupCredits(user, fromIp('203.0.113.50'));

    expect(await signupRefusal(user.id)).toBe('ip_limit');
  });

  it('does not grant again to a user the old webhook already granted', async () => {
    const user = await newUser();
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { credits: 3 } }),
      db.creditTransaction.create({
        data: {
          user_id: user.id,
          type: 'SIGNUP_GRANT',
          amount: 3,
          balance_after: 3,
        },
      }),
    ]);

    await ensureSignupCredits(user, fromIp('203.0.113.1'));

    expect(await creditsOf(user.id)).toBe(3);
    expect(await signupRefusal(user.id)).toBeNull();
    await expectLedgerBalanced(user.id);
  });
});
