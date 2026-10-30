import { Suspense } from 'react';
import { UrlToImageGenerator } from '@/components/UrlToImage';

// The studio reads ?from= and hand-off params, so it renders under Suspense.
export default function UrlToImagePage() {
  return (
    <Suspense>
      <UrlToImageGenerator />
    </Suspense>
  );
}
