import { ApiError } from '@/utils/ApiError';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useAuth = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await axios.get('/api/user');
      if (response.data.success) {
        return response.data.data;
      }
      throw new ApiError(response.data.message, response.data.statusCode);
    },
  });
};
