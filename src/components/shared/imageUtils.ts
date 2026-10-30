export type ImageData = {
  url: string;
  aspectRatio: string;
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
