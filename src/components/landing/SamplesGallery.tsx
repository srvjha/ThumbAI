import Image from 'next/image';
import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { SampleMarquee } from './SampleMarquee';
import { SAMPLES, WALL_MIXED } from './samples';
import { FRAME, H2, H2_ONE_LINE } from './type';

// Each card is a flat field of a colour taken from its render. The quote is
// the prompt, word for word; this page has renders to show, not customers.
const CARDS = [
  { sample: SAMPLES.cooking, kind: 'YouTube thumbnail', field: '#a8431c' },
  { sample: SAMPLES.blogOpenSource, kind: 'Blog cover', field: '#1d4e74' },
  { sample: SAMPLES.review, kind: 'YouTube thumbnail', field: '#27613a' },
];

const FACTS = [
  'Titles spelled exactly as you type them',
  `Your own face, with your likeness kept`,
  'Edit by chatting; every version is kept',
  'No subscription, buy credits once',
  'Full-resolution downloads',
  'Export for YouTube, Shorts, HD and blog cards',
];

const FACT_ROW = [...FACTS, ...FACTS];

export const SamplesGallery = () => (
  <section id='samples' className='scroll-mt-20 pb-20 md:pb-28'>
    <div className={FRAME}>
      <Reveal stagger={0.08}>
        <RevealItem as='h2' className={`${H2} ${H2_ONE_LINE}`}>
          Made in the studio, untouched.
        </RevealItem>
      </Reveal>

      <Reveal
        stagger={0.09}
        amount={0.15}
        className='mt-8 grid gap-4 md:mt-10 lg:grid-cols-3'
      >
        {CARDS.map(({ sample, kind, field }) => (
          <RevealItem
            as='figure'
            key={sample.src}
            className='flex flex-col overflow-hidden rounded-2xl text-white'
          >
            <div
              className='flex flex-1 flex-col'
              style={{ backgroundColor: field }}
            >
              <div className='relative aspect-video overflow-hidden'>
                <Image
                  src={sample.src}
                  alt={sample.alt}
                  fill
                  sizes='(min-width: 1024px) 370px, 100vw'
                  className='object-cover'
                />
              </div>
              <div className='flex flex-1 flex-col gap-6 p-5 sm:p-6'>
                <blockquote className='text-2xl leading-[1.2] font-medium tracking-[-0.02em] text-balance'>
                  &ldquo;{sample.prompt}&rdquo;
                </blockquote>
                <figcaption className='mt-auto text-sm'>{kind}</figcaption>
              </div>
            </div>
          </RevealItem>
        ))}
      </Reveal>

      <p className='mt-6 leading-relaxed'>
        Straight renders from one-line prompts. Every channel is made up.
      </p>
    </div>

    <Reveal delay={0.1} amount={0.15} className='mt-10'>
      <SampleMarquee
        rows={[
          {
            items: [...WALL_MIXED, ...WALL_MIXED],
            speed: 26,
            direction: -1,
          },
        ]}
      />
    </Reveal>

    {/* Doubled, and the keyframe moves it by half: the loop has no seam. */}
    <div
      className='mt-14 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] motion-reduce:overflow-x-auto' // taste-skill-ignore
    >
      <ul className='flex w-max animate-scroll gap-4 text-muted-foreground [--animation-duration:60s] hover:[animation-play-state:paused] motion-reduce:animate-none'>
        {FACT_ROW.map((fact, i) => (
          <li
            key={i}
            aria-hidden={i >= FACTS.length}
            className='flex items-center gap-4 whitespace-nowrap'
          >
            <span
              aria-hidden
              className='size-1.5 rounded-full bg-muted-foreground/50'
            />
            {fact}
          </li>
        ))}
      </ul>
    </div>
  </section>
);
