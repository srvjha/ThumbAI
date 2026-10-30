import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { GALLERY_SHORTS, GALLERY_VIDEOS, SAMPLES } from './samples';
import { H2 } from './type';

// Lifts on hover, only where there is a fine pointer to hover with.
const LIFT =
  'transition-[translate,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-fine:hover:-translate-y-1 pointer-fine:hover:shadow-[0_14px_30px_-16px_rgb(18_23_43/0.45)] motion-reduce:transition-none';

export const SamplesGallery = () => (
  <section id='samples' className='scroll-mt-20 py-24 md:py-40'>
    <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <Reveal stagger={0.08} className='grid gap-6 md:grid-cols-2 md:items-end'>
        <RevealItem as='h2' className={H2}>
          Made in the studio, untouched.
        </RevealItem>
        <RevealItem
          as='p'
          className='max-w-md text-lg leading-relaxed md:justify-self-end'
        >
          Every image here is a straight render from a one-line prompt. The
          channels and people in them are made up.
        </RevealItem>
      </Reveal>

      <Reveal
        as='ul'
        stagger={0.07}
        amount={0.1}
        className='mt-14 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3'
      >
        {GALLERY_VIDEOS.map((s) => (
          <RevealItem as='li' key={s.src}>
            <figure>
              <div
                className={cn(
                  'relative aspect-video overflow-hidden rounded-lg bg-muted',
                  LIFT,
                )}
              >
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  sizes='(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw'
                  className='object-cover'
                />
              </div>
              <figcaption className='pt-3 text-sm text-muted-foreground'>
                {s.prompt}
              </figcaption>
            </figure>
          </RevealItem>
        ))}
      </Reveal>

      {/* Shorts and a blog cover share one row; flex-grow by aspect ratio
          keeps every image the same height. */}
      <Reveal
        stagger={0.07}
        amount={0.1}
        className='mt-8 flex flex-col gap-4 md:flex-row'
      >
        <ul className='grid grid-cols-3 gap-4 md:flex md:flex-[1.6875_1_0%]'>
          {GALLERY_SHORTS.map((s) => (
            <RevealItem as='li' key={s.src} className='md:flex-1'>
              <figure>
                <div
                  className={cn(
                    'relative aspect-[9/16] overflow-hidden rounded-lg bg-muted',
                    LIFT,
                  )}
                >
                  <Image
                    src={s.src}
                    alt={s.alt}
                    fill
                    sizes='(min-width: 768px) 190px, 33vw'
                    className='object-cover'
                  />
                </div>
                <figcaption className='pt-3 text-sm text-muted-foreground'>
                  Shorts, 9:16
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </ul>
        <RevealItem as='figure' className='md:flex-[1.7778_1_0%]'>
          <div
            className={cn(
              'relative aspect-video overflow-hidden rounded-lg bg-muted',
              LIFT,
            )}
          >
            <Image
              src={SAMPLES.blogSlowWeb.src}
              alt={SAMPLES.blogSlowWeb.alt}
              fill
              sizes='(min-width: 768px) 560px, 100vw'
              className='object-cover'
            />
          </div>
          <figcaption className='pt-3 text-sm text-muted-foreground'>
            Blog cover, from a post URL
          </figcaption>
        </RevealItem>
      </Reveal>
    </div>
  </section>
);
