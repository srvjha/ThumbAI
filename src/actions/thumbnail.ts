'use server';

import { db } from '@/db';

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
        status: { push: 'COMPLETED' },
        image_url: { push: imageUrls },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update thumbnail status:', error);
    return { success: false, error: 'Internal server error' };
  }
}
