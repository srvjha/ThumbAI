import Image from 'next/image';
import { FileText, ImagePlus, LayoutGrid, Type, Download } from 'lucide-react';
import { SAMPLES } from './samples';

/**
 * A static, non-interactive replica of the studio, so the hero shows the
 * product rather than describing it. Built from the same tokens as the real
 * AppShell; the canvas holds a real render.
 */
export const StudioMockup = () => (
  <div
    data-ui
    aria-label='The ThumbAI studio, with a finance thumbnail just generated'
    role='img'
    className='overflow-hidden rounded-2xl border bg-card'
  >
    {/* Window bar */}
    <div className='flex items-center gap-2 border-b bg-sidebar px-4 py-2.5'>
      <span className='size-2.5 rounded-full bg-border' />
      <span className='size-2.5 rounded-full bg-border' />
      <span className='size-2.5 rounded-full bg-border' />
      <span className='ml-3 truncate text-xs text-muted-foreground'>
        thumbai.app/studio/text-to-image
      </span>
    </div>

    <div className='grid md:grid-cols-[200px_300px_1fr] lg:grid-cols-[210px_330px_1fr]'>
      {/* Sidebar */}
      <aside /* taste-skill-ignore */ className='hidden border-r bg-sidebar p-4 md:block'>
        <p className='px-2 pb-2 text-xs text-muted-foreground'>Studio</p>
        <ul className='space-y-0.5 text-sm'>
          <li className='flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5 font-medium text-sidebar-accent-foreground'>
            <Type className='size-4' /> Text to Image
          </li>
          <li className='flex items-center gap-2 px-2 py-1.5 text-muted-foreground'>
            <ImagePlus className='size-4' /> Image to Image
          </li>
          <li className='flex items-center gap-2 px-2 py-1.5 text-muted-foreground'>
            <FileText className='size-4' /> Blog Cover
          </li>
        </ul>
        <p className='px-2 pt-6 pb-2 text-xs text-muted-foreground'>Account</p>
        <ul className='text-sm'>
          <li className='flex items-center gap-2 px-2 py-1.5 text-muted-foreground'>
            <LayoutGrid className='size-4' /> Library
          </li>
        </ul>
        <div className='mt-10 rounded-lg bg-accent px-3 py-2.5 text-xs text-accent-foreground'>
          <span className='font-medium tabular-nums'>17</span> credits left
        </div>
      </aside>

      {/* Prompt panel */}
      <div /* taste-skill-ignore */ className='order-2 border-t p-4 md:order-none md:border-t-0 md:border-r md:p-5'>
        <p className='text-sm font-medium'>Describe your video</p>
        <div className='mt-2 rounded-lg border bg-background p-3 text-sm leading-relaxed text-foreground'>
          Finance explainer. Woman holding a torn payslip, bar chart beside
          her, title &ldquo;Where it goes&rdquo;.
        </div>

        <p className='mt-4 text-sm font-medium'>Size</p>
        <div className='mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs'>
          <span className='rounded-md bg-card py-1.5 text-center font-medium shadow-xs'>
            YouTube 16:9
          </span>
          <span className='py-1.5 text-center text-muted-foreground'>
            Shorts 9:16
          </span>
        </div>

        <p className='mt-4 text-sm font-medium'>Model</p>
        <div className='mt-2 space-y-1.5 text-xs'>
          <div className='flex items-center justify-between rounded-lg border border-brand bg-brand-muted px-3 py-2'>
            <span className='font-medium'>Draft</span>
            <span className='text-muted-foreground'>1 credit</span>
          </div>
          <div className='flex items-center justify-between rounded-lg border px-3 py-2'>
            <span className='font-medium'>Quality</span>
            <span className='text-muted-foreground'>3 credits</span>
          </div>
        </div>

        <div className='btn-brand mt-5 flex h-10 items-center justify-center rounded-lg text-sm font-medium'>
          Generate thumbnail
        </div>
      </div>

      {/* Canvas */}
      <div className='order-1 bg-background p-4 md:order-none md:p-6'>
        <div className='flex items-center justify-between pb-3 text-xs text-muted-foreground'>
          <span>1280 &times; 720 &middot; Draft</span>
          <span className='inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-foreground'>
            <Download className='size-3.5' /> Download
          </span>
        </div>
        <div className='relative aspect-video overflow-hidden rounded-lg'>
          <Image
            src={SAMPLES.finance.src}
            alt={SAMPLES.finance.alt}
            fill
            priority
            sizes='(min-width: 1280px) 640px, (min-width: 768px) 50vw, 100vw'
            className='object-cover'
          />
        </div>
        <p className='pt-4 pb-2 text-xs text-muted-foreground'>Recent</p>
        <div className='grid grid-cols-3 gap-2'>
          {[SAMPLES.techApi, SAMPLES.cooking, SAMPLES.travel].map((s) => (
            <div
              key={s.src}
              className='relative aspect-video overflow-hidden rounded-md'
            >
              <Image
                src={s.src}
                alt=''
                fill
                sizes='(min-width: 768px) 200px, 33vw'
                className='object-cover'
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
