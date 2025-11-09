import { features } from '@/app/data/homeData';
import React from 'react';
import { Card, CardContent } from '../ui/card';

export const FeaturesSection = () => {
  return (
    <section
      id='features'
      className='py-20 px-4 sm:px-6 lg:px-8 bg-transparent max-w-6xl mx-auto'
    >
      <div className='container mx-auto'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl sm:text-4xl font-bold mb-4'>
            Why Choose <span className='text-blue-400'>ThumbAI</span>?
          </h2>
          <p className='text-xl text-gray-400 max-w-2xl mx-auto'>
            Powerful features designed to make thumbnail creation effortless and
            engaging
          </p>
        </div>

        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {features.map((feature, index) => (
            <Card
              key={index}
              className='bg-neutral-950/50 border-neutral-800 hover:border-neutral-700 py-4 transition-all hover:shadow-lg hover:shadow-blue-500/10 group'
            >
              <CardContent className='px-6 py-4 flex flex-col items-center justify-center'>
                <div className='w-12 h-12 bg-blue-500  rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  {feature.icon}
                </div>
                <h3 className='text-xl font-semibold mb-2 text-white'>
                  {feature.title}
                </h3>
                <p className='text-gray-400 leading-relaxed text-center'>
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
