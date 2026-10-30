import { Suspense } from 'react';
import { ChatStudio } from '@/components/studio/chat/ChatStudio';

// The studio reads ?from=, so it renders under Suspense.
export default function BlogCoverPage() {
  return (
    <Suspense>
      <ChatStudio mode='blog' />
    </Suspense>
  );
}
