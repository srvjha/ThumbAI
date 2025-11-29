import { db } from '@/db';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';


export const GET = async (req: NextRequest) => {
  try {
     const { userId } = await auth();
    if (!userId) {
      throw new ApiError('Unauthorized', 401);
    }

    const getUserRole = await db.user.findUnique({
      where: { clerk_id: userId },
    });
  
    if (getUserRole?.role !== Role.ADMIN) {
      throw new ApiError('Forbidden - Admin access required', 403);
    }
    
    // Fetch all users with their thumbnails
    const users = await db.user.findMany({
      include: {
        Thumbnail: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the data
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      credits: user.credits,
      plan: user.plan,
      role: user.role,
      createdAt: user.createdAt,
      thumbnailCount: user.Thumbnail.length,
      thumbnails: user.Thumbnail.map((thumb) => ({
        id: thumb.id,
        status: thumb.status,
        imageUrl: thumb.image_url,
        createdAt: thumb.createdAt,
      })),
    }));

    return NextResponse.json(
      new ApiResponse(200, formattedUsers, 'Users fetched successfully'),
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      new ApiResponse(
        err.statusCode || 500,
        null,
        err.message || 'Server Error',
      ),
      { status: err.statusCode || 500 },
    );
  }
};

