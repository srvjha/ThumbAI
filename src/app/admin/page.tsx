'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
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



type SortField = 'email' | 'credits' | 'thumbnails' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function AdminDashboard() {
  const router = useRouter();
  const { data: userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return userData?.role === 'ADMIN';
  }, [userData]);

  const { data: users, isLoading } = useAdmin(isAdmin)

  // Redirect if not admin
  if (userData && !isAdmin) {
    router.push('/');
    return null;
  }

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!users) return [];

    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.id.toLowerCase().includes(query),
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter((user) => user.plan === planFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'credits':
          aValue = a.credits;
          bValue = b.credits;
          break;
        case 'thumbnails':
          aValue = a.thumbnailCount;
          bValue = b.thumbnailCount;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, roleFilter, planFilter, sortField, sortOrder]);

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
           
            <h1 className='text-4xl font-bold text-neutral-50'>Admin Dashboard</h1>
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
                {users?.length || 0}
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
                {users?.reduce((acc, user) => acc + user.thumbnailCount, 0) || 0}
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
                {users?.reduce((acc, user) => acc + user.credits, 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className='bg-transparent border-neutral-800 mb-6 border-dotted border-2'>
          <CardContent >
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
              Users ({filteredAndSortedUsers.length})
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
                  {filteredAndSortedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className='border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors cursor-pointer'
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className='py-3 px-4'>
                        <div className='text-neutral-50 font-medium'>{user.email}</div>
                        <div className='text-xs text-neutral-500 mt-1'>{user.id}</div>
                      </td>
                      <td className='py-3 px-4'>
                        {user.role === 'ADMIN' ? (
                          <Badge variant='secondary' className='bg-blue-600 text-white'>
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='border-neutral-600 text-neutral-400'>
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

              {filteredAndSortedUsers.length === 0 && (
                <div className='text-center py-12 text-neutral-400'>
                  {searchQuery || roleFilter !== 'all' || planFilter !== 'all'
                    ? 'No users found matching your filters'
                    : 'No users yet'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
