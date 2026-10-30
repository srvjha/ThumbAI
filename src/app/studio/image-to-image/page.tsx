import { Suspense } from 'react';
import { ImageToImage } from '@/components/ImageToImage';

// The studio reads ?from= and hand-off params, so it renders under Suspense.
export default function ImageEditorPage() {
  return (
    <Suspense>
      <ImageToImage />
    </Suspense>
  );
}
