import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    // The old routes were named after the model vendor. They are kept as
    // permanent redirects so links people already shared keep working.
    return [
      {
        source: '/nano-banana/text-to-image',
        destination: '/studio/text-to-image',
        permanent: true,
      },
      {
        source: '/nano-banana/edit-image',
        destination: '/studio/image-to-image',
        permanent: true,
      },
      {
        source: '/nano-banana/url-to-image',
        destination: '/studio/blog-cover',
        permanent: true,
      },
      {
        source: '/nano-banana',
        destination: '/studio/text-to-image',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
