'use client';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ModelCardProps {
  title: string;
  subtitle: string;
  description: string;
  isNew?: boolean;
  backgroundImage: string;
  icon: React.ReactNode;
  navigate: string;
  onClick?: () => void;
}

const FeatureCard: React.FC<ModelCardProps> = ({
  subtitle,
  description,
  backgroundImage,
  icon,
  navigate,
  onClick,
}) => {
  return (
    <Card
      className='group relative gap-0 overflow-hidden border bg-card p-0 transition-colors hover:border-foreground/20'
      onClick={onClick}
    >
      {/* Background Image */}
      <div className='relative aspect-[16/9] overflow-hidden'>
        <div
          className='absolute inset-0 transition-transform group-hover:scale-105'
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>

      {/* Content */}
      <CardContent className='border-t p-6'>
        <div className='space-y-3'>
          <div className='flex items-center space-x-2'>
            <div className='flex items-center gap-1.5 text-sm font-medium text-foreground [&_svg]:size-4 [&_svg]:text-brand'>
              {icon}
              <span>{subtitle}</span>
            </div>
          </div>

          <p className='text-left text-sm leading-relaxed text-muted-foreground'>
            {description}
          </p>

          <Link href={`${navigate}`}>
            <Button variant='brand' className='mt-4 w-full cursor-pointer'>
              Try Now
              <ArrowRight className='w-4 h-4 ml-1' />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;
