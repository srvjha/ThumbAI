import 'server-only';
import {
  ADMIN_ACTION,
  CREDIT_TX_TYPE,
  FLAG_SEVERITY,
  FLAG_SOURCE,
  GEN_STATUS,
  MODEL,
  PLAN,
  Prisma,
  Role,
  TIER,
} from '@prisma/client';
import { db } from '@/db';
import { ApiError } from '@/server/errors';
import { recordCreditChange } from '@/server/credits';

/**
 * Everything the admin panel reads and does. Prompts are deliberately never
 * returned from here: admins see whether a prompt was flagged and why, not
 * what the user wrote.
 */

export const ADMIN_PAGE_SIZE = 50;

/** Largest single adjustment, so a typo can't mint a fortune. */
export const MAX_ADJUSTMENT = 10_000;

const SEVERITY_RANK: Record<FLAG_SEVERITY, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

const worstSeverity = (flags: { severity: FLAG_SEVERITY }[]) =>
  flags.reduce<FLAG_SEVERITY | null>(
    (worst, f) =>
      !worst || SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst]
        ? f.severity
        : worst,
    null,
  );

const pick = <T extends string>(value: string | null, allowed: readonly T[]) =>
  allowed.find((a) => a === value);

const pageOf = (params: URLSearchParams) => {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const query = (params: URLSearchParams) =>
  params.get('q')?.trim().slice(0, 200) || undefined;

// ---------------------------------------------------------------- users --

const SORTS = {
  createdAt: (order: Prisma.SortOrder) => ({ createdAt: order }),
  email: (order: Prisma.SortOrder) => ({ email: order }),
  credits: (order: Prisma.SortOrder) => ({ credits: order }),
  thumbnails: (order: Prisma.SortOrder) => ({ Thumbnail: { _count: order } }),
  lastActive: (order: Prisma.SortOrder) => ({ last_active_at: order }),
} satisfies Record<
  string,
  (o: Prisma.SortOrder) => Prisma.UserOrderByWithRelationInput
>;

export type AdminUserSort = keyof typeof SORTS;

const USER_STATUSES = ['active', 'suspended', 'flagged'] as const;

/** Reads the list filters from a query string, ignoring anything invalid. */
export const parseUserListParams = (params: URLSearchParams) => ({
  q: query(params),
  role: pick(params.get('role'), Object.values(Role)),
  plan: pick(params.get('plan'), Object.values(PLAN)),
  status: pick(params.get('status'), USER_STATUSES),
  sort:
    pick(params.get('sort'), Object.keys(SORTS) as AdminUserSort[]) ??
    'createdAt',
  order: params.get('order') === 'asc' ? ('asc' as const) : ('desc' as const),
  page: pageOf(params),
});

/**
 * One page of users plus whole-table totals. Deleted accounts are left out:
 * their personal fields are gone and they can't sign in.
 */
export const listUsers = async ({
  q,
  role,
  plan,
  status,
  sort,
  order,
  page,
}: ReturnType<typeof parseUserListParams>) => {
  const where: Prisma.UserWhereInput = {
    deleted_at: null,
    ...(role && { role }),
    ...(plan && { plan }),
    ...(status === 'active' && { suspended_at: null }),
    ...(status === 'suspended' && { suspended_at: { not: null } }),
    ...(status === 'flagged' && {
      PromptFlag: { some: { resolved_at: null } },
    }),
    ...(q && {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
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
        fullName: true,
        profile_img: true,
        credits: true,
        plan: true,
        role: true,
        country: true,
        city: true,
        acquisition_source: true,
        suspended_at: true,
        last_active_at: true,
        createdAt: true,
        _count: { select: { Thumbnail: true } },
        PromptFlag: {
          where: { resolved_at: null },
          select: { severity: true },
        },
        Visitor: {
          select: { device: true, last_seen_at: true },
          orderBy: { last_seen_at: 'desc' },
        },
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
    users: rows.map(({ _count, PromptFlag, Visitor, ...user }) => {
      const lastSeen = Visitor[0]?.last_seen_at;
      return {
        id: user.id,
        email: user.email,
        name: user.fullName === 'No FullName' ? null : user.fullName,
        imageUrl: user.profile_img,
        credits: user.credits,
        plan: user.plan,
        role: user.role,
        country: user.country,
        city: user.city,
        source: user.acquisition_source,
        suspendedAt: user.suspended_at,
        createdAt: user.createdAt,
        lastActiveAt:
          lastSeen && lastSeen > user.last_active_at
            ? lastSeen
            : user.last_active_at,
        thumbnailCount: _count.Thumbnail,
        openFlags: PromptFlag.length,
        flagSeverity: worstSeverity(PromptFlag),
        devices: [...new Set(Visitor.map((v) => v.device))],
      };
    }),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    stats: { users, thumbnails, credits: credits._sum.credits ?? 0 },
  };
};

/** Everything about one user, short of what they typed. */
export const getUserDetail = async (id: string) => {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      Thumbnail: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          status: true,
          image_url: true,
          model_used: true,
          model_tier: true,
          aspect_ratio: true,
          num_of_images: true,
          error: true,
          createdAt: true,
          completed_at: true,
          _count: { select: { PromptFlag: true } },
        },
      },
      CreditTransaction: { orderBy: { createdAt: 'desc' }, take: 100 },
      Visitor: { orderBy: { last_seen_at: 'desc' }, take: 20 },
      PromptFlag: { orderBy: { createdAt: 'desc' }, take: 100 },
      Order: { orderBy: { createdAt: 'desc' }, take: 50 },
      AdminActionsOn: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { admin: { select: { email: true } } },
      },
      SignupCreditAttempt: { select: { granted: true, reason: true } },
      _count: { select: { Thumbnail: true } },
    },
  });
  if (!user) throw new ApiError('User not found', 404);

  const [byStatus, spent] = await Promise.all([
    db.thumbnail.groupBy({
      by: ['status'],
      where: { user_id: id },
      _count: { _all: true },
    }),
    db.creditTransaction.aggregate({
      where: {
        user_id: id,
        type: { in: ['GENERATION_CHARGE', 'GENERATION_REFUND'] },
      },
      _sum: { amount: true },
    }),
  ]);
  const statusCount = (s: GEN_STATUS) =>
    byStatus.find((b) => b.status === s)?._count._all ?? 0;

  return {
    id: user.id,
    email: user.email,
    name: user.fullName === 'No FullName' ? null : user.fullName,
    imageUrl: user.profile_img,
    clerkId: user.clerk_id,
    credits: user.credits,
    plan: user.plan,
    role: user.role,
    country: user.country,
    region: user.region,
    city: user.city,
    source: user.acquisition_source,
    suspendedAt: user.suspended_at,
    suspendedReason: user.suspended_reason,
    signupCredits: user.SignupCreditAttempt,
    createdAt: user.createdAt,
    lastActiveAt: user.last_active_at,
    deletedAt: user.deleted_at,
    thumbnailCount: user._count.Thumbnail,
    stats: {
      completed: statusCount('COMPLETED'),
      failed: statusCount('FAILED'),
      open: statusCount('PENDING') + statusCount('IN_PROGRESS'),
      creditsSpent: -(spent._sum.amount ?? 0),
      paid:
        user.Order.filter((o) => o.status === 'paid').reduce(
          (total, o) => total + (o.amount ?? 0),
          0,
        ) / 100,
    },
    thumbnails: user.Thumbnail.map((thumb) => ({
      id: thumb.id,
      status: thumb.status,
      imageUrl: thumb.image_url,
      workflow: thumb.model_used,
      tier: thumb.model_tier,
      aspectRatio: thumb.aspect_ratio,
      images: thumb.num_of_images,
      error: thumb.error,
      flagged: thumb._count.PromptFlag > 0,
      createdAt: thumb.createdAt,
      latencyMs: thumb.completed_at
        ? thumb.completed_at.getTime() - thumb.createdAt.getTime()
        : null,
    })),
    creditHistory: user.CreditTransaction.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balance_after,
      note: tx.note,
      createdAt: tx.createdAt,
    })),
    devices: user.Visitor.map((v) => ({
      id: v.id,
      device: v.device,
      browser: v.browser,
      os: v.os,
      country: v.country,
      region: v.region,
      city: v.city,
      source: v.utm_source ?? v.referrer_domain ?? 'direct',
      firstSeenAt: v.first_seen_at,
      lastSeenAt: v.last_seen_at,
      pageviews: v.pageviews,
    })),
    flags: user.PromptFlag.map((f) => ({
      id: f.id,
      source: f.source,
      categories: f.categories,
      score: f.score,
      severity: f.severity,
      generationId: f.thumbnail_id,
      resolvedAt: f.resolved_at,
      resolvedBy: f.resolved_by,
      createdAt: f.createdAt,
    })),
    orders: user.Order.map((o) => ({
      id: o.id,
      product: o.productName ?? o.productId,
      amount: (o.amount ?? 0) / 100,
      credits: o.credits,
      status: o.status,
      createdAt: o.createdAt,
    })),
    actions: user.AdminActionsOn.map((a) => ({
      id: a.id,
      action: a.action,
      admin: a.admin.email,
      detail: a.detail,
      createdAt: a.createdAt,
    })),
  };
};

// -------------------------------------------------------------- actions --

export interface ActingAdmin {
  id: string;
  email: string;
}

const reasonOf = (reason: unknown) => {
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new ApiError('A reason is required', 400);
  }
  return reason.trim().slice(0, 500);
};

/** The target, refusing deleted accounts, and admins when that's unsafe. */
const targetUser = async (
  userId: string,
  { allowAdmin }: { allowAdmin: boolean },
) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, deleted_at: true, suspended_at: true },
  });
  if (!user) throw new ApiError('User not found', 404);
  if (user.deleted_at) throw new ApiError('User is deleted', 409);
  if (!allowAdmin && user.role === Role.ADMIN) {
    throw new ApiError('Admins cannot be suspended', 409);
  }
  return user;
};

/**
 * Adds or removes credits by hand, through the ledger. The note records who
 * did it and why. A removal can't take the balance below zero.
 */
export const adjustCredits = async ({
  userId,
  amount,
  reason,
  admin,
}: {
  userId: string;
  amount: unknown;
  reason: unknown;
  admin: ActingAdmin;
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
  const why = reasonOf(reason);
  await targetUser(userId, { allowAdmin: true });

  const balance = await recordCreditChange({
    userId,
    type: CREDIT_TX_TYPE.ADMIN_ADJUSTMENT,
    amount,
    note: `${why} (by ${admin.email})`,
    requireBalance: true,
  });
  await db.adminAction.create({
    data: {
      admin_id: admin.id,
      target_user_id: userId,
      action: ADMIN_ACTION.ADJUST_CREDITS,
      detail: { amount, reason: why, balance },
    },
  });
  return { credits: balance };
};

/** Suspends or restores an account. Admins can't be suspended. */
export const setSuspended = async ({
  userId,
  suspended,
  reason,
  admin,
}: {
  userId: string;
  suspended: boolean;
  reason: unknown;
  admin: ActingAdmin;
}) => {
  const why = suspended ? reasonOf(reason) : null;
  const user = await targetUser(userId, { allowAdmin: false });
  if (suspended === !!user.suspended_at) {
    throw new ApiError(
      suspended ? 'User is already suspended' : 'User is not suspended',
      409,
    );
  }

  const [updated] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        suspended_at: suspended ? new Date() : null,
        suspended_reason: why,
      },
      select: { suspended_at: true, suspended_reason: true },
    }),
    db.adminAction.create({
      data: {
        admin_id: admin.id,
        target_user_id: userId,
        action: suspended ? ADMIN_ACTION.SUSPEND : ADMIN_ACTION.UNSUSPEND,
        detail: why ? { reason: why } : undefined,
      },
    }),
  ]);
  return {
    suspendedAt: updated.suspended_at,
    suspendedReason: updated.suspended_reason,
  };
};

/** Marks every open flag on a user reviewed. The flags themselves stay. */
export const resetFlags = async ({
  userId,
  admin,
}: {
  userId: string;
  admin: ActingAdmin;
}) => {
  await targetUser(userId, { allowAdmin: true });
  const [result] = await db.$transaction([
    db.promptFlag.updateMany({
      where: { user_id: userId, resolved_at: null },
      data: { resolved_at: new Date(), resolved_by: admin.email },
    }),
    db.adminAction.create({
      data: {
        admin_id: admin.id,
        target_user_id: userId,
        action: ADMIN_ACTION.RESET_FLAGS,
      },
    }),
  ]);
  return { resolved: result.count };
};

// ---------------------------------------------------------- generations --

export const parseGenerationParams = (params: URLSearchParams) => ({
  q: query(params),
  status: pick(params.get('status'), Object.values(GEN_STATUS)),
  workflow: pick(params.get('workflow'), Object.values(MODEL)),
  tier: pick(params.get('tier'), Object.values(TIER)),
  flagged: params.get('flagged') === 'true',
  page: pageOf(params),
});

/** The generation log, newest first, with what each one cost and took. */
export const listGenerations = async ({
  q,
  status,
  workflow,
  tier,
  flagged,
  page,
}: ReturnType<typeof parseGenerationParams>) => {
  const where: Prisma.ThumbnailWhereInput = {
    ...(status && { status }),
    ...(workflow && { model_used: workflow }),
    ...(tier && { model_tier: tier }),
    ...(flagged && { PromptFlag: { some: {} } }),
    ...(q && {
      OR: [
        { id: q },
        { request_id: q },
        { user_id: q },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  };

  const [rows, total, byStatus] = await Promise.all([
    db.thumbnail.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        request_id: true,
        status: true,
        model_used: true,
        model_tier: true,
        model_endpoint: true,
        aspect_ratio: true,
        num_of_images: true,
        image_url: true,
        seed: true,
        error: true,
        createdAt: true,
        completed_at: true,
        user: { select: { id: true, email: true } },
        CreditTransaction: { select: { type: true, amount: true } },
        _count: { select: { GenerationEvent: true, PromptFlag: true } },
      },
    }),
    db.thumbnail.count({ where }),
    db.thumbnail.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
  ]);

  return {
    generations: rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      status: row.status,
      workflow: row.model_used,
      tier: row.model_tier,
      endpoint: row.model_endpoint,
      aspectRatio: row.aspect_ratio,
      images: row.num_of_images,
      thumbnail: row.image_url[0] ?? null,
      seed: row.seed,
      error: row.error,
      user: row.user,
      createdAt: row.createdAt,
      latencyMs: row.completed_at
        ? row.completed_at.getTime() - row.createdAt.getTime()
        : null,
      charged: -row.CreditTransaction.filter(
        (t) => t.type === 'GENERATION_CHARGE',
      ).reduce((a, t) => a + t.amount, 0),
      refunded: row.CreditTransaction.filter(
        (t) => t.type === 'GENERATION_REFUND',
      ).reduce((a, t) => a + t.amount, 0),
      events: row._count.GenerationEvent,
      flags: row._count.PromptFlag,
    })),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.status, s._count._all]),
    ) as Partial<Record<GEN_STATUS, number>>,
  };
};

/** One generation's full record and its step-by-step log. */
export const getGenerationDetail = async (id: string) => {
  const row = await db.thumbnail.findUnique({
    where: { id },
    select: {
      id: true,
      request_id: true,
      status: true,
      model_used: true,
      model_tier: true,
      model_endpoint: true,
      aspect_ratio: true,
      content_type: true,
      num_of_images: true,
      image_url: true,
      seed: true,
      error: true,
      createdAt: true,
      updatedAt: true,
      completed_at: true,
      user_prompt: true,
      enhanced_ai_prompt: true,
      user: { select: { id: true, email: true, suspended_at: true } },
      GenerationEvent: { orderBy: { createdAt: 'asc' } },
      CreditTransaction: { orderBy: { createdAt: 'asc' } },
      PromptFlag: {
        select: {
          id: true,
          source: true,
          categories: true,
          severity: true,
          score: true,
          resolved_at: true,
        },
      },
    },
  });
  if (!row) throw new ApiError('Generation not found', 404);

  const { user_prompt, enhanced_ai_prompt, ...rest } = row;
  return {
    id: rest.id,
    requestId: rest.request_id,
    status: rest.status,
    workflow: rest.model_used,
    tier: rest.model_tier,
    endpoint: rest.model_endpoint,
    aspectRatio: rest.aspect_ratio,
    format: rest.content_type,
    images: rest.num_of_images,
    imageUrls: rest.image_url,
    seed: rest.seed,
    error: rest.error,
    user: rest.user,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
    completedAt: rest.completed_at,
    latencyMs: rest.completed_at
      ? rest.completed_at.getTime() - rest.createdAt.getTime()
      : null,
    // Sizes only, never the text.
    promptChars: user_prompt.length,
    enhancedPromptChars: enhanced_ai_prompt.length,
    events: rest.GenerationEvent.map((e) => ({
      id: e.id,
      type: e.type,
      detail: e.detail,
      createdAt: e.createdAt,
    })),
    ledger: rest.CreditTransaction.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balance_after,
      createdAt: t.createdAt,
    })),
    flags: rest.PromptFlag.map((f) => ({
      id: f.id,
      source: f.source,
      categories: f.categories,
      severity: f.severity,
      score: f.score,
      resolvedAt: f.resolved_at,
    })),
  };
};

// ---------------------------------------------------------------- flags --

export const parseFlagParams = (params: URLSearchParams) => ({
  state:
    pick(params.get('state'), ['open', 'resolved', 'all'] as const) ?? 'open',
  severity: pick(params.get('severity'), Object.values(FLAG_SEVERITY)),
  source: pick(params.get('source'), Object.values(FLAG_SOURCE)),
  page: pageOf(params),
});

/** Flagged prompts, as categories and scores only. */
export const listFlags = async ({
  state,
  severity,
  source,
  page,
}: ReturnType<typeof parseFlagParams>) => {
  const where: Prisma.PromptFlagWhereInput = {
    ...(state === 'open' && { resolved_at: null }),
    ...(state === 'resolved' && { resolved_at: { not: null } }),
    ...(severity && { severity }),
    ...(source && { source }),
  };
  const [rows, total, bySeverity] = await Promise.all([
    db.promptFlag.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            suspended_at: true,
            role: true,
            _count: {
              select: { PromptFlag: { where: { resolved_at: null } } },
            },
          },
        },
      },
    }),
    db.promptFlag.count({ where }),
    db.promptFlag.groupBy({
      by: ['severity'],
      where: { resolved_at: null },
      _count: { _all: true },
    }),
  ]);
  return {
    flags: rows.map((f) => ({
      id: f.id,
      source: f.source,
      categories: f.categories,
      score: f.score,
      severity: f.severity,
      generationId: f.thumbnail_id,
      resolvedAt: f.resolved_at,
      resolvedBy: f.resolved_by,
      createdAt: f.createdAt,
      user: {
        id: f.user.id,
        email: f.user.email,
        role: f.user.role,
        suspendedAt: f.user.suspended_at,
        openFlags: f.user._count.PromptFlag,
      },
    })),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    openBySeverity: Object.fromEntries(
      bySeverity.map((s) => [s.severity, s._count._all]),
    ) as Partial<Record<FLAG_SEVERITY, number>>,
  };
};

// ---------------------------------------------------------------- audit --

export const listAdminActions = async (params: URLSearchParams) => {
  const page = pageOf(params);
  const action = pick(params.get('action'), Object.values(ADMIN_ACTION));
  const where: Prisma.AdminActionWhereInput = action ? { action } : {};
  const [rows, total] = await Promise.all([
    db.adminAction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        admin: { select: { email: true } },
        target: { select: { id: true, email: true } },
      },
    }),
    db.adminAction.count({ where }),
  ]);
  return {
    actions: rows.map((a) => ({
      id: a.id,
      action: a.action,
      admin: a.admin.email,
      target: a.target,
      detail: a.detail,
      createdAt: a.createdAt,
    })),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
};
