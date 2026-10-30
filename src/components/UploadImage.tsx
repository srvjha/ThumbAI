'use client';
import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from './ui/card';
import { Sparkles, Upload, Wand2, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { fal } from '@fal-ai/client';
import Link from 'next/link';

interface ImgDetails {
  size: number;
  type: string;
  name: string;
}

export const UploadImage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageFile, setImageFile] = useState<string>('');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [imageDetails, setImageDetails] = useState<ImgDetails>({
    size: 0,
    type: '',
    name: '',
  });

  const formatFileSize = (size: number) => {
    if (size < 1024) return size + ' B';
    else if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
    else return (size / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleFiles = async (file: File | null) => {
    if (!file) return;
    setImageDetails({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    const url = await fal.storage.upload(file);
    setImageFile(url);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files[0]);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div className='relative max-w-5xl mx-auto'>
      <Card className='relative overflow-hidden bg-card'>
        <CardContent className='p-8'>
          <div className='grid lg:grid-cols-2 gap-8'>
            {imageFile ? (
              <div>
                <img
                  className='object-cover w-full h-full rounded-xl'
                  src={imageFile}
                  alt={imageDetails.name}
                />
                {/* Image details section */}
                <div className='flex gap-4 mt-2 text-muted-foreground text-sm flex-wrap'>
                  <p>
                    <span className='font-semibold'>Name:</span>{' '}
                    {imageDetails.name}
                  </p>
                  <p>
                    <span className='font-semibold'>Type:</span>{' '}
                    {imageDetails.type}
                  </p>
                  <p>
                    <span className='font-semibold'>Size:</span>{' '}
                    {formatFileSize(imageDetails.size)}
                  </p>
                </div>
              </div>
            ) : (
              <div className='space-y-4'>
                <h3 className='text-xl font-semibold text-foreground mb-4'>
                  Upload Your Image
                </h3>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`border-2 border-dashed ${
                    isDragging
                      ? 'border-brand bg-accent'
                      : 'border-foreground/15'
                  } rounded-lg p-8 text-center transition-colors bg-background`}
                >
                  <Upload className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
                  <p className='text-foreground mb-2'>
                    Drag & drop your image here
                  </p>
                  <p className='text-sm text-muted-foreground mb-4'>
                    or click to browse files
                  </p>
                  <Button
                    variant='outline'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                </div>
                <p className='text-xs text-muted-foreground text-center'>
                  Supports JPG, PNG, WEBP up to 10MB
                </p>

                <input
                  ref={fileInputRef}
                  type='file'
                  className='hidden'
                  accept='image/png, image/jpeg, image/webp'
                  multiple={false}
                  onChange={(e) =>
                    e.target.files &&
                    (e.target.files[0] ? handleFiles(e.target.files[0]) : null)
                  }
                />
              </div>
            )}

            {/* Prompt Section */}
            <div className='space-y-4'>
              <h3 className='text-xl font-semibold text-foreground mb-4'>
                Describe Your Vision
              </h3>
              <div className='space-y-4'>
                <textarea
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Tell our AI what you want... e.g., 'Make it gaming-style with bold text and neon effects' or 'Create a professional business thumbnail with clean typography'"
                  className='w-full h-32 bg-background border rounded-lg p-4 text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none resize-none'
                />
                <Link
                  href={{
                    pathname: '/generate',
                    query: {
                      data: JSON.stringify({
                        imageDetails,
                        imageFile,
                        userQuery,
                      }),
                    },
                  }}
                >
                  <Button variant='brand' size='xl' className='w-full'>
                    <Wand2 className='w-5 h-5 mr-2' />
                    Generate Thumbnail
                  </Button>
                </Link>
              </div>
              <div className='flex items-center justify-center space-x-4 text-sm text-muted-foreground'>
                <div className='flex items-center'>
                  <Zap className='w-4 h-4 mr-1 text-brand' />
                  Fast Generation
                </div>
                <div className='flex items-center'>
                  <Sparkles className='w-4 h-4 mr-1 text-brand' />
                  AI Powered
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadImage;
