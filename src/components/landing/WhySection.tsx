import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { FeedSizePreview } from './FeedSizePreview';
import { H2 } from './type';

// Headline and preview centre on each other; the preview does the talking.
export const WhySection = () => (
  <section className='py-24 md:py-40'>
    <div className='mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:px-8'>
      <Reveal stagger={0.08}>
        <RevealItem as='h2' className={H2}>
          Most people decide at 168 pixels wide.
        </RevealItem>
        <RevealItem as='p' className='mt-5 max-w-md text-lg leading-relaxed'>
          ThumbAI composes for a thumb-sized feed first.
        </RevealItem>
        <RevealItem as='p' className='mt-8 text-sm text-muted-foreground'>
          Every file still ships at 1280 &times; 720.
        </RevealItem>
      </Reveal>
      <Reveal delay={0.15}>
        <FeedSizePreview />
      </Reveal>
    </div>
  </section>
);
