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
import { ChatToggleButton, PopoutChat } from './ChatPopup';
import { useChat } from '@ai-sdk/react';
import { useAuth } from '@/hooks/user/auth';
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
  prompt: string;
  choices: string;
  numImages: number;
  outputFormat: string;
  aspectRatios: string[];
  imagesUrl?: string[];
  questionnaire?: string[];
  tier: ModelTier;
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
    },
    mode: 'onChange',
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const prompt = watch('prompt');
  const aspectRatios = watch('aspectRatios');
  const tier = watch('tier');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { data: userInfo, refetch: refetchUser } = useAuth();

  const numImages = watch('numImages');
  const creditCost =
    (numImages || 1) *
    (aspectRatios?.length || 1) *
    TEXT_TO_IMAGE_MODELS[tier ?? DEFAULT_TIER].creditsPerImage;

  const onSubmit = async (data: FormValues) => {
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
            prompt: data.prompt,
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

  const handleEdit = (selectedIdx: number) => {
    const img = displayImages[selectedIdx];
    if (!img) return;

    router.push(
      `/nano-banana/edit-image?url=${encodeURIComponent(img.url)}&aspectRatio=${
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

      setGeneratedImages((prev) => [
        ...prev,
        ...urls.map((url) => ({
          url,
          aspectRatio: aspectRatios[0] || '16:9',
        })),
      ]);

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
                  <div>
                    <label className='block text-sm font-medium text-neutral-300 mb-2'>
                      Prompt *
                    </label>
                    <textarea
                      {...field}
                      placeholder='Describe the thumbnail you want to create...'
                      className={`w-full h-32 bg-neutral-800 border rounded-lg p-4 text-neutral-300 placeholder-neutral-500 focus:outline-none resize-none ${
                        errors.prompt
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-neutral-700 focus:border-blue-500'
                      }`}
                    />
                    {errors.prompt && (
                      <p className='text-red-400 text-xs mt-1'>
                        {errors.prompt.message}
                      </p>
                    )}
                  </div>
                )}
              />
              {/* Model tier */}
              <Controller
                name='tier'
                control={control}
                render={({ field }) => (
                  <div>
                    <label className='block text-sm font-medium text-neutral-300 mb-2'>
                      Quality
                    </label>
                    <div className='grid grid-cols-2 gap-3'>
                      {(
                        Object.keys(TEXT_TO_IMAGE_MODELS) as ModelTier[]
                      ).map((key) => {
                        const model = TEXT_TO_IMAGE_MODELS[key];
                        const selected = field.value === key;
                        return (
                          <button
                            key={key}
                            type='button'
                            aria-pressed={selected}
                            onClick={() => field.onChange(key)}
                            className={`text-left rounded-lg border p-3 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                              selected
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-neutral-700 hover:border-neutral-600'
                            }`}
                          >
                            <div className='flex items-center justify-between mb-1'>
                              <span className='text-sm font-medium text-neutral-100'>
                                {model.label}
                              </span>
                              <span className='text-xs text-neutral-400'>
                                {model.creditsPerImage}
                                {model.creditsPerImage === 1
                                  ? ' credit'
                                  : ' credits'}
                                /image
                              </span>
                            </div>
                            <p className='text-xs text-neutral-400'>
                              {model.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              />

              <FormQuestionnaire
                control={control}
                choicesFieldName='choices'
                questionnaireFieldName='questionnaire'
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

              {/* Aspect Ratios */}
              <Controller
                name='aspectRatios'
                control={control}
                render={({ field }) => {
                  const ratioOptions = [
                    { value: '16:9', label: 'YouTube Thumbnail (16:9)' },
                    { value: '9:16', label: 'Shorts/Reels Cover (9:16)' },
                  ];

                  return (
                    <div>
                      <label className='block text-sm text-neutral-300 mb-2'>
                        Aspect Ratios
                      </label>
                      <div className='flex gap-4'>
                        {ratioOptions.map((option) => (
                          <label
                            key={option.value}
                            className='flex items-center gap-2 text-neutral-300'
                          >
                            <input
                              type='checkbox'
                              value={option.value}
                              checked={
                                field.value?.includes(option.value) || false
                              }
                              onChange={(e) => {
                                const currentValue = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([
                                    ...currentValue,
                                    option.value,
                                  ]);
                                } else {
                                  field.onChange(
                                    currentValue.filter(
                                      (r) => r !== option.value,
                                    ),
                                  );
                                }
                              }}
                              className='accent-neutral-300'
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }}
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
                    !prompt.trim() ||
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
                      <span className='ml-2 text-neutral-600'>
                        ({creditCost}{' '}
                        {creditCost === 1 ? 'credit' : 'credits'})
                      </span>
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
      {displayImages.length > 0 && (
        <ChatToggleButton
          onClick={() => setIsChatOpen(true)}
          hasMessages={messages.length > 0}
          isGenerating={isGenerating}
        />
      )}

      <PopoutChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={handleChatSubmit}
        onRegenerate={regenerate}
        chatStatus={chatStatus}
        isGenerating={isGenerating}
      />
    </div>
  );
};
