import { db } from '@/db';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new ApiError('Unauthorized', 401);
    }

    // Check if requester is admin
    const requester = await db.user.findUnique({
      where: { clerk_id: userId },
    });

    if (!requester || requester.role !== Role.ADMIN) {
      throw new ApiError('Forbidden - Admin access required', 403);
    }

    const { id } = await context.params;

    // Fetch user with all thumbnails
    const user = await db.user.findUnique({
      where: { id },
      include: {
        Thumbnail: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Format the data
    const formattedUser = {
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
        user_original_prompt: thumb.user_original_prompt,
      })),
    };

    return NextResponse.json(
      new ApiResponse(200, formattedUser, 'User fetched successfully'),
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

