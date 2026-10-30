import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import axios from 'axios';
import { ApiError } from '@/utils/ApiError';
import type {
  AnalyticsData,
  AnalyticsRange,
  GenerationDetail,
  GenerationFilters,
  GenerationsPage,
} from '@/components/dashboard/types';

const unwrap = <T>(response: { data: any }): T => {
  if (response.data.success) return response.data.data as T;
  throw new ApiError(response.data.message, response.data.statusCode);
};

/** Drops empty filters so they don't end up in the query key or URL. */
const cleanFilters = (filters: GenerationFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  ) as GenerationFilters;

/** The library: cursor-paginated, refreshed while anything is still running. */
export const useGenerations = (filters: GenerationFilters = {}) => {
  const params = cleanFilters(filters);
  return useInfiniteQuery<GenerationsPage>({
    queryKey: ['me', 'generations', params],
    queryFn: async ({ pageParam }) =>
      unwrap<GenerationsPage>(
        await axios.get('/api/me/generations', {
          params: { ...params, cursor: pageParam ?? undefined },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const running = pages.some((page) =>
        page.items.some(
          (item) => item.status === 'PENDING' || item.status === 'IN_PROGRESS',
        ),
      );
      return running ? 8000 : false;
    },
  });
};

export const useGeneration = (id: string | null) =>
  useQuery<GenerationDetail>({
    queryKey: ['me', 'generation', id],
    queryFn: async () =>
      unwrap<GenerationDetail>(await axios.get(`/api/me/generations/${id}`)),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'IN_PROGRESS' ? 8000 : false;
    },
  });

export const useAnalytics = (range: AnalyticsRange) =>
  useQuery<AnalyticsData>({
    queryKey: ['me', 'analytics', range],
    queryFn: async () =>
      unwrap<AnalyticsData>(
        await axios.get('/api/me/analytics', {
          // Bucket days and hours in the viewer's timezone.
          params: { range, tz: new Date().getTimezoneOffset() },
        }),
      ),
    // Keep the previous range on screen while the next one loads.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
