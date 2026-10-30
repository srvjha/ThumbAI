'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Users,
  Image,
  CreditCard,
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/hooks/user/auth';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/user/admin';
import type { AdminUserSort } from '@/types/admin';

type SortField = AdminUserSort;
type SortOrder = 'asc' | 'desc';

export default function AdminDashboard() {
  const router = useRouter();
  const { data: userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Any change to the filters starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, roleFilter, planFilter, sortField, sortOrder]);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return userData?.role === 'ADMIN';
  }, [userData]);

  // Filtering, sorting and paging happen on the server.
  const { data, isLoading, isFetching } = useAdmin(isAdmin, {
    q: debouncedQuery || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    plan: planFilter === 'all' ? undefined : planFilter,
    sort: sortField,
    order: sortOrder,
    page,
  });
  const users = data?.users ?? [];
  const pageCount = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  // Redirect if not admin
  if (userData && !isAdmin) {
    router.push('/');
    return null;
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className='w-4 h-4 ml-1 opacity-50' />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className='w-4 h-4 ml-1' />
    ) : (
      <ArrowDown className='w-4 h-4 ml-1' />
    );
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-neutral-950 pt-24 px-4'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center text-neutral-400'>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-neutral-950 pt-24 px-16 pb-16'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center gap-2 mb-2'>
            <h1 className='text-4xl font-bold text-neutral-50'>
              Admin Dashboard
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
          <Card className='bg-transparent border-neutral-800 border-dotted border-2'>
            <CardHeader className='flex flex-row items-center justify-between pb-1'>
              <CardTitle className='text-xl font-medium text-neutral-400'>
                Total Users
              </CardTitle>
              <Users className='w-8 h-8 text-neutral-400' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-neutral-50'>
                {data?.stats.users ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className='bg-transparent border-neutral-800 border-dotted border-2'>
            <CardHeader className='flex flex-row items-center justify-between pb-1'>
              <CardTitle className='text-xl font-medium text-neutral-400'>
                Total Thumbnails
              </CardTitle>
              <Image className='w-8 h-8 text-neutral-400' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-neutral-50'>
                {data?.stats.thumbnails ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className='bg-transparent border-neutral-800 border-dotted border-2'>
            <CardHeader className='flex flex-row items-center justify-between pb-1'>
              <CardTitle className='text-xl font-medium text-neutral-400'>
                Total Credits
              </CardTitle>
              <CreditCard className='w-8 h-8 text-neutral-400' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-neutral-50'>
                {data?.stats.credits ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className='bg-transparent border-neutral-800 mb-6 border-dotted border-2'>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              {/* Search */}
              <div className='relative md:col-span-2'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400' />
                <Input
                  placeholder='Search by email or user ID...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10 bg-neutral-800 border-neutral-700 text-neutral-50'
                />
              </div>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className='bg-neutral-800 border-neutral-700 text-neutral-50'>
                  <Filter className='w-4 h-4 mr-2' />
                  <SelectValue placeholder='Filter by Role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Roles</SelectItem>
                  <SelectItem value='USER'>User</SelectItem>
                  <SelectItem value='ADMIN'>Admin</SelectItem>
                </SelectContent>
              </Select>

              {/* Plan Filter */}
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className='bg-neutral-800 border-neutral-700 text-neutral-50'>
                  <Filter className='w-4 h-4 mr-2' />
                  <SelectValue placeholder='Filter by Plan' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Plans</SelectItem>
                  <SelectItem value='FREE'>Free</SelectItem>
                  <SelectItem value='PAID'>Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className='bg-transparent border-neutral-800 border-dotted border-2'>
          <CardHeader>
            <CardTitle className='text-neutral-50'>
              Users ({data?.total ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-neutral-800'>
                    <th className='text-left py-3 px-4 text-sm font-medium text-neutral-400'>
                      <button
                        onClick={() => handleSort('email')}
                        className='flex items-center hover:text-neutral-200 transition-colors'
                      >
                        Email
                        <SortIcon field='email' />
                      </button>
                    </th>
                    <th className='text-left py-3 px-4 text-sm font-medium text-neutral-400'>
                      Role
                    </th>
                    <th className='text-left py-3 px-4 text-sm font-medium text-neutral-400'>
                      Plan
                    </th>
                    <th className='text-left py-3 px-4 text-sm font-medium text-neutral-400'>
                      <button
                        onClick={() => handleSort('credits')}
                        className='flex items-center hover:text-neutral-200 transition-colors'
                      >
                        Credits
                        <SortIcon field='credits' />
                      </button>
                    </th>
                    <th className='text-left py-3 px-4 text-sm font-medium text-neutral-400'>
                      <button
                        onClick={() => handleSort('thumbnails')}
                        className='flex items-center hover:text-neutral-200 transition-colors'
                      >
                        Thumbnails
                        <SortIcon field='thumbnails' />
                      </button>
                    </th>
                    <th className='text-left py-3 px-4 text-sm font-medium text-neutral-400'>
                      <button
                        onClick={() => handleSort('createdAt')}
                        className='flex items-center hover:text-neutral-200 transition-colors'
                      >
                        Joined
                        <SortIcon field='createdAt' />
                      </button>
                    </th>
                    <th className='text-right py-3 px-4 text-sm font-medium text-neutral-400'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className='border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors cursor-pointer'
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className='py-3 px-4'>
                        <div className='text-neutral-50 font-medium'>
                          {user.email}
                        </div>
                        <div className='text-xs text-neutral-500 mt-1'>
                          {user.id}
                        </div>
                      </td>
                      <td className='py-3 px-4'>
                        {user.role === 'ADMIN' ? (
                          <Badge
                            variant='secondary'
                            className='bg-blue-600 text-white'
                          >
                            Admin
                          </Badge>
                        ) : (
                          <Badge
                            variant='outline'
                            className='border-neutral-600 text-neutral-400'
                          >
                            User
                          </Badge>
                        )}
                      </td>
                      <td className='py-3 px-4'>
                        <Badge
                          variant='outline'
                          className={
                            user.plan === 'PAID'
                              ? 'border-green-500 text-green-500'
                              : 'border-neutral-600 text-neutral-400'
                          }
                        >
                          {user.plan}
                        </Badge>
                      </td>
                      <td className='py-3 px-4 text-neutral-50 font-medium'>
                        {user.credits}
                      </td>
                      <td className='py-3 px-4 text-neutral-50 font-medium'>
                        {user.thumbnailCount}
                      </td>
                      <td className='py-3 px-4 text-neutral-400 text-sm'>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className='py-3 px-4 text-right'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/users/${user.id}`);
                          }}
                          className='border-neutral-700 hover:bg-neutral-800'
                        >
                          <Eye className='w-4 h-4 mr-1' />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className='text-center py-12 text-neutral-400'>
                  {searchQuery || roleFilter !== 'all' || planFilter !== 'all'
                    ? 'No users found matching your filters'
                    : 'No users yet'}
                </div>
              )}
            </div>

            {pageCount > 1 && (
              <div className='mt-4 flex items-center justify-end gap-3 text-sm text-neutral-400'>
                <span>
                  Page {page} of {pageCount}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                  className='border-neutral-700 hover:bg-neutral-800'
                >
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page >= pageCount || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className='border-neutral-700 hover:bg-neutral-800'
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
