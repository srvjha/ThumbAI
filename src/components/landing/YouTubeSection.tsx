import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { RefineDemo } from './RefineDemo';
import { Tile } from './Tile';
import { FRAME, H2, SECTION } from './type';
import { YouTubeDemo } from './YouTubeDemo';
import { YouTubeIcon } from './YouTubeIcon';

// The logo leads the headline at cap height, unmodified; it only fades in with
// the heading, never moves on its own.
export const YouTubeSection = () => (
  <section className={`${SECTION} pt-0 md:pt-0`}>
    <div className={FRAME}>
      <Reveal stagger={0.08}>
        <RevealItem as='h2' className={H2}>
          <span className='block whitespace-nowrap'>
            <YouTubeIcon
              label='YouTube'
              className='mr-[0.22em] inline-block h-[0.74em] align-[-0.04em]'
            />
            Video’s done.
          </span>
          <span className='block'>Thumbnail isn’t?</span>
        </RevealItem>
      </Reveal>

      <Reveal
        stagger={0.09}
        className='mt-8 grid gap-4 md:mt-10 lg:grid-cols-12'
      >
        <Tile
          label='1280 × 720 for videos, 720 × 1280 for Shorts'
          title='One prompt, both sizes, ready to upload.'
          href='/studio/text-to-image'
          linkLabel='Make my thumbnail'
          className='lg:col-span-7'
        >
          <div className='mt-6'>
            <YouTubeDemo />
          </div>
        </Tile>

        <Tile
          label='Refine'
          title='Ask for changes in plain words.'
          href='/studio/image-to-image'
          linkLabel='Try refining an image'
          className='lg:col-span-5'
        >
          <div className='my-auto pt-6'>
            <RefineDemo />
          </div>
          <p className='pt-5 leading-relaxed'>
            Every version stays in your library, and the full-resolution file is
            one click away.
          </p>
        </Tile>
      </Reveal>

      <p className='mt-8 text-xs text-muted-foreground'>
        YouTube is a trademark of Google LLC. ThumbAI is not affiliated with
        YouTube.
      </p>
    </div>
  </section>
);
