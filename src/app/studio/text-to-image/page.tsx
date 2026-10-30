import { AppPageHeader } from '@/components/app/AppShell';
import { TextToImageGenerator } from '@/components/TextToImage';

export default function TextToImagePage() {
  return (
    <>
      <AppPageHeader
        title='Text to thumbnail'
        description='Describe the video. Get a YouTube thumbnail or Shorts cover that reads at a glance.'
      />
      <TextToImageGenerator />
    </>
  );
}
