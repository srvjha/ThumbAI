import type { AdminUserList, AdminUserListParams } from '@/types/admin';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useAdmin = (isAdmin: boolean, params: AdminUserListParams) => {
  return useQuery<AdminUserList>({
    queryKey: ['admin-users', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') search.set(key, String(value));
      }
      const response = await axios.get(`/api/admin/users?${search}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    },
    enabled: isAdmin,
    placeholderData: keepPreviousData,
  });
};
