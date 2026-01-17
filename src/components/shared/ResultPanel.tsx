'use client';

import { Card, CardContent } from '../ui/card';
import { Loader2, ImageIcon, Download } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import toast from 'react-hot-toast';
import { ImageData, getImageContainerStyle, getGridLayout, downloadImagesAsZip } from './imageUtils';
import { ImageActionButtons } from './ImageActionButtons';
import { ReactNode } from 'react';

interface ResultPanelProps {
  status: 'idle' | 'generating' | 'in-progress' | 'completed';
  displayImages: ImageData[];
  isGenerating: boolean;
  outputFormat: string;
  onEdit?: (selectedIdx: number) => void;
  renderCustomContent?: () => ReactNode;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-700 bg-transparent text-white text-sm'>
    <span
      className={`w-2.5 h-2.5 rounded-full ${
        status === 'completed'
          ? 'bg-green-500'
          : status === 'generating'
            ? 'bg-amber-400'
            : status === 'in-progress'
              ? 'bg-blue-400'
              : 'bg-neutral-500'
      }`}
    />
    <span>
      {status === 'completed'
        ? 'Completed'
        : status === 'generating'
          ? 'Generating'
          : status === 'in-progress'
            ? 'In Progress'
            : ''}
    </span>
  </div>
);

const LoadingState: React.FC<{ status: string }> = ({ status }) => (
  <div className='flex flex-col items-center justify-center gap-3 h-full min-h-[400px]'>
    <Loader2 className='w-16 h-16 animate-spin text-neutral-400' />
    <p className='text-neutral-400'>
      {status === 'generating' ? 'Generating...' : 'Processing your image...'}
    </p>
  </div>
);

const EmptyState: React.FC = () => (
  <div className='flex flex-col items-center justify-center gap-3 text-neutral-400 h-full min-h-[400px]'>
    <ImageIcon className='w-16 h-16' />
    <p className='text-lg mb-1'>No images generated yet</p>
    <p className='text-sm text-center'>Enter a prompt to start generating</p>
  </div>
);

export const ResultPanel: React.FC<ResultPanelProps> = ({
  status,
  displayImages,
  outputFormat,
  onEdit,
  renderCustomContent,
}) => {
  const handleDownloadAll = async () => {
    if (displayImages.length === 0) return;

    try {
      toast.loading('Preparing zip file...', { id: 'zip-download' });
      await downloadImagesAsZip(displayImages, outputFormat, 'generated');
      toast.success('All images downloaded as zip!', { id: 'zip-download' });
    } catch (error) {
      toast.error('Failed to create zip file. Please try again.', {
        id: 'zip-download',
      });
    }
  };

  return (
    <Card className='bg-transparent border-2 border-dotted border-neutral-600 h-auto overflow-y-auto p-1'>
      <CardContent className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-neutral-100'>Result</h3>

          {status !== 'idle' && <StatusBadge status={status} />}
        </div>

        <div className='min-h-auto bg-neutral-950 rounded-lg border-none p-4 flex flex-col'>
          {status === 'generating' || status === 'in-progress' ? (
            <LoadingState status={status} />
          ) : displayImages.length > 0 ? (
            <div className='flex flex-col h-full'>
              <div className='flex-1'>
                {displayImages.length === 1 ? (
                  <div className='flex justify-center items-start h-full'>
                    <div className='relative group'>
                      <img
                        src={displayImages[0].url}
                        alt='Generated'
                        className={`rounded-lg border border-neutral-700 ${getImageContainerStyle(
                          displayImages[0].aspectRatio,
                        )}`}
                      />
                      <div className='absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                        <ImageActionButtons
                          imageUrl={displayImages[0].url}
                          aspectRatio={displayImages[0].aspectRatio}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`grid ${getGridLayout(displayImages)}`}>
                    {displayImages.map((img, idx) => (
                      <div key={idx} className='relative group'>
                        <img
                          src={img.url}
                          alt={`Generated ${idx + 1}`}
                          className={`rounded-lg border border-neutral-700 ${getImageContainerStyle(
                            img.aspectRatio,
                          )}`}
                        />
                        <div className='absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                          <ImageActionButtons
                            imageUrl={img.url}
                            aspectRatio={img.aspectRatio}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className='flex items-center justify-center gap-4 mt-6 pt-4 border-t border-neutral-800'>
                {onEdit && (
                  <Select
                    onValueChange={(value) => onEdit(parseInt(value))}
                  >
                    <SelectTrigger className='w-[200px] border-neutral-600 text-neutral-300'>
                      <SelectValue placeholder='Edit Image' />
                    </SelectTrigger>
                    <SelectContent className='bg-neutral-900 border-neutral-700'>
                      {displayImages.map((_, idx) => (
                        <SelectItem
                          key={idx}
                          value={idx.toString()}
                          className='text-neutral-300'
                        >
                          Edit Image {idx + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  variant='outline'
                  size='lg'
                  onClick={handleDownloadAll}
                  className='border-neutral-600 cursor-pointer text-neutral-300 hover:bg-neutral-800'
                >
                  <Download className='w-4 h-4 mr-2' />
                  Download All as ZIP
                </Button>
              </div>
            </div>
          ) : renderCustomContent ? (
            renderCustomContent()
          ) : (
            <EmptyState />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
