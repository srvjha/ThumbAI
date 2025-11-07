const sizeMap: Record<string, { width: number; height: number }> = {
  "youtube-horizontal": { width: 1280, height: 720 },
  "youtube-shorts": { width: 1080, height: 1920 },
  "instagram-post": { width: 1080, height: 1080 },
  "instagram-story": { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  "twitter-post": { width: 1200, height: 675 },
  "facebook-post": { width: 1200, height: 630 },
};

export function resizedImages(images: string[], sizes: string[]) {
  const results: string[] = [];

  const platformStrategy: Record<string, string> = {
    "youtube-horizontal": "auto",
    "youtube-shorts": "smart-pad",
    "instagram-post": "smart-pad",
    "instagram-story": "smart-pad",
    tiktok: "smart-pad",
    "twitter-post": "auto",
    "facebook-post": "auto",
  };

  for (const img of images) {
    for (const size of sizes) {
      const dims = sizeMap[size];
      if (!dims) continue;

      const strategy = platformStrategy[size] || "auto";
      const encodedUrl = encodeURIComponent(img);

      results.push(
        `/api/resize?url=${encodedUrl}&w=${dims.width}&h=${dims.height}&fit=${strategy}&bg=ffffff`,
      );
    }
  }

  return results;
}
