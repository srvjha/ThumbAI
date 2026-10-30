import 'server-only';
import { CREDIT_TX_TYPE, PLAN, Prisma, Role } from '@prisma/client';
import { db } from '@/db';
import { ApiError } from '@/server/errors';
import { recordCreditChange } from '@/server/credits';

export const ADMIN_PAGE_SIZE = 50;

/** Largest single adjustment, so a typo can't mint a fortune. */
export const MAX_ADJUSTMENT = 10_000;

const SORTS = {
  createdAt: (order: Prisma.SortOrder) => ({ createdAt: order }),
  email: (order: Prisma.SortOrder) => ({ email: order }),
  credits: (order: Prisma.SortOrder) => ({ credits: order }),
  thumbnails: (order: Prisma.SortOrder) => ({ Thumbnail: { _count: order } }),
} satisfies Record<
  string,
  (o: Prisma.SortOrder) => Prisma.UserOrderByWithRelationInput
>;

export type AdminUserSort = keyof typeof SORTS;

const pick = <T extends string>(value: string | null, allowed: readonly T[]) =>
  allowed.find((a) => a === value);

/** Reads the list filters from a query string, ignoring anything invalid. */
export const parseUserListParams = (params: URLSearchParams) => {
  const page = Number(params.get('page'));
  return {
    q: params.get('q')?.trim().slice(0, 200) || undefined,
    role: pick(params.get('role'), Object.values(Role)),
    plan: pick(params.get('plan'), Object.values(PLAN)),
    sort:
      pick(params.get('sort'), Object.keys(SORTS) as AdminUserSort[]) ??
      'createdAt',
    order: params.get('order') === 'asc' ? ('asc' as const) : ('desc' as const),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

/**
 * One page of users plus whole-table totals. Deleted accounts are left out:
 * their personal fields are gone and they can't sign in.
 */
export const listUsers = async ({
  q,
  role,
  plan,
  sort,
  order,
  page,
}: ReturnType<typeof parseUserListParams>) => {
  const where: Prisma.UserWhereInput = {
    deleted_at: null,
    ...(role && { role }),
    ...(plan && { plan }),
    ...(q && {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { id: q },
        { clerk_id: q },
      ],
    }),
  };

  const [rows, total, users, thumbnails, credits] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [SORTS[sort](order), { id: 'asc' }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        credits: true,
        plan: true,
        role: true,
        createdAt: true,
        _count: { select: { Thumbnail: true } },
      },
    }),
    db.user.count({ where }),
    db.user.count({ where: { deleted_at: null } }),
    db.thumbnail.count(),
    db.user.aggregate({
      where: { deleted_at: null },
      _sum: { credits: true },
    }),
  ]);

  return {
    users: rows.map(({ _count, ...user }) => ({
      ...user,
      thumbnailCount: _count.Thumbnail,
    })),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    stats: { users, thumbnails, credits: credits._sum.credits ?? 0 },
  };
};

/** A user with their latest generations and credit history. */
export const getUserDetail = async (id: string) => {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      Thumbnail: { orderBy: { createdAt: 'desc' }, take: 100 },
      CreditTransaction: { orderBy: { createdAt: 'desc' }, take: 100 },
      _count: { select: { Thumbnail: true } },
    },
  });
  if (!user) throw new ApiError('User not found', 404);

  return {
    id: user.id,
    email: user.email,
    credits: user.credits,
    plan: user.plan,
    role: user.role,
    createdAt: user.createdAt,
    deletedAt: user.deleted_at,
    thumbnailCount: user._count.Thumbnail,
    thumbnails: user.Thumbnail.map((thumb) => ({
      id: thumb.id,
      status: thumb.status,
      imageUrl: thumb.image_url,
      createdAt: thumb.createdAt,
      user_prompt: thumb.user_prompt,
    })),
    creditHistory: user.CreditTransaction.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balance_after,
      note: tx.note,
      createdAt: tx.createdAt,
    })),
  };
};

/**
 * Adds or removes credits by hand, through the ledger. The note records who
 * did it and why. A removal can't take the balance below zero.
 */
export const adjustCredits = async ({
  userId,
  amount,
  reason,
  adminEmail,
}: {
  userId: string;
  amount: unknown;
  reason: unknown;
  adminEmail: string;
}) => {
  if (
    typeof amount !== 'number' ||
    !Number.isInteger(amount) ||
    amount === 0 ||
    Math.abs(amount) > MAX_ADJUSTMENT
  ) {
    throw new ApiError(
      `Amount must be a non-zero whole number up to ±${MAX_ADJUSTMENT}`,
      400,
    );
  }
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new ApiError('A reason is required', 400);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { deleted_at: true },
  });
  if (!user) throw new ApiError('User not found', 404);
  if (user.deleted_at) throw new ApiError('User is deleted', 409);

  const balance = await recordCreditChange({
    userId,
    type: CREDIT_TX_TYPE.ADMIN_ADJUSTMENT,
    amount,
    note: `${reason.trim().slice(0, 500)} (by ${adminEmail})`,
    requireBalance: true,
  });
  return { credits: balance };
};
