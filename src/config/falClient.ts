import axios from 'axios';

/**
 * Uploads a file to Fal storage through our server proxy.
 *
 * Deliberately does NOT talk to Fal directly: doing so would require the Fal
 * credential in the browser bundle. See src/app/api/upload/route.ts.
 */
export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await axios.post<{ url: string }>('/api/upload', formData);
    return res.data.url;
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? (err.response?.data?.message ?? err.message)
      : 'Upload failed';
    throw new Error(message);
  }
};
