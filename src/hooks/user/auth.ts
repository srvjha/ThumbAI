import { ApiError } from '@/utils/ApiError';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type UseAuthOptions = {
  enabled?: boolean;
};

export const useAuth = (options?: UseAuthOptions) => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await axios.get('/api/user');
      if (response.data.success) {
        return response.data.data;
      }
      throw new ApiError(response.data.message, response.data.statusCode);
    },
    enabled: options?.enabled ?? true,
  });
};
