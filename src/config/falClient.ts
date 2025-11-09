import axios from 'axios';

export const uploadFile = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await axios.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const { url } = res.data;
    return url;
  } catch (err) {
    return null;
  }
};
