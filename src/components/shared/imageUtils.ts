
export type ImageData = {
  url: string;
  aspectRatio: string;
};


export const getImageContainerStyle = (aspectRatio: string): string => {
  if (aspectRatio === '9:16') {
    return 'aspect-[9/16] max-h-[300px] w-auto mx-auto';
  }
  return 'aspect-[16/9] w-full';
};


export const getGridLayout = (images: ImageData[]): string => {
  if (images.length === 1) return 'grid-cols-1';

  // Check if we have mixed aspect ratios
  const hasLandscape = images.some((img) => img.aspectRatio === '16:9');
  const hasPortrait = images.some((img) => img.aspectRatio === '9:16');

  if (hasLandscape && hasPortrait) {
    // Mixed ratios - use flexible grid
    return 'grid-cols-1 sm:grid-cols-2 gap-4';
  }

  // Same aspect ratios
  if (images[0]?.aspectRatio === '9:16') {
    return images.length <= 2 ? 'grid-cols-2 gap-3' : 'grid-cols-3 gap-2';
  }

  return 'grid-cols-1 gap-3';
};

/**
 * Download a single image from URL
 */
export const downloadImage = async (
  url: string,
  filename: string = 'image.jpg',
): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch image');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    throw error;
  }
};

/**
 * Copy image URL to clipboard
 */
export const copyToClipboard = async (url: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    throw error;
  }
};

/**
 * Share image using native share API or fallback to clipboard
 */
export const shareImage = async (url: string): Promise<boolean> => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Generated Image',
        text: 'Check out this generated image!',
        url,
      });
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return false;
      }
      throw err;
    }
  }
  return false;
};

/**
 * Download multiple images as ZIP
 * @param images - Array of image data with URL and aspect ratio
 * @param outputFormat - File extension for images
 * @param prefix - Prefix for zip filename
 */
export const downloadImagesAsZip = async (
  images: ImageData[],
  outputFormat: string,
  prefix: string = 'generated',
): Promise<void> => {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add each image to zip
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        const response = await fetch(img.url);
        if (!response.ok) throw new Error(`Failed to fetch image ${i + 1}`);

        const blob = await response.blob();
        const extension = outputFormat || 'jpg';
        const filename = `${prefix}-image-${img.aspectRatio.replace(':', 'x')}-${i + 1}.${extension}`;

        zip.file(filename, blob);
      } catch (error) {
        throw new Error(`Failed to add image ${i + 1} to zip`);
      }
    }

    // Generate and download zip
    const content = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(content);

    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `${prefix}-thumbnails.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(zipUrl);
  } catch (error) {
    throw error;
  }
};
