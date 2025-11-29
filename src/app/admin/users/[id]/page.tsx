'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Mail,
  Calendar,
  CreditCard,
  Image as ImageIcon,
  Shield,
  User,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/user/auth';
import { Skeleton } from '@/components/ui/skeleton';

interface UserDetail {
  id: string;
  email: string;
  credits: number;
  plan: string;
  role: string;
  createdAt: string;
  thumbnailCount: number;
  thumbnails: Array<{
    id: string;
    status: string;
    imageUrl: string | null;
    createdAt: string;
    user_original_prompt?: string;
  }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { data: userData } = useAuth();

  const { data: user, isLoading, error } = useQuery<UserDetail>({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      const response = await axios.get(`/api/admin/users/${userId}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    },
    enabled: !!userId && userData?.role === 'ADMIN',
  });

  if (userData && userData.role !== 'ADMIN') {
    router.push('/');
    return null;
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-neutral-950 pt-24 px-4 pb-16'>
        <div className='max-w-7xl mx-auto'>
          <div className='mb-6'>
            <Skeleton className='h-10 w-32 mb-4' />
            <Skeleton className='h-8 w-64' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Skeleton className='h-64' />
            <Skeleton className='h-64' />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className='min-h-screen bg-neutral-950 pt-24 px-4 pb-16'>
        <div className='max-w-7xl mx-auto'>
          <Card className='bg-neutral-900 border-neutral-800'>
            <CardContent className='pt-6 text-center text-neutral-400'>
              User not found
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-neutral-950 pt-24 px-4 pb-16'>
      <div className='max-w-7xl mx-auto'>
        {/* Back Button */}
        <Button
          variant='outline'
          onClick={() => router.push('/admin')}
          className='mb-6 border-neutral-700 hover:bg-neutral-800'
        >
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Dashboard
        </Button>

        {/* User Info Card */}
        <Card className='bg-neutral-900 border-neutral-800 mb-6'>
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center'>
                    <User className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <CardTitle className='text-2xl text-neutral-50 mb-1'>
                      {user.email}
                    </CardTitle>
                    <div className='flex items-center gap-2'>
                      {user.role === 'ADMIN' && (
                        <Badge variant='secondary' className='bg-blue-600 text-white'>
                          <Shield className='w-3 h-3 mr-1' />
                          Admin
                        </Badge>
                      )}
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
                    </div>
                  </div>
                </div>
                <p className='text-sm text-neutral-400 font-mono'>{user.id}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div className='flex items-center gap-3 p-4 bg-neutral-800 rounded-lg'>
                <div className='w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center'>
                  <CreditCard className='w-5 h-5 text-blue-500' />
                </div>
                <div>
                  <p className='text-sm text-neutral-400'>Credits</p>
                  <p className='text-2xl font-bold text-neutral-50'>{user.credits}</p>
                </div>
              </div>

              <div className='flex items-center gap-3 p-4 bg-neutral-800 rounded-lg'>
                <div className='w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center'>
                  <ImageIcon className='w-5 h-5 text-purple-500' />
                </div>
                <div>
                  <p className='text-sm text-neutral-400'>Thumbnails</p>
                  <p className='text-2xl font-bold text-neutral-50'>
                    {user.thumbnailCount}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3 p-4 bg-neutral-800 rounded-lg'>
                <div className='w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center'>
                  <Calendar className='w-5 h-5 text-green-500' />
                </div>
                <div>
                  <p className='text-sm text-neutral-400'>Joined</p>
                  <p className='text-lg font-semibold text-neutral-50'>
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thumbnails Section */}
        <Card className='bg-neutral-900 border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-neutral-50 flex items-center gap-2'>
              <ImageIcon className='w-5 h-5' />
              Thumbnails ({user.thumbnails.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.thumbnails.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {user.thumbnails.map((thumb) => (
                  <Card
                    key={thumb.id}
                    className='bg-neutral-800 border-neutral-700 overflow-hidden hover:border-neutral-600 transition-colors'
                  >
                    <div className='aspect-video bg-neutral-900 relative'>
                      {thumb.imageUrl ? (
                        <img
                          src={thumb.imageUrl}
                          alt='Thumbnail'
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center text-neutral-500'>
                          <FileText className='w-8 h-8' />
                        </div>
                      )}
                      <div className='absolute top-2 right-2'>
                        <Badge
                          variant='outline'
                          className='bg-neutral-900/80 border-neutral-700 text-neutral-300 text-xs'
                        >
                          {thumb.status}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className='pt-4'>
                      <div className='space-y-2'>
                        <div>
                          <p className='text-xs text-neutral-400 mb-1'>Created</p>
                          <p className='text-sm text-neutral-300'>
                            {new Date(thumb.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {thumb.user_original_prompt && (
                          <div>
                            <p className='text-xs text-neutral-400 mb-1'>Prompt</p>
                            <p className='text-sm text-neutral-300 line-clamp-2'>
                              {thumb.user_original_prompt}
                            </p>
                          </div>
                        )}
                        <p className='text-xs text-neutral-500 font-mono mt-2'>
                          {thumb.id}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className='text-center py-12 text-neutral-400'>
                <ImageIcon className='w-12 h-12 mx-auto mb-4 opacity-50' />
                <p>No thumbnails created yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

