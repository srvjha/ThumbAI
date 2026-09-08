'use server';

import { db } from '@/db';
import { GEN_STATUS } from '@prisma/client';

export async function updateThumbnailStatus(
  requestId: string,
  imageUrls: string[],
) {
  try {
    const thumbnail = await db.thumbnail.findUnique({
      where: { request_id: requestId },
    });

    if (!thumbnail) {
      console.error('Thumbnail not found for requestId:', requestId);
      return { success: false, error: 'Thumbnail not found' };
    }

    await db.thumbnail.update({
      where: { request_id: requestId },
      data: {
        status: GEN_STATUS.COMPLETED,
        image_url: imageUrls,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update thumbnail status:', error);
    return { success: false, error: 'Internal server error' };
  }
}
