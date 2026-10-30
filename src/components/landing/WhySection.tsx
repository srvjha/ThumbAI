import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { FeedSizePreview } from './FeedSizePreview';
import { H2 } from './type';

const POINTS = [
  {
    title: 'Titles spelled the way you typed them',
    body: 'Put your words in quotes and they render letter for letter. No invented words, no melted type.',
  },
  {
    title: 'One subject, loud contrast',
    body: 'Every render keeps a single focal point and separates it from the background, so it still reads as a postage stamp.',
  },
  {
    title: 'Both shapes, same prompt',
    body: '16:9 at 1280 × 720 for videos, 9:16 at 720 × 1280 for Shorts. The sizes YouTube asks for, no cropping afterwards.',
  },
];

export const WhySection = () => (
  <section className='py-24 md:py-40'>
    <div className='mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-20 lg:px-8'>
      <Reveal stagger={0.08}>
        <RevealItem as='h2' className={H2}>
          Most people decide at 168 pixels wide.
        </RevealItem>
        <RevealItem as='p' className='mt-6 max-w-lg text-lg leading-relaxed'>
          On a phone, a thumbnail is about the width of a thumb. ThumbAI
          composes for that size first, then gives you the full-resolution file.
        </RevealItem>
        <dl className='mt-10 space-y-7'>
          {POINTS.map((p) => (
            <RevealItem key={p.title}>
              <dt className='font-medium'>{p.title}</dt>
              <dd className='mt-1 max-w-md leading-relaxed text-muted-foreground'>
                {p.body}
              </dd>
            </RevealItem>
          ))}
        </dl>
      </Reveal>
      <Reveal delay={0.15} className='lg:pt-4'>
        <FeedSizePreview />
      </Reveal>
    </div>
  </section>
);
