export interface UserData {
  id: string;
  email: string;
  credits: number;
  plan: string;
  role: string;
  createdAt: string;
  /**
   * Set when the free signup credits were withheld (/api/user only):
   * disposable_email, email_reused or ip_limit.
   */
  signupCreditsRefused?: string | null;
  /** Set while an admin has the account suspended. */
  suspended_at?: string | null;
  thumbnailCount: number;
  thumbnails: Array<{
    id: string;
    status: string;
    imageUrl: string[];
    createdAt: string;
  }>;
}

/** A server type as it arrives over JSON: dates become ISO strings. */
export type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

type Server = typeof import('@/server/admin');

export type AdminOverview = Jsonify<
  import('@/server/adminOverview').AdminOverview
>;
export type AdminUsersPage = Jsonify<Awaited<ReturnType<Server['listUsers']>>>;
export type AdminUser = AdminUsersPage['users'][number];
export type AdminUserDetail = Jsonify<
  Awaited<ReturnType<Server['getUserDetail']>>
>;
export type AdminGenerationsPage = Jsonify<
  Awaited<ReturnType<Server['listGenerations']>>
>;
export type AdminGeneration = AdminGenerationsPage['generations'][number];
export type AdminGenerationDetail = Jsonify<
  Awaited<ReturnType<Server['getGenerationDetail']>>
>;
export type AdminFlagsPage = Jsonify<Awaited<ReturnType<Server['listFlags']>>>;
export type AdminFlag = AdminFlagsPage['flags'][number];
export type AdminAuditPage = Jsonify<
  Awaited<ReturnType<Server['listAdminActions']>>
>;
