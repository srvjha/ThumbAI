'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import type {
  AdminAuditPage,
  AdminFlagsPage,
  AdminGenerationDetail,
  AdminGenerationsPage,
  AdminOverview,
  AdminUserDetail,
  AdminUsersPage,
} from '@/types/admin';

type Params = Record<string, string | number | boolean | undefined>;

const get = async <T>(path: string, params: Params = {}): Promise<T> => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== false) {
      search.set(key, String(value));
    }
  }
  const res = await axios.get(`/api/admin/${path}?${search}`);
  return res.data.data;
};

export const adminError = (err: unknown) =>
  axios.isAxiosError(err)
    ? (err.response?.data?.message ?? err.message)
    : 'Something went wrong';

export const useAdminOverview = (range: number) =>
  useQuery({
    queryKey: ['admin', 'overview', range],
    queryFn: () => get<AdminOverview>('overview', { range }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

export const useAdminUsers = (params: Params) =>
  useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => get<AdminUsersPage>('users', params),
    placeholderData: keepPreviousData,
  });

export const useAdminUser = (id: string) =>
  useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => get<AdminUserDetail>(`users/${id}`),
  });

export const useAdminGenerations = (params: Params) =>
  useQuery({
    queryKey: ['admin', 'generations', params],
    queryFn: () => get<AdminGenerationsPage>('generations', params),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });

export const useAdminGeneration = (id: string | null) =>
  useQuery({
    queryKey: ['admin', 'generation', id],
    queryFn: () => get<AdminGenerationDetail>(`generations/${id}`),
    enabled: !!id,
  });

export const useAdminFlags = (params: Params) =>
  useQuery({
    queryKey: ['admin', 'flags', params],
    queryFn: () => get<AdminFlagsPage>('flags', params),
    placeholderData: keepPreviousData,
  });

/** Open flags, for the sidebar badge. */
export const useOpenFlagCount = () =>
  useQuery({
    queryKey: ['admin', 'flags', 'open-count'],
    queryFn: () => get<AdminFlagsPage>('flags', { state: 'open' }),
    select: (data) => data.total,
    refetchInterval: 60_000,
  }).data;

export const useAdminAudit = (params: Params) =>
  useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => get<AdminAuditPage>('audit', params),
    placeholderData: keepPreviousData,
  });

/** One admin write; refreshes every admin view and toasts the outcome. */
const useAdminWrite = <V>(
  send: (vars: V) => Promise<unknown>,
  success: (vars: V) => string,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (_data, vars) => {
      toast.success(success(vars));
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toast.error(adminError(err)),
  });
};

export const useAdjustCredits = () =>
  useAdminWrite(
    ({
      userId,
      amount,
      reason,
    }: {
      userId: string;
      amount: number;
      reason: string;
    }) => axios.post(`/api/admin/users/${userId}/credits`, { amount, reason }),
    ({ amount }) =>
      amount > 0 ? `Added ${amount} credits` : `Removed ${-amount} credits`,
  );

export const useSetSuspended = () =>
  useAdminWrite(
    ({
      userId,
      suspended,
      reason,
    }: {
      userId: string;
      suspended: boolean;
      reason?: string;
    }) =>
      axios.post(`/api/admin/users/${userId}/suspend`, { suspended, reason }),
    ({ suspended }) => (suspended ? 'User suspended' : 'Suspension lifted'),
  );

export const useResetFlags = () =>
  useAdminWrite(
    ({ userId }: { userId: string }) =>
      axios.delete(`/api/admin/users/${userId}/flags`),
    () => 'Flags reset',
  );
