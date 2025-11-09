import axios from 'axios';
import toast from 'react-hot-toast';

export const deductCredits = async (userId: string, credits: number) => {
  try {
    const response = await axios.patch('/api/user/update', { userId, credits });
    if (response.data.success) {
      return response.data.success;
    }
    return false;
  } catch (error: any) {
    toast.error(error.message);
  }
};
