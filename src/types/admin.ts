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
