'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Globe } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/user/auth';
import { ResultPanel } from './shared/ResultPanel';
import { FormQuestionnaire } from './shared/FormQuestionnaire';
import { ImageData } from './shared/imageUtils';
import { MODEL } from '@prisma/client';
import { waitForGeneration } from '@/lib/waitForGeneration';
import {
  StudioLayout,
  ControlsPanel,
  ControlSection,
  SegmentedControl,
  fieldClass,
} from './studio/StudioLayout';
import { TierPicker } from './studio/TierPicker';
import { RatioGlyph } from './studio/AspectRatioPicker';
import { AdvancedOptions } from './studio/AdvancedOptions';
import { GenerateBar } from './studio/GenerateBar';
import { IMAGE_COUNT_OPTIONS, OUTPUT_FORMAT_OPTIONS } from './studio/options';
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
      // The URL goes to the server, which reads the page and authors the
      // prompt once. This used to call describeBlog() here to produce a
      // finished image prompt, which /api/generate then re-authored — two
      // LLM passes, the second flattening the first's specifics.
      const res = await axios.post('/api/generate', {
        blogUrl: data.url,
        numImages: data.numImages,
        outputFormat: data.outputFormat,
        userChoices: data.questionnaire ?? '',
        aspectRatio: data.aspectRatios[0] ?? '16:9',
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

  const numImages = watch('numImages');
  const tier = watch('tier');
  const perImage = TEXT_TO_IMAGE_MODELS[tier ?? DEFAULT_TIER].creditsPerImage;
  // Matches the guard in onSubmit: covers are a single 16:9 job.
  const creditCost = (numImages || 1) * perImage;

  return (
    <StudioLayout
      controls={
        <ControlsPanel
          onSubmit={handleSubmit(onSubmit)}
          footer={
            <GenerateBar
              cost={creditCost}
              costNote={`${numImages || 1} × ${perImage} cr`}
              balance={userInfo?.credits}
              isGenerating={isGenerating}
              disabled={
                !url.trim() || isGenerating || (aspectRatios?.length || 0) === 0
              }
              label={(numImages || 1) > 1 ? 'Design covers' : 'Design cover'}
              onReset={handleReset}
            />
          }
        >
          <Controller
            name='url'
            control={control}
            rules={{
              required: 'URL is required',
              pattern: {
                value: /^(https?:\/\/[^\s$.?#].[^\s]*)$/i,
                message: 'Please enter a valid URL (must start with https://)',
              },
            }}
            render={({ field }) => (
              <ControlSection
                label='Blog post URL'
                htmlFor='blog-url'
                hint='We read the article, find its core idea and design a cover poster around it.'
                error={errors.url?.message}
              >
                <div className='relative'>
                  <Globe className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <input
                    {...field}
                    id='blog-url'
                    inputMode='url'
                    autoComplete='url'
                    placeholder='https://yourblog.com/post-title'
                    className={`${fieldClass(!!errors.url)} pl-10`}
                  />
                </div>
              </ControlSection>
            )}
          />

          <FormQuestionnaire
            control={control}
            choicesFieldName='choices'
            questionnaireFieldName='questionnaire'
            questionnaireType='blog'
            errors={errors}
          />

          {/* Model tier */}
          <Controller
            name='tier'
            control={control}
            render={({ field }) => (
              <ControlSection label='Model'>
                <TierPicker
                  models={TEXT_TO_IMAGE_MODELS}
                  value={field.value}
                  onChange={field.onChange}
                />
              </ControlSection>
            )}
          />

          <ControlSection label='Format'>
            <div className='flex items-center gap-3 rounded-xl border bg-background p-3'>
              <span className='flex size-6 items-center justify-center'>
                <RatioGlyph ratio='16:9' active />
              </span>
              <span>
                <span className='block text-sm font-medium'>
                  Editorial cover
                </span>
                <span className='block font-mono text-[11px] tabular-nums text-muted-foreground'>
                  16:9 · works as a blog header and social card
                </span>
              </span>
            </div>
          </ControlSection>

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
              <ControlSection
                label='Variations'
                error={errors.numImages?.message}
              >
                <SegmentedControl
                  ariaLabel='Variations'
                  options={IMAGE_COUNT_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              </ControlSection>
            )}
          />

          <AdvancedOptions
            summary={(watch('outputFormat') ?? '').toUpperCase()}
          >
            <Controller
              name='outputFormat'
              control={control}
              rules={{ required: 'Output format is required' }}
              render={({ field }) => (
                <ControlSection
                  label='Output format'
                  error={errors.outputFormat?.message}
                >
                  <SegmentedControl
                    ariaLabel='Output format'
                    options={OUTPUT_FORMAT_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </ControlSection>
              )}
            />
          </AdvancedOptions>
        </ControlsPanel>
      }
      canvas={
        <ResultPanel
          status={status}
          displayImages={displayImages}
          isGenerating={isGenerating}
          outputFormat={watch('outputFormat')}
          onEdit={handleEdit}
          ratios={['16:9']}
          empty={{
            title: 'Your blog cover appears here',
            description:
              'Paste a link to a post. ThumbAI reads the article, pulls out its core idea, and designs an editorial cover poster for it.',
            steps: [
              'Paste the post URL',
              'We read the article',
              'Get an editorial cover',
            ],
          }}
        />
      }
    />
  );
};
