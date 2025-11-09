import { Download, Edit3, Link2, MessageCircle, Wand2 } from 'lucide-react';

export const features = [
  {
    icon: <Download className='w-6 h-6' />,
    title: 'Instant Downloads',
    description:
      'Get your generated thumbnail immediately with a single click. High-quality downloads in multiple formats for any platform.',
  },
  {
    icon: <Link2 className='w-6 h-6' />,
    title: 'Shareable Image Links',
    description:
      'Every thumbnail comes with a unique shareable link. Easily preview, share, or integrate your design anywhere online.',
  },
  {
    icon: <MessageCircle className='w-6 h-6' />,
    title: 'Smart Follow-up Chat',
    description:
      'Not happy with the first draft? Continue chatting with ThumbAI to refine, tweak colors, or explore new styles—just like a designer on demand.',
  },
];

export const steps = [
  {
    step: '01',
    title: 'Upload Your Image',
    description:
      'Start by uploading your base image or let our AI create one from scratch.',
  },
  {
    step: '02',
    title: 'Chat Your Vision',
    description:
      "Tell our AI what you want: 'Make it more vibrant', 'Add bold text', 'Gaming style thumbnail'.",
  },
  {
    step: '03',
    title: 'Get Perfect Results',
    description:
      'Receive multiple thumbnail variations in seconds. Download and use immediately.',
  },
];

export const models = [
  {
    title: 'TextThumb',
    subtitle: 'text-to-image',
    description:
      'Generate stunning thumbnails from text descriptions. Perfect for creating eye-catching visuals from your ideas.',
    isNew: true,
    backgroundImage: './pgmarry.jpeg',
    icon: <Wand2 className='w-3 h-3' />,
    navigate: '/nano-banana/text-to-image',
    onClick: () => console.log('Navigate to text-to-image'),
  },
  {
    title: 'EditThumb',
    subtitle: 'image-editor',
    description:
      'Transform existing images into perfect thumbnails. Edit, enhance, and optimize your visuals with AI precision.',
    isNew: true,
    backgroundImage: './hitshchai.jpeg',
    icon: <Edit3 className='w-3 h-3' />,
    navigate: '/nano-banana/edit-image',
    onClick: () => console.log('Navigate to image-editor'),
  },
];
