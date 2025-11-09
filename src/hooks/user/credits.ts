import { ApiError } from '@/utils/ApiError';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

export const useCredits = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      credits,
    }: {
      userId: string;
      credits: number;
    }) => {
      const response = await axios.patch('/api/user/update', {
        userId,
        credits,
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new ApiError(response.data.message, response.data.statusCode);
    },
    onSuccess: (data) => {
      toast.success('Credits deducted successfully');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
