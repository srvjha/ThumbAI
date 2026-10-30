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
  thumbnailCount: number;
  thumbnails: Array<{
    id: string;
    status: string;
    imageUrl: string[];
    createdAt: string;
  }>;
}

/** A row of the admin users list (/api/admin/users). */
export interface AdminUserRow {
  id: string;
  email: string;
  credits: number;
  plan: string;
  role: string;
  createdAt: string;
  thumbnailCount: number;
}

export interface AdminUserList {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: { users: number; thumbnails: number; credits: number };
}

export type AdminUserSort = 'email' | 'credits' | 'thumbnails' | 'createdAt';

export interface AdminUserListParams {
  q?: string;
  role?: string;
  plan?: string;
  sort: AdminUserSort;
  order: 'asc' | 'desc';
  page: number;
}
