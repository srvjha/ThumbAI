'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Edit, Wand2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/user/auth';
import { Input } from './ui/input';
import { describeBlog } from '@/agent/describeBlog';
import { ResultPanel } from './shared/ResultPanel';
import { FormQuestionnaire } from './shared/FormQuestionnaire';
import { ImageData } from './shared/imageUtils';
import { MODEL } from '@prisma/client';
import { waitForGeneration } from '@/lib/waitForGeneration';
import {
  TEXT_TO_IMAGE_MODELS,
  DEFAULT_TIER,
  type ModelTier,
} from '@/config/models';

type FormValues = {
  url: string;
  choices: string;
  numImages: number;
  outputFormat: string;
  aspectRatios: string[];
  imagesUrl?: string[];
  questionnaire?: string[];
  tier: ModelTier;
};

export const UrlToImageGenerator = () => {
  const [generatedImages, setGeneratedImages] = useState<ImageData[]>([]);
  const [status, setStatus] = useState<
    'idle' | 'generating' | 'in-progress' | 'completed'
  >('idle');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      url: '',
      numImages: 1,
      outputFormat: 'jpeg',
      aspectRatios: ['16:9'],
      imagesUrl: [''],
      tier: DEFAULT_TIER,
    },
    mode: 'onChange',
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const url = watch('url');
  const aspectRatios = watch('aspectRatios');
  const { data: userInfo, refetch: refetchUser } = useAuth();

  const onSubmit = async (data: FormValues) => {
    const perImage = TEXT_TO_IMAGE_MODELS[data.tier].creditsPerImage;
    const totalCost = data.numImages * perImage;

    // Server is authoritative on credits; this is just a fast local guard.
    if (userInfo?.credits !== undefined && userInfo.credits < totalCost) {
      toast.error(
        `This needs ${totalCost} credits and you have ${userInfo.credits}.`,
      );
      return;
    }

    setIsGenerating(true);
    setStatus('generating');
    setGeneratedImages([]);

    try {
      // Reads the page and drafts a prompt from its actual content.
      const blog = await describeBlog(data.url);

      if (!blog.isBlog || !blog.prompt) {
        // Previously these paths returned without clearing isGenerating,
        // leaving the button stuck on "Generating..." forever.
        toast.error(blog.reason || 'That URL does not look like an article.');
        return;
      }

      const res = await axios.post('/api/generate', {
        prompt: blog.prompt,
        numImages: data.numImages,
        outputFormat: data.outputFormat,
        userChoices: data.questionnaire ?? '',
        aspectRatio: data.aspectRatios[0] ?? '16:9',
        // Was omitted entirely, so the server defaulted to 'random' and the
        // questionnaire answers were discarded.
        choices: data.choices,
        workflow: MODEL.URL_TO_IMAGE,
        tier: data.tier,
      });

      if (!res.data.data.valid_prompt) {
        toast.error(res.data.data.response, { id: 'generation' });
        return;
      }

      setStatus('in-progress');

      const urls = await waitForGeneration(res.data.data.requestId);

      if (urls.length === 0) {
        throw new Error('No images were returned');
      }

      setGeneratedImages(
        urls.map((url) => ({
          url,
          aspectRatio: data.aspectRatios[0] ?? '16:9',
        })),
      );
      setStatus('completed');
      toast.success('Cover image generated!', { id: 'generation' });
      refetchUser();
    } catch (err) {
      setStatus('idle');
      const message =
        err instanceof Error ? err.message : 'Failed to generate the image.';
      toast.error(message, { id: 'generation' });
      refetchUser();
    } finally {
      // Always clears, on every path.
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    reset();
    setGeneratedImages([]);
    setStatus('idle');
    toast.success('Form reset successfully!');
  };

  const displayImages = generatedImages.length > 0 ? generatedImages : [];

  const router = useRouter();

  const handleEdit = (selectedIdx: number) => {
    const img = displayImages[selectedIdx];
    if (!img) return;
    const urlTitleKeywords = url.split('/').pop() as string;

    router.push(
      `/studio/image-to-image?url=${encodeURIComponent(img.url)}&aspectRatio=${
        img.aspectRatio
      }&blog=${encodeURIComponent(urlTitleKeywords)}&outputFormat=${watch(
        'outputFormat',
      )}`,
    );
  };

  return (
    <div className='grid lg:grid-cols-2 gap-8'>
      {/* Left Panel - Input */}
      <div className='space-y-6'>
        <Card className='bg-neutral-900/30 border border-neutral-800 py-1'>
          <CardContent className='p-6'>
            <h3 className='text-lg font-semibold text-neutral-100 mb-4'>
              Input
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
              <Controller
                name='url'
                control={control}
                rules={{
                  required: 'URL is required',
                  pattern: {
                    value: /^(https?:\/\/[^\s$.?#].[^\s]*)$/i,
                    message:
                      'Please enter a valid URL (must start with https://)',
                  },
                }}
                render={({ field }) => (
                  <div>
                    <label className='block text-sm font-medium text-neutral-300 mb-2'>
                      URL *
                    </label>
                    <Input
                      {...field}
                      placeholder='Enter your blog url...'
                      className={`w-full bg-neutral-800 border rounded-lg p-4 text-neutral-300 placeholder-neutral-500 focus:outline-none resize-none ${
                        errors.url
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-neutral-700 focus:border-blue-500'
                      }`}
                    />
                    {errors.url && (
                      <p className='text-red-400 text-xs mt-1'>
                        {errors.url.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <FormQuestionnaire
                control={control}
                choicesFieldName='choices'
                questionnaireFieldName='questionnaire'
                questionnaireType='blog'
                errors={errors}
              />
              <Controller
                name='numImages'
                control={control}
                rules={{
                  required: 'Number of images is required',
                  min: { value: 1, message: 'Must generate at least 1 image' },
                  max: {
                    value: 4,
                    message: 'Cannot generate more than 4 images',
                  },
                }}
                render={({ field }) => (
                  <div>
                    <label className='block text-sm font-medium text-neutral-300 mb-2'>
                      Number of Images *
                    </label>
                    <div className='flex items-center space-x-2'>
                      <input
                        type='range'
                        min='1'
                        max='4'
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        className='flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer'
                      />
                      <span className='text-neutral-300 min-w-[20px]'>
                        {field.value}
                      </span>
                    </div>
                    {errors.numImages && (
                      <p className='text-red-400 text-xs mt-1'>
                        {errors.numImages.message}
                      </p>
                    )}
                  </div>
                )}
              />

              <Accordion type='single' collapsible>
                <AccordionItem value='settings'>
                  <AccordionTrigger className='text-base font-medium text-neutral-300'>
                    Additional Settings
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className='space-y-6 mt-4'>
                      {/* Output Format */}
                      <Controller
                        name='outputFormat'
                        control={control}
                        rules={{ required: 'Output format is required' }}
                        render={({ field }) => (
                          <div>
                            <label className='block text-sm font-medium text-neutral-300 mb-2'>
                              Output Format *
                            </label>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                className={`w-[180px] bg-neutral-800 text-neutral-300 ${
                                  errors.outputFormat
                                    ? 'border-red-500'
                                    : 'border-neutral-700'
                                }`}
                              >
                                <SelectValue placeholder='Select format' />
                              </SelectTrigger>
                              <SelectContent className='bg-neutral-800 text-neutral-300 border-neutral-700'>
                                <SelectItem value='jpeg'>JPEG</SelectItem>
                                <SelectItem value='png'>PNG</SelectItem>
                                <SelectItem value='webp'>WEBP</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.outputFormat && (
                              <p className='text-red-400 text-xs mt-1'>
                                {errors.outputFormat.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className='flex space-x-3 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800'
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button
                  type='submit'
                  disabled={
                    !url.trim() ||
                    isGenerating ||
                    (aspectRatios?.length || 0) === 0
                  }
                  className=' cursor-pointer flex-1 bg-gradient-to-r from-neutral-200 to-neutral-300 text-neutral-900 hover:from-neutral-300 hover:to-neutral-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Wand2 className='w-4 h-4 mr-2' />
                      Generate{' '}
                      {(aspectRatios?.length || 0) > 1
                        ? `${aspectRatios?.length} Formats`
                        : 'Image'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Result */}
      <div>
        <ResultPanel
          status={status}
          displayImages={displayImages}
          isGenerating={isGenerating}
          outputFormat={watch('outputFormat')}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
};
