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
      <h2 className='max-w-2xl font-serif text-[clamp(2.25rem,5vw,4rem)] leading-[1] tracking-[-0.02em] text-balance'>
        From idea to upload in three moves.
      </h2>
      <ol className='mt-14 grid gap-10 md:grid-cols-3 md:gap-8'>
        {STEPS.map((step) => (
          <li key={step.title} className='rounded-2xl bg-card p-6 text-foreground'>
            <h3 className='font-serif text-3xl leading-tight'>{step.title}</h3>
            <p className='mt-3 leading-relaxed'>{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
