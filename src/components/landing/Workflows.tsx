import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { H2 } from './type';
import {
  BlogCoverDemo,
  ImageToImageDemo,
  TextToImageDemo,
} from './WorkflowDemos';

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
      <Reveal stagger={0.08} className='grid gap-6 md:grid-cols-2 md:items-end'>
        <RevealItem as='h2' className={H2}>
          Three ways in, one studio.
        </RevealItem>
        <RevealItem
          as='p'
          className='max-w-md text-lg leading-relaxed md:justify-self-end'
        >
          Start from words, from a photo of you or your product, or from a post
          you already wrote.
        </RevealItem>
      </Reveal>

      {/* Each card runs a short loop of its own workflow while on screen. */}
      <Reveal stagger={0.09} className='mt-14 grid gap-4 lg:grid-cols-12'>
        <RevealItem
          as='article'
          className='flex flex-col rounded-2xl bg-card p-5 sm:p-7 lg:col-span-7'
        >
          <h3 className='text-xl font-medium'>Text to image</h3>
          <p className='mt-2 max-w-md leading-relaxed text-muted-foreground'>
            Describe the video and the words you want on it. Draft costs one
            credit, Quality costs three.
          </p>
          <TextToImageDemo />
          <div className='mt-6'>
            <StudioLink href='/studio/text-to-image' label='Write a prompt' />
          </div>
        </RevealItem>

        <RevealItem
          as='article'
          className='flex flex-col rounded-2xl bg-card p-5 sm:p-7 lg:col-span-5'
        >
          <h3 className='text-xl font-medium'>Image to image</h3>
          <p className='mt-2 leading-relaxed text-muted-foreground'>
            Upload a face or a product shot. It keeps the likeness and builds
            the thumbnail around it. Two credits per edit.
          </p>
          <ImageToImageDemo />
          <div className='mt-auto pt-6'>
            <StudioLink href='/studio/image-to-image' label='Upload a photo' />
          </div>
        </RevealItem>

        <RevealItem
          as='article'
          className='rounded-2xl bg-card p-5 sm:p-7 lg:col-span-12'
        >
          <BlogCoverDemo
            intro={
              <>
                <h3 className='text-xl font-medium'>Blog cover from a URL</h3>
                <p className='mt-2 max-w-sm leading-relaxed text-muted-foreground'>
                  Paste a link to your post. ThumbAI reads it, pulls out the
                  argument and sets an editorial cover with the title.
                </p>
              </>
            }
            action={
              <StudioLink href='/studio/blog-cover' label='Paste a link' />
            }
          />
        </RevealItem>
      </Reveal>
    </div>
  </section>
);
