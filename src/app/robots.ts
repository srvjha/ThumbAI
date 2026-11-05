import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Signed-in screens redirect to sign-in, so they have nothing to index.
      disallow: [
        '/api/',
        '/admin',
        '/billing',
        '/dashboard',
        '/profile',
        '/studio',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
