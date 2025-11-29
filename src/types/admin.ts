export interface UserData {
  id: string;
  email: string;
  credits: number;
  plan: string;
  role: string;
  createdAt: string;
  thumbnailCount: number;
  thumbnails: Array<{
    id: string;
    status: string;
    imageUrl: string | null;
    createdAt: string;
  }>;
}