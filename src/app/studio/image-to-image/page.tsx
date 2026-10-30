import { AppPageHeader } from '@/components/app/AppShell';
import { ImageToImage } from '@/components/ImageToImage';

export default async function ImageEditorPage() {
  return (
    <>
      <AppPageHeader
        title='Image to thumbnail'
        description='Bring your face, product or logo. ThumbAI composites it into a finished thumbnail.'
      />
      <ImageToImage />
    </>
  );
}
