import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Link2 } from 'lucide-react';
import { SAMPLES } from './samples';

const StudioLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className='group inline-flex items-center gap-1.5 text-sm font-medium text-brand'
  >
    {label}
    <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
  </Link>
);

export const Workflows = () => (
  <section className='bg-secondary py-24 md:py-36'>
    <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <div className='grid gap-6 md:grid-cols-2 md:items-end'>
        <h2 className='font-serif text-[clamp(2.25rem,5vw,4rem)] leading-[1] tracking-[-0.02em] text-balance'>
          Three ways in, one studio.
        </h2>
        <p className='max-w-md text-lg leading-relaxed md:justify-self-end'>
          Start from words, from a photo of you or your product, or from a
          post you already wrote.
        </p>
      </div>

      <div className='mt-14 grid gap-4 lg:grid-cols-12'>
        {/* Text to image */}
        <article className='flex flex-col rounded-2xl bg-card p-5 sm:p-7 lg:col-span-7'>
          <h3 className='text-xl font-medium'>Text to image</h3>
          <p className='mt-2 max-w-md leading-relaxed text-muted-foreground'>
            Describe the video and the words you want on it. Draft costs one
            credit, Quality costs three.
          </p>
          <div className='mt-6 rounded-lg bg-background px-4 py-3 text-sm'>
            &ldquo;{SAMPLES.techApi.prompt}, title &lsquo;API in 15 min&rsquo;&rdquo;
          </div>
          <div className='relative mt-3 aspect-video overflow-hidden rounded-lg'>
            <Image
              src={SAMPLES.techApi.src}
              alt={SAMPLES.techApi.alt}
              fill
              sizes='(min-width: 1024px) 620px, 100vw'
              className='object-cover'
            />
          </div>
          <div className='mt-6'>
            <StudioLink href='/studio/text-to-image' label='Write a prompt' />
          </div>
        </article>

        {/* Image to image */}
        <article className='flex flex-col rounded-2xl bg-card p-5 sm:p-7 lg:col-span-5'>
          <h3 className='text-xl font-medium'>Image to image</h3>
          <p className='mt-2 leading-relaxed text-muted-foreground'>
            Upload a face or a product shot. It keeps the likeness and builds
            the thumbnail around it. Two credits per edit.
          </p>
          <div className='mt-6 grid grid-cols-[0.8fr_auto_1fr] items-center gap-3 lg:grid-cols-1'>
            <div className='relative aspect-square w-full overflow-hidden rounded-lg lg:w-32'>
              <Image
                src={SAMPLES.sourcePortrait.src}
                alt={SAMPLES.sourcePortrait.alt}
                fill
                sizes='(min-width: 1024px) 128px, 30vw'
                className='object-cover'
              />
            </div>
            <ArrowRight
              aria-hidden
              className='size-5 text-muted-foreground lg:rotate-90'
            />
            <div className='relative aspect-video w-full overflow-hidden rounded-lg'>
              <Image
                src={SAMPLES.editNotes.src}
                alt={SAMPLES.editNotes.alt}
                fill
                sizes='(min-width: 1024px) 440px, 55vw'
                className='object-cover'
              />
            </div>
          </div>
          <div className='mt-auto pt-6'>
            <StudioLink href='/studio/image-to-image' label='Upload a photo' />
          </div>
        </article>

        {/* Blog cover */}
        <article className='grid gap-6 rounded-2xl bg-card p-5 sm:p-7 md:grid-cols-[1fr_1.3fr] md:items-center lg:col-span-12 lg:gap-12'>
          <div>
            <h3 className='text-xl font-medium'>Blog cover from a URL</h3>
            <p className='mt-2 max-w-sm leading-relaxed text-muted-foreground'>
              Paste a link to your post. ThumbAI reads it, pulls out the
              argument and sets an editorial cover with the title.
            </p>
            <div className='mt-6 flex items-center gap-2 rounded-lg bg-background px-3 py-2.5 text-sm'>
              <Link2 aria-hidden className='size-4 shrink-0 text-muted-foreground' />
              <span className='truncate'>yourblog.com/quiet-economics-of-open-source</span>
            </div>
            <div className='mt-6'>
              <StudioLink href='/studio/blog-cover' label='Paste a link' />
            </div>
          </div>
          <div className='relative aspect-video overflow-hidden rounded-lg'>
            <Image
              src={SAMPLES.blogOpenSource.src}
              alt={SAMPLES.blogOpenSource.alt}
              fill
              sizes='(min-width: 1024px) 620px, (min-width: 768px) 55vw, 100vw'
              className='object-cover'
            />
          </div>
        </article>
      </div>
    </div>
  </section>
);
