import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { StepConnector } from './StepConnector';
import { H2 } from './type';

const STEPS = [
  {
    title: 'Say what the video is',
    body: 'A sentence about the video and the words you want on the thumbnail. Add a photo or a post URL if you have one.',
  },
  {
    title: 'Pick a shape and a model',
    body: '16:9 or 9:16. Draft is fast and costs one credit; Quality takes longer, renders sharper type and costs three.',
  },
  {
    title: 'Refine, then download',
    body: 'Ask for changes in plain words. Every version stays in your library, and the full-resolution file is one click away.',
  },
];

export const HowItWorks = () => (
  <section className='bg-accent py-24 text-accent-foreground md:py-36'>
    <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <Reveal as='h2' className={`max-w-2xl ${H2}`}>
        From idea to upload in three moves.
      </Reveal>
      {/* A real sequence: the steps arrive in order while the line joining
          their markers draws across. */}
      <Reveal
        as='ol'
        stagger={0.28}
        delay={0.1}
        amount={0.3}
        className='relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8'
      >
        <StepConnector />
        {STEPS.map((step) => (
          <RevealItem as='li' key={step.title} className='relative'>
            <span
              aria-hidden
              className='ml-6 block size-3 rounded-full bg-brand ring-4 ring-accent'
            />
            <div className='mt-5 rounded-2xl bg-card p-6 text-foreground'>
              <h3 className='font-serif text-2xl leading-[1.1]'>
                {step.title}
              </h3>
              <p className='mt-3 leading-relaxed'>{step.body}</p>
            </div>
          </RevealItem>
        ))}
      </Reveal>
    </div>
  </section>
);
