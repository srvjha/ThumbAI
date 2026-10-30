'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { useAuth } from '@/hooks/user/auth';
import { FormQuestionnaire } from './shared/FormQuestionnaire';
import { ImageData } from './shared/imageUtils';
import { MODEL } from '@prisma/client';
import { waitForGeneration } from '@/lib/waitForGeneration';
import {
  ControlsPanel,
  ControlSection,
  SegmentedControl,
  fieldClass,
} from './studio/StudioLayout';
import { TierPicker } from './studio/TierPicker';
import { AspectRatioPicker } from './studio/AspectRatioPicker';
import { AdvancedOptions } from './studio/AdvancedOptions';
import { GenerateBar } from './studio/GenerateBar';
import { IMAGE_COUNT_OPTIONS, OUTPUT_FORMAT_OPTIONS } from './studio/options';
import { StudioWorkspace } from './studio/StudioWorkspace';
import { StylePresetPicker } from './studio/StylePresetPicker';
import { composePrompt } from './studio/presets';
import type { GenerationDetail } from './dashboard/types';
import {
  TEXT_TO_IMAGE_MODELS,
  EDIT_MODEL,
  DEFAULT_TIER,
  type ModelTier,
} from '@/config/models';

type FormValues = {
  prompt: string;
  choices: string;
  numImages: number;
  outputFormat: string;
  aspectRatios: string[];
  imagesUrl?: string[];
  questionnaire?: string[];
  tier: ModelTier;
  /** Words to set on the thumbnail; folded into the prompt on submit. */
  overlayText: string;
  stylePreset: string;
};

export const TextToImageGenerator = () => {
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
      prompt: '',
      choices: '',
      numImages: 1,
      outputFormat: 'jpeg',
      aspectRatios: ['16:9'],
      imagesUrl: [''],
      tier: DEFAULT_TIER,
      overlayText: '',
      stylePreset: '',
    },
    mode: 'onChange',
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const prompt = watch('prompt');
  const aspectRatios = watch('aspectRatios');
  const tier = watch('tier');
  const { data: userInfo, refetch: refetchUser } = useAuth();

  const numImages = watch('numImages');
  const creditCost =
    (numImages || 1) *
    (aspectRatios?.length || 1) *
    TEXT_TO_IMAGE_MODELS[tier ?? DEFAULT_TIER].creditsPerImage;

  // The last request sent, so Vary can send it again with a fresh seed.
  const lastRequest = useRef<FormValues | null>(null);

  const onSubmit = async (data: FormValues) => {
    lastRequest.current = data;
    const perImage = TEXT_TO_IMAGE_MODELS[data.tier].creditsPerImage;
    const totalCost = data.numImages * data.aspectRatios.length * perImage;

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
      // Each aspect ratio is an independent job, so run them together
      // instead of waiting for one to finish before starting the next.
      const perRatio = await Promise.all(
        data.aspectRatios.map(async (aspectRatio) => {
          const res = await axios.post('/api/generate', {
            prompt: composePrompt(
              data.prompt,
              data.overlayText,
              data.stylePreset,
            ),
            numImages: data.numImages,
            outputFormat: data.outputFormat,
            userChoices: data.questionnaire ?? '',
            aspectRatio,
            choices: data.choices,
            workflow: MODEL.TEXT_TO_IMAGE,
            tier: data.tier,
          });

          if (!res.data.data.valid_prompt) {
            throw new Error(res.data.data.response ?? 'Invalid prompt');
          }

          setStatus('in-progress');

          const urls = await waitForGeneration(res.data.data.requestId);
          return urls.map((url) => ({ url, aspectRatio }));
        }),
      );

      const results = perRatio.flat();

      if (results.length === 0) {
        throw new Error('No images were returned');
      }

      setGeneratedImages(results);
      setStatus('completed');
      toast.success('Images generated successfully!', { id: 'generation' });
      refetchUser();
    } catch (err) {
      setStatus('idle');
      const message =
        err instanceof Error ? err.message : 'Failed to generate images.';
      toast.error(message, { id: 'generation' });
      // A failed job is refunded server side; resync the displayed balance.
      refetchUser();
    } finally {
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
    router.push(
      `/studio/image-to-image?url=${encodeURIComponent(img.url)}&aspectRatio=${
        img.aspectRatio
      }&prompt=${encodeURIComponent(prompt)}&outputFormat=${watch(
        'outputFormat',
      )}`,
    );
  };

  const [_, setInput] = useState('');
  const {
    messages,
    setMessages,
    sendMessage,
    status: chatStatus,
    regenerate,
  } = useChat();

  const handleChatSubmit = async (input: string) => {
    if (userInfo?.credits === 0) {
      toast.error('Your Free Credits Exhausted, Buy a Plan to use ThumbAI');
      return;
    }
    if (!input.trim()) return;
    sendMessage({ text: input });

    setIsGenerating(true);
    setStatus('generating');
    const userPrompt = input;
    const noOfImages = watch('numImages');
    setInput('');
    const imagesToSend = generatedImages
      .map((img) => img.url)
      .filter((e) => e.trim().length > 0);
    try {
      const res = await axios.post('/api/edit', {
        mode: 'chat',
        prompt: userPrompt,
        numImages: noOfImages,
        outputFormat: watch('outputFormat'),
        images_urls: imagesToSend,
        aspectRatio: aspectRatios[0] || '16:9',
        workflow: MODEL.TEXT_TO_IMAGE,
      });

      if (!res.data.data.valid_prompt) {
        setIsGenerating(false);
        setStatus('completed');
        toast.error(res.data.data.response, { id: 'generation' });
        return;
      }

      const urls = await waitForGeneration(res.data.data.requestId, {
        onStatus: () => setStatus('in-progress'),
      });

      setGeneratedImages((prev) => {
        const next = [
          ...prev,
          ...urls.map((url) => ({
            url,
            aspectRatio: aspectRatios[0] || '16:9',
          })),
        ];
        return next;
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: `I've updated your images as per "${userPrompt}".`,
            },
          ],
        },
      ]);

      setStatus('completed');
      refetchUser();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: `Sorry, I couldn’t process your request.`,
            },
          ],
        },
      ]);

      setStatus('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const perImage = TEXT_TO_IMAGE_MODELS[tier ?? DEFAULT_TIER].creditsPerImage;
  const ratioCount = aspectRatios?.length || 0;
  const overlayText = watch('overlayText');

  // Same request again; the server picks a new seed. Earlier results stay on
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

  const handleRestoreInputs = useCallback(
    (gen: GenerationDetail) => {
      setValue('prompt', gen.prompt, { shouldValidate: true });
      if (gen.aspect_ratio) setValue('aspectRatios', [gen.aspect_ratio]);
      if (gen.model_tier === 'QUALITY') setValue('tier', 'quality');
      if (gen.model_tier === 'DRAFT') setValue('tier', 'draft');
      if (gen.num_of_images) {
        setValue('numImages', Math.min(Math.max(gen.num_of_images, 1), 4));
      }
    },
    [setValue],
  );

  const controls = (
    <ControlsPanel
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <GenerateBar
          cost={creditCost}
          costNote={`${numImages || 1} × ${Math.max(ratioCount, 1)} format${
            ratioCount > 1 ? 's' : ''
          } × ${perImage} cr`}
          balance={userInfo?.credits}
          isGenerating={isGenerating}
          disabled={!prompt.trim() || isGenerating || ratioCount === 0}
          label={ratioCount > 1 ? `Generate ${ratioCount} formats` : 'Generate'}
          onReset={handleReset}
        />
      }
    >
      <Controller
        name='prompt'
        control={control}
        rules={{
          required: 'Prompt is required',
          minLength: {
            value: 10,
            message: 'Prompt must be at least 10 characters',
          },
        }}
        render={({ field }) => (
          <ControlSection
            label='Prompt'
            htmlFor='t2i-prompt'
            aside={<span className='tabular-nums'>{field.value.length}</span>}
            hint='What is the video about, and what should the viewer feel?'
            error={errors.prompt?.message}
          >
            <textarea
              {...field}
              id='t2i-prompt'
              placeholder='e.g. I tried every budget mechanical keyboard so you don’t have to'
              className={`${fieldClass(!!errors.prompt)} h-32 resize-none`}
            />
          </ControlSection>
        )}
      />

      <Controller
        name='overlayText'
        control={control}
        render={({ field }) => (
          <ControlSection
            label='Text on thumbnail'
            htmlFor='t2i-overlay'
            aside='Optional'
            hint='Two to four words read best at feed size.'
          >
            <input
              {...field}
              id='t2i-overlay'
              autoComplete='off'
              placeholder='e.g. WORTH IT?…'
              className={fieldClass()}
            />
          </ControlSection>
        )}
      />

      <Controller
        name='stylePreset'
        control={control}
        render={({ field }) => (
          <ControlSection label='Look'>
            <StylePresetPicker value={field.value} onChange={field.onChange} />
          </ControlSection>
        )}
      />

      <FormQuestionnaire
        control={control}
        choicesFieldName='choices'
        questionnaireFieldName='questionnaire'
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

      <Controller
        name='aspectRatios'
        control={control}
        render={({ field }) => (
          <ControlSection
            label='Format'
            hint='Pick both to get a thumbnail and a Shorts cover from one prompt.'
          >
            <AspectRatioPicker value={field.value} onChange={field.onChange} />
          </ControlSection>
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
          <ControlSection
            label='Images per format'
            error={errors.numImages?.message}
          >
            <SegmentedControl
              ariaLabel='Images per format'
              options={IMAGE_COUNT_OPTIONS}
              value={field.value}
              onChange={field.onChange}
            />
          </ControlSection>
        )}
      />

      <AdvancedOptions summary={(watch('outputFormat') ?? '').toUpperCase()}>
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
  );

  return (
    <StudioWorkspace
      mode='text'
      description='Describe the video. Get a YouTube thumbnail or Shorts cover that reads at a glance.'
      controls={controls}
      status={status}
      images={displayImages}
      ratios={aspectRatios}
      outputFormat={watch('outputFormat')}
      isGenerating={isGenerating}
      canGenerate={!!prompt.trim() && !isGenerating && ratioCount > 0}
      onVary={lastRequest.current ? handleVary : undefined}
      onEdit={handleEdit}
      refine={{
        onSend: handleChatSubmit,
        onRetry: regenerate,
        messages,
        creditCost: (numImages || 1) * EDIT_MODEL.creditsPerImage,
      }}
      onLoadImages={handleLoadImages}
      onRestoreInputs={handleRestoreInputs}
      previewTitle={overlayText?.trim() || prompt.trim() || undefined}
      empty={{
        title: 'Your thumbnail appears here',
        description:
          'Describe the video and pick a format. ThumbAI writes a design brief from it, then renders into this frame.',
        steps: ['Describe the video', 'Pick format and model', 'Refine it'],
      }}
    />
  );
};
