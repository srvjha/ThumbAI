import { Suspense } from 'react';
import { ChatStudio } from '@/components/studio/chat/ChatStudio';

// The studio reads ?from=, so it renders under Suspense.
export default function TextToImagePage() {
  return (
    <Suspense>
      <ChatStudio mode='text' />
    </Suspense>
  );
}
