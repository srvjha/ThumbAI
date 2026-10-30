import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { SampleMarquee } from './SampleMarquee';
import { WALL_MIXED, WALL_VIDEOS } from './samples';
import { H2, H2_ONE_LINE } from './type';

// The mixed row is short, so it runs twice per copy to outspan a wide screen.
const ROWS = [
  { items: WALL_VIDEOS, speed: 38, direction: 1 as const },
  { items: [...WALL_MIXED, ...WALL_MIXED], speed: 26, direction: -1 as const },
];

export const SamplesGallery = () => (
  <section id='samples' className='scroll-mt-20 py-24 md:py-40'>
    <Reveal stagger={0.08} className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <RevealItem as='h2' className={`${H2} ${H2_ONE_LINE}`}>
        Made in the studio, untouched.
      </RevealItem>
      <RevealItem as='p' className='mt-5 text-lg leading-relaxed'>
        Straight renders from one-line prompts. Every channel is made up.
      </RevealItem>
    </Reveal>

    <Reveal delay={0.15} amount={0.15} className='mt-14 md:mt-16'>
      <SampleMarquee rows={ROWS} />
    </Reveal>
  </section>
);
