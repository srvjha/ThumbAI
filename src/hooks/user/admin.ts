import { UserData } from '@/types/admin';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';


export const useAdmin = (isAdmin:boolean) => {
  return useQuery<UserData[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/users');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    },
    enabled: isAdmin,
  });
};
