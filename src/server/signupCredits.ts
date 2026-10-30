import 'server-only';
import crypto from 'crypto';
import net from 'net';
import MailChecker from 'mailchecker';
import { CREDIT_TX_TYPE, Prisma, type User } from '@prisma/client';
import { db } from '@/db';
import { env } from '@/config/env';
import { FREE_PLAN } from '@/config/plans';
import { applyCreditChange } from '@/server/credits';

/**
 * The free signup credits, decided on the user's first authenticated request
 * rather than in the Clerk webhook — that request is the only place we
 * reliably see the client's IP.
 *
 * A refusal only withholds the free credits. The account works, and the
 * user can still buy credits, so a false positive costs nothing but a
 * purchase.
 */

/** Free grants allowed per IP (or IPv6 /64) within each window. */
const IP_LIMITS = [
  { windowMs: 24 * 60 * 60 * 1000, max: 3 },
  { windowMs: 30 * 24 * 60 * 60 * 1000, max: 6 },
];

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

export type RefusalReason = 'disposable_email' | 'email_reused' | 'ip_limit';

/**
 * Collapses the aliases one mailbox can sign up under: case, +tags, and
 * Gmail's ignored dots and googlemail.com. The backfill in
 * prisma/migrations/*_signup_credit_checks mirrors this in SQL.
 */
export const normalizeEmail = (
  email: string,
): { normalized: string; domain: string } => {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf('@');
  let local = lower.slice(0, at).replace(/\+.*$/, '');
  let domain = lower.slice(at + 1);

  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }

  return { normalized: `${local}@${domain}`, domain };
};

/** The caller's IP as Vercel reports it, or null outside a request. */
export const clientIp = (headers: Headers): string | null => {
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  const forwarded = headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : null;
};

/**
 * What counts as "one network". IPv4 is the address itself. IPv6 is its
 * /64, since a single device can rotate through addresses inside one.
 */
export const ipBucket = (ip: string): string | null => {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  if (net.isIPv4(ip)) return ip;
  if (!net.isIPv6(ip)) return null;

  // Expand "::" so the first four hextets are always present.
  const [head, tail = ''] = ip.toLowerCase().split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = 8 - headParts.length - tailParts.length;
  const full = [...headParts, ...Array(missing).fill('0'), ...tailParts];
  return `${full.slice(0, 4).map((h) => h.padStart(4, '0')).join(':')}::/64`;
};

let warnedNoSalt = false;

/**
 * Keyed hash of the IP bucket, so raw addresses are never stored. Null when
 * SIGNUP_IP_SALT isn't set, which disables the IP limit rather than storing
 * a reversible unsalted hash.
 */
export const hashIp = (ip: string | null): string | null => {
  const salt = env.SIGNUP_IP_SALT;
  if (!salt) {
    if (!warnedNoSalt && process.env.NODE_ENV === 'production') {
      console.warn('[signup] SIGNUP_IP_SALT is not set; IP limits are off.');
      warnedNoSalt = true;
    }
    return null;
  }
  const bucket = ip ? ipBucket(ip) : null;
  if (!bucket) return null;
  return crypto.createHmac('sha256', salt).update(bucket).digest('hex');
};

/** Decides the grant. Read-only; the caller records the outcome. */
export const decideSignupCredits = async (
  tx: Prisma.TransactionClient,
  { normalized, email, ipHash }: { normalized: string; email: string; ipHash: string | null },
): Promise<{ granted: true } | { granted: false; reason: RefusalReason }> => {
  if (!MailChecker.isValid(email)) {
    return { granted: false, reason: 'disposable_email' };
  }

  const priorForEmail = await tx.signupCreditAttempt.count({
    where: { email_normalized: normalized, granted: true },
  });
  if (priorForEmail > 0) {
    return { granted: false, reason: 'email_reused' };
  }

  if (ipHash) {
    for (const { windowMs, max } of IP_LIMITS) {
      const recent = await tx.signupCreditAttempt.count({
        where: {
          ip_hash: ipHash,
          granted: true,
          createdAt: { gte: new Date(Date.now() - windowMs) },
        },
      });
      if (recent >= max) {
        return { granted: false, reason: 'ip_limit' };
      }
    }
  }

  return { granted: true };
};

/**
 * Decides and records the user's signup credits, once. Returns the user as
 * it stands afterwards. Concurrent first requests are safe: the attempt's
 * unique user_id lets exactly one of them commit.
 */
export const ensureSignupCredits = async (
  user: User,
  headers: Headers,
): Promise<User> => {
  if (user.signup_checked_at) return user;

  const { normalized, domain } = normalizeEmail(user.email);
  const ipHash = hashIp(clientIp(headers));

  try {
    await db.$transaction(async (tx) => {
      // Users created by the old webhook during a deploy were granted
      // already; record that rather than granting twice.
      const alreadyGranted = await tx.creditTransaction.count({
        where: { user_id: user.id, type: CREDIT_TX_TYPE.SIGNUP_GRANT },
      });

      const decision = alreadyGranted
        ? ({ granted: true } as const)
        : await decideSignupCredits(tx, {
            normalized,
            email: user.email,
            ipHash,
          });

      await tx.signupCreditAttempt.create({
        data: {
          user_id: user.id,
          email_normalized: normalized,
          email_domain: domain,
          ip_hash: ipHash,
          granted: decision.granted,
          reason: decision.granted ? null : decision.reason,
        },
      });

      if (decision.granted && !alreadyGranted) {
        await applyCreditChange(tx, {
          userId: user.id,
          type: CREDIT_TX_TYPE.SIGNUP_GRANT,
          amount: FREE_PLAN.credits,
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: { signup_checked_at: new Date() },
      });
    });
  } catch (err) {
    const lostRace =
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002';
    if (!lostRace) throw err;
  }

  return db.user.findUniqueOrThrow({ where: { id: user.id } });
};

/** Why the user's free credits were refused, for the studio banner. */
export const signupRefusal = async (
  userId: string,
): Promise<RefusalReason | null> => {
  const attempt = await db.signupCreditAttempt.findUnique({
    where: { user_id: userId },
    select: { granted: true, reason: true },
  });
  return attempt && !attempt.granted
    ? (attempt.reason as RefusalReason)
    : null;
};
