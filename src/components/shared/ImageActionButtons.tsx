'use client';

import { Copy, Download, Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import { downloadImage, copyToClipboard, shareImage } from './imageUtils';
import { cn } from '@/lib/utils';

interface ImageActionButtonsProps {
  imageUrl: string;
  aspectRatio?: string;
  /**
   * 'overlay' is icon-only for sitting on top of an image on hover;
   * 'toolbar' is labelled, for a visible row under the canvas.
   */
  variant?: 'overlay' | 'toolbar';
}

/**
 * Reusable component for image action buttons (Copy, Download, Share)
 * Handles all UI feedback and error handling
 */
export const ImageActionButtons: React.FC<ImageActionButtonsProps> = ({
  imageUrl,
  aspectRatio = '16:9',
  variant = 'overlay',
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

  const toolbar = variant === 'toolbar';
  const buttonClass = toolbar
    ? 'cursor-pointer'
    : 'cursor-pointer bg-card text-foreground shadow-xs hover:bg-accent';

  const actions = [
    { label: 'Download', icon: Download, onClick: handleDownloadClick },
    { label: 'Copy link', icon: Copy, onClick: handleCopyClick },
    { label: 'Share', icon: Share2, onClick: handleShareClick },
  ];

  return (
    <div className={cn('flex gap-2', toolbar && 'flex-wrap')}>
      {actions.map(({ label, icon: Icon, onClick }) => (
        <Button
          key={label}
          type='button'
          variant={toolbar ? 'outline' : 'ghost'}
          size='sm'
          onClick={onClick}
          className={buttonClass}
          title={label}
          aria-label={toolbar ? undefined : label}
        >
          <Icon className='size-4' />
          {toolbar && label}
        </Button>
      ))}
    </div>
  );
};
