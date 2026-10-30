/**
 * Saves an image under a readable name. Falls back to opening it in a new tab
 * when the host refuses a cross-origin fetch.
 */
export const downloadImage = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch image');
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const imageExtension = (url: string, fallback = 'png') =>
  url.split('?')[0].match(/\.(png|jpe?g|webp)$/i)?.[1] ?? fallback;
