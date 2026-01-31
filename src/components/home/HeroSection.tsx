'use client';
import { models } from '@/app/data/homeData';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import FeatureCard from '../Feature';
import { Badge } from '../ui/badge';

export const HeroSection = () => {
  return (
    <section className='pt-32 pb-20 px-4 sm:px-6 lg:px-8'>
      <div className='container mx-auto text-center'>
        <div className='inline-flex items-center space-x-2 bg-white/5 border border-neutral-700 rounded-full px-3 py-2 mb-8'>
          <Sparkles className='w-3 h-3 text-blue-400' />
          <span className='text-xs text-gray-300'>
            AI-Powered Thumbnail Generation
          </span>
        </div>
        <h1
          className='
            text-4xl sm:text-6xl lg:text-6xl 
            font-bold mb-6 
            bg-gradient-to-r from-white via-gray-200 to-gray-400 
            bg-clip-text text-transparent leading-tight 
            tracking-tight   /* decrease character spacing */
            word-spacing-tight /* custom class for word spacing */
          '
        >
          Create High-Quality{' '}
          <span className='bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent'>
            Thumbnails
          </span>
          <br />
          Within Seconds
        </h1>

        <p className='text-sm text-neutral-400 mb-8 max-w-2xl mx-auto leading-relaxed'>
          Just express your thoughts and let our AI create eye-catching
          thumbnails that boost engagement. No design skills needed – just
          describe what you want in plain English.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 justify-center mb-16'>
          <Link
            href='/nano-banana/edit-image'
            className='flex flex-col sm:flex-row gap-4 justify-center'
          >
            <button className='bg-gradient-to-r cursor-pointer border border-black/10 bg-blue-600 text-white px-5 py-3  rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center'>
              Create Thumbnails
              <ArrowRight className='w-5 h-5 ml-2' />
            </button>
          </Link>

          <div className='relative inline-block'>
            <Link href='/nano-banana/url-to-image'
            className='flex flex-col sm:flex-row gap-4 justify-center'
            >
              <button className='bg-gradient-to-r cursor-pointer border border-blue-500/30 text-white px-5 py-3  rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center'>
                Create for Blog
              </button>
            </Link>

            <Badge className='absolute -top-2 -right-3 bg-blue-500 text-white'>
              NEW
            </Badge> 
           </div>
        </div>

        <div className='max-w-5xl mx-auto mb-20 bg-transparent rounded-2xl '>
          <div className='relative rounded-2xl overflow-hidden border border-neutral-900 shadow-sm shadow-neutral-800'>
            <div className=' '>
              <video
                className='w-full h-full object-cover'
                src='/thumbai.mp4'
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
          </div>
        </div>

        <section className='py-20 px-4 sm:px-6 lg:px-8'>
          <div className='container mx-auto'>
            <div className='text-center mb-16'>
              <h2 className='text-3xl sm:text-4xl font-bold mb-4'>
                Choose Your{' '}
                <span className='text-blue-400'>Thumbnail Workflow</span>
              </h2>
              <p className='text-xl text-gray-400 max-w-2xl mx-auto'>
                Two specialized workflows designed for different thumbnail
                creation needs.
              </p>
            </div>

            <div className='grid md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
              {models.map((model, index) => (
                <FeatureCard
                  key={index}
                  title={model.title}
                  subtitle={model.subtitle}
                  description={model.description}
                  isNew={model.isNew}
                  backgroundImage={model.backgroundImage}
                  icon={model.icon}
                  navigate={model.navigate}
                  onClick={model.onClick}
                />
              ))}
            </div>

            {/* Additional Info */}
            <div className='text-center mt-12'>
              <p className='text-gray-500 text-sm'>
                Both models are optimized for thumbnail generation and support
                high-resolution outputs
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};
