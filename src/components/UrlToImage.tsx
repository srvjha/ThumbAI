'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/user/auth';
import { FormQuestionnaire } from './shared/FormQuestionnaire';
import { ImageData } from './shared/imageUtils';
import { MODEL } from '@prisma/client';
import { waitForGeneration } from '@/lib/waitForGeneration';
import {
  AdvancedPopover,
  Composer,
  CountSelect,
  ModelSelect,
  StylePopover,
  chipClass,
  useStylePopover,
} from './studio/Composer';
import { RatioGlyph } from './studio/AspectRatioPicker';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { StudioWorkspace } from './studio/StudioWorkspace';
import type { GenerationDetail } from './dashboard/types';
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
  const style = useStylePopover();
  const [generatedImages, setGeneratedImages] = useState<ImageData[]>([]);
  const [status, setStatus] = useState<
    'idle' | 'generating' | 'in-progress' | 'completed'
  >('idle');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  // The last request sent, so Vary can send it again with a fresh seed.
  const lastRequest = useRef<FormValues | null>(null);

  const onSubmit = async (data: FormValues) => {
    lastRequest.current = data;
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
        // Without this the canvas sat on its loading state indefinitely.
        setStatus('idle');
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

  const handleEdit = (img: ImageData) => {
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

  // Same request again; the server picks a new seed. Earlier covers stay on
  // the canvas ahead of the new ones so they can be compared.
  const handleVary = async () => {
    if (!lastRequest.current || isGenerating) return;
    const before = generatedImages;
    await onSubmit(lastRequest.current);
    const kept = new Set(before.map((img) => img.url));
    setGeneratedImages((prev) => [
      ...before,
      ...prev.filter((img) => !kept.has(img.url)),
    ]);
  };

  const handleLoadImages = useCallback((images: ImageData[]) => {
    setGeneratedImages(images);
    setStatus(images.length > 0 ? 'completed' : 'idle');
  }, []);

  // Blog generations record the post URL as their prompt.
  const handleRestoreInputs = useCallback(
    (gen: GenerationDetail) => {
      if (/^https?:\/\//i.test(gen.prompt)) {
        setValue('url', gen.prompt, { shouldValidate: true });
      }
      if (gen.model_tier === 'QUALITY') setValue('tier', 'quality');
      if (gen.model_tier === 'DRAFT') setValue('tier', 'draft');
    },
    [setValue],
  );

  const choices = watch('choices');

  const composer = (
    <Composer
      onSubmit={handleSubmit(onSubmit, style.onInvalid)}
      error={errors.url?.message}
      cost={creditCost}
      costNote={`${numImages || 1} cover${(numImages || 1) > 1 ? 's' : ''} × ${perImage} cr`}
      balance={userInfo?.credits}
      isGenerating={isGenerating}
      disabled={
        !url.trim() || isGenerating || (aspectRatios?.length || 0) === 0
      }
      label='Design cover'
      controls={
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className={`${chipClass()} cursor-default`}>
                <RatioGlyph ratio='16:9' />
                <span className='tabular-nums'>16:9</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Covers are 16:9: a blog header and a social card
            </TooltipContent>
          </Tooltip>
          <Controller
            name='tier'
            control={control}
            render={({ field }) => (
              <ModelSelect
                models={TEXT_TO_IMAGE_MODELS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
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
              <CountSelect
                value={field.value}
                onChange={field.onChange}
                noun='cover'
              />
            )}
          />
          <StylePopover
            open={style.open}
            onOpenChange={style.setOpen}
            answered={!!choices}
            invalid={!!errors.choices || !!errors.questionnaire}
          >
            <FormQuestionnaire
              control={control}
              choicesFieldName='choices'
              questionnaireFieldName='questionnaire'
              questionnaireType='blog'
              errors={errors}
            />
          </StylePopover>
          <Controller
            name='outputFormat'
            control={control}
            rules={{ required: 'Output format is required' }}
            render={({ field }) => (
              <AdvancedPopover
                format={field.value}
                onFormatChange={field.onChange}
                onReset={handleReset}
              />
            )}
          />
        </>
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
          <div className='flex items-center gap-3'>
            <Link2
              className='size-5 shrink-0 text-muted-foreground'
              aria-hidden
            />
            <label htmlFor='composer-input' className='sr-only'>
              Blog post URL
            </label>
            <input
              {...field}
              id='composer-input'
              type='text'
              inputMode='url'
              autoComplete='url'
              spellCheck={false}
              aria-invalid={!!errors.url || undefined}
              placeholder='Paste a blog post URL to get an editorial cover poster for it…'
              className='h-8 min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none'
            />
          </div>
        )}
      />
    </Composer>
  );

  return (
    <StudioWorkspace
      mode='blog'
      composer={composer}
      status={status}
      images={displayImages}
      ratios={['16:9']}
      outputFormat={watch('outputFormat')}
      isGenerating={isGenerating}
      canGenerate={
        !!url.trim() && !isGenerating && (aspectRatios?.length || 0) > 0
      }
      onVary={lastRequest.current ? handleVary : undefined}
      onEdit={handleEdit}
      onLoadImages={handleLoadImages}
      onRestoreInputs={handleRestoreInputs}
    />
  );
};
