import { db } from '@/db';
import { ApiError, apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/auth';

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  try {
    await requireAdmin();

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
        user_prompt: thumb.user_prompt,
      })),
    };

    return NextResponse.json(
      new ApiResponse(200, formattedUser, 'User fetched successfully'),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
