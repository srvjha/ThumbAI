import { AppPageHeader } from '@/components/app/AppShell';
import { UrlToImageGenerator } from '@/components/UrlToImage';

export default function UrlToImagePage() {
  return (
    <>
      <AppPageHeader
        title='Blog cover'
        description='A cover poster for your blog post. Paste the URL and get an editorial cover back.'
      />
      <UrlToImageGenerator />
    </>
  );
}
