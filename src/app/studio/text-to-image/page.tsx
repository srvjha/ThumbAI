import { Suspense } from 'react';
import { TextToImageGenerator } from '@/components/TextToImage';

// The studio reads ?from= and hand-off params, so it renders under Suspense.
export default function TextToImagePage() {
  return (
    <Suspense>
      <TextToImageGenerator />
    </Suspense>
  );
}
