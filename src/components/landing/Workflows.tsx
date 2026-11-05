import Image from 'next/image';
import Link from 'next/link';
import { starterHref, type StarterId } from '@/config/starters';
import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { SAMPLES, type Sample } from './samples';
import { Tile, TileArrow, TileTitle } from './Tile';
import { FRAME, H2, H2_ONE_LINE, SECTION } from './type';
import {
  BlogCoverDemo,
  ImageToImageDemo,
  TextToImageDemo,
} from './WorkflowDemos';

const KINDS: { label: string; sample: Sample; starter: StarterId }[] = [
  { label: 'Coding tutorial', sample: SAMPLES.techApi, starter: 'coding' },
  { label: 'Recipe', sample: SAMPLES.cooking, starter: 'recipe' },
  { label: 'Travel vlog', sample: SAMPLES.travel, starter: 'travel' },
  { label: 'Product review', sample: SAMPLES.review, starter: 'review' },
  { label: 'Gaming series', sample: SAMPLES.gaming, starter: 'gaming' },
  { label: 'Podcast', sample: SAMPLES.podcast, starter: 'podcast' },
];

export const Workflows = () => (
  <section className={SECTION}>
    <div className={FRAME}>
      <Reveal stagger={0.08}>
        <RevealItem as='h2' className={`${H2} ${H2_ONE_LINE}`}>
          Three ways in, one studio.
        </RevealItem>
      </Reveal>

      {/* Each tile runs a short loop of its own workflow while on screen. */}
      <Reveal
        stagger={0.09}
        className='mt-8 grid gap-4 lg:grid-cols-2 md:mt-10'
      >
        <Tile
          label='Start from words'
          title='Describe the video, name the title.'
          href='/studio/text-to-image'
          linkLabel='Open text to image'
        >
          <TextToImageDemo />
        </Tile>

        <Tile
          label='Start from a photo'
          title='Your face or product, built into the frame.'
          href='/studio/image-to-image'
          linkLabel='Open image to image'
        >
          <ImageToImageDemo />
        </Tile>

        <RevealItem
          as='article'
          className='group rounded-2xl bg-secondary p-5 sm:p-6 lg:col-span-2'
        >
          <BlogCoverDemo
            intro={
              <TileTitle
                label='Start from a post'
                title='Paste a link, get an editorial cover.'
              />
            }
            action={
              <TileArrow href='/studio/blog-cover' label='Open blog cover' />
            }
          />
        </RevealItem>
      </Reveal>

      <Reveal stagger={0.06} amount={0.15} className='mt-14'>
        <RevealItem as='h3' className='text-sm text-muted-foreground'>
          Start with a kind of video
        </RevealItem>
        {/* Six divide evenly at two and three across; five fill the row at lg. */}
        <ul className='mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5'>
          {KINDS.map(({ label, sample, starter }, i) => (
            <RevealItem
              as='li'
              key={label}
              className={i === KINDS.length - 1 ? 'lg:hidden' : undefined}
            >
              <Link
                href={starterHref(starter)}
                className='group block rounded-xl bg-secondary p-2.5 pb-4 transition-transform duration-200 hover:-translate-y-1'
              >
                <span className='relative block aspect-video overflow-hidden rounded-lg'>
                  <Image
                    src={sample.src}
                    alt=''
                    fill
                    sizes='(min-width: 1024px) 220px, (min-width: 768px) 33vw, 50vw'
                    className='object-cover'
                  />
                </span>
                <span className='mt-3 block px-1.5 font-bold tracking-[-0.01em]'>
                  {label}{' '}
                  <span
                    aria-hidden
                    className='inline-block transition-transform duration-200 group-hover:translate-x-0.5'
                  >
                    &rarr;
                  </span>
                </span>
              </Link>
            </RevealItem>
          ))}
        </ul>
      </Reveal>
    </div>
  </section>
);
