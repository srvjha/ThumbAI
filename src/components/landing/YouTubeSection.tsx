import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { H2 } from './type';
import { YouTubeDemo } from './YouTubeDemo';
import { YouTubeIcon } from './YouTubeIcon';

// Copy left, the live YouTube demo right. The logo sits outside every
// animated wrapper: the brand rules forbid moving it.
export const YouTubeSection = () => (
  <section className='py-24 md:py-40'>
    <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <div className='grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16'>
        <div>
          <YouTubeIcon label='YouTube' className='h-11' />
          <Reveal stagger={0.08} className='mt-8'>
            <RevealItem as='h2' className={H2}>
              <span className='block'>Video’s done.</span>
              <span className='block'>Thumbnail isn’t?</span>
            </RevealItem>
            <RevealItem
              as='p'
              className='mt-5 max-w-md text-lg leading-relaxed text-pretty'
            >
              Give it a prompt, attach your face or product if you want, and get
              a YouTube thumbnail and a Shorts cover, ready to upload.
            </RevealItem>
            <RevealItem className='mt-8'>
              <Button asChild variant='brand' size='xl'>
                <Link href='/studio/text-to-image'>
                  Make my thumbnail <ArrowRight />
                </Link>
              </Button>
            </RevealItem>
            <RevealItem
              as='p'
              className='mt-5 text-sm text-muted-foreground tabular-nums'
            >
              1280 &times; 720 for videos &middot; 720 &times; 1280 for Shorts
            </RevealItem>
          </Reveal>
        </div>

        <YouTubeDemo />
      </div>

      <p className='mt-16 text-xs text-muted-foreground md:mt-20'>
        YouTube is a trademark of Google LLC. ThumbAI is not affiliated with
        YouTube.
      </p>
    </div>
  </section>
);
