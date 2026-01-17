'use client';

import { Copy, Download, Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import {
  downloadImage,
  copyToClipboard,
  shareImage,
} from './imageUtils';

interface ImageActionButtonsProps {
  imageUrl: string;
  aspectRatio?: string;
}

/**
 * Reusable component for image action buttons (Copy, Download, Share)
 * Handles all UI feedback and error handling
 */
export const ImageActionButtons: React.FC<ImageActionButtonsProps> = ({
  imageUrl,
  aspectRatio = '16:9',
}) => {
  const handleDownloadClick = async () => {
    try {
      const extension = 'jpg';
      const filename = `image-${aspectRatio.replace(':', 'x')}.${extension}`;
      await downloadImage(imageUrl, filename);
      toast.success('Image downloaded successfully!', { id: 'download' });
    } catch (error) {
      toast.error('Failed to download image. Please try again.', {
        id: 'download',
      });
    }
  };

  const handleCopyClick = async () => {
    try {
      await copyToClipboard(imageUrl);
      toast.success('Image URL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy URL. Please try again.');
    }
  };

  const handleShareClick = async () => {
    try {
      const isShared = await shareImage(imageUrl);
      if (isShared) {
        toast.success('Image shared successfully!');
      } else {
        // Fallback to clipboard
        await copyToClipboard(imageUrl);
        toast.success('Image URL copied to clipboard (sharing not supported)!');
      }
    } catch (error) {
      toast.error('Failed to share image.');
    }
  };

  return (
    <div className='flex gap-2'>
      <Button
        variant='ghost'
        size='sm'
        onClick={handleCopyClick}
        className='cursor-pointer hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200'
        title='Copy URL'
      >
        <Copy className='w-4 h-4' />
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={handleDownloadClick}
        className='cursor-pointer hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200'
        title='Download'
      >
        <Download className='w-4 h-4' />
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={handleShareClick}
        className='cursor-pointer hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200'
        title='Share'
      >
        <Share2 className='w-4 h-4' />
      </Button>
    </div>
  );
};
