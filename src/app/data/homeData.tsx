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
    title: 'Choose Your Workflow',
    description:
      'Start by choosing your workflow: Text to Image or Image to Image.',
  },
  {
    step: '02',
    title: 'Describe Your Vision',
    description:
      "Write a prompt to describe your thumbnail, fill questionnaire if required.",
  },
  {
    step: '03',
    title: 'Generate Thumbnail',
    description:
      'Based on your prompt, thumbnail will be generated within seconds. You can download the thumbnail and use it immediately.',
  },
  {
    step: '04',
    title: 'Chat with AI',
    description:
      'Not happy with the first draft? Continue chatting with ThumbAI to refine, tweak colors, or explore new styles—just like a designer on demand.',
  },
  {
    step: '05',
    title: 'Download Thumbnail',
    description:
      'Download the thumbnail and use it immediately. You can also share the thumbnail with your friends or use it on your social media platforms.',
  },
  {
    step: '06',
    title: 'Share Thumbnail',
    description:
      'Share the thumbnail with your friends or use it on your social media platforms.',
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
