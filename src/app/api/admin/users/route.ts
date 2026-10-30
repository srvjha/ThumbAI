import { db } from '@/db';
import { apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/auth';

export const GET = async (req: NextRequest) => {
  try {
    await requireAdmin();

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
  } catch (err) {
    return apiErrorResponse(err);
  }
};
