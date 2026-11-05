import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';

const PUBLIC_PATHS = ['', '/pricing', '/terms', '/privacy', '/refund-policy'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` }));
}
