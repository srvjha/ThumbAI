import Image from 'next/image';
import { GALLERY_SHORTS, GALLERY_VIDEOS, SAMPLES } from './samples';

export const SamplesGallery = () => (
  <section id='samples' className='scroll-mt-20 py-24 md:py-40'>
    <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <div className='grid gap-6 md:grid-cols-2 md:items-end'>
        <h2 className='font-serif text-[clamp(2.25rem,5vw,4rem)] leading-[1] tracking-[-0.02em] text-balance'>
          Made in the studio, untouched.
        </h2>
        <p className='max-w-md text-lg leading-relaxed md:justify-self-end'>
          Every image here is a straight render from a one-line prompt. The
          channels and people in them are made up.
        </p>
      </div>

      <ul className='mt-14 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3'>
        {GALLERY_VIDEOS.map((s) => (
          <li key={s.src}>
            <figure>
              <div className='relative aspect-video overflow-hidden rounded-lg bg-muted'>
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  sizes='(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw'
                  className='object-cover transition-transform duration-500 hover:scale-[1.03] motion-reduce:transition-none'
                />
              </div>
              <figcaption className='pt-3 text-sm text-muted-foreground'>
                {s.prompt}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      {/* Shorts and a blog cover share one row; flex-grow by aspect ratio
          keeps every image the same height. */}
      <div className='mt-8 flex flex-col gap-4 md:flex-row'>
        <ul className='grid grid-cols-3 gap-4 md:flex md:flex-[1.6875_1_0%]'>
          {GALLERY_SHORTS.map((s) => (
            <li key={s.src} className='md:flex-1'>
              <figure>
                <div className='relative aspect-[9/16] overflow-hidden rounded-lg bg-muted'>
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
            </li>
          ))}
        </ul>
        <figure className='md:flex-[1.7778_1_0%]'>
          <div className='relative aspect-video overflow-hidden rounded-lg bg-muted'>
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
        </figure>
      </div>
    </div>
  </section>
);
