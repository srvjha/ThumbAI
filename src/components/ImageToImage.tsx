'use client';

import { useState, DragEvent, ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from './ui/button';
import { Link2, Upload, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useChat } from '@ai-sdk/react';
import { CustomizeDialog } from './CustomizeDialog';
import { uploadFile } from '@/config/falClient';
import { useAuth } from '@/hooks/user/auth';
import { ResultPanel } from './shared/ResultPanel';
import { FormQuestionnaire } from './shared/FormQuestionnaire';
import { ImageData } from './shared/imageUtils';
import { MODEL } from '@prisma/client';
import { waitForGeneration } from '@/lib/waitForGeneration';
import { EDIT_MODEL } from '@/config/models';
import {
  StudioLayout,
  ControlsPanel,
  ControlSection,
  SegmentedControl,
  fieldClass,
} from './studio/StudioLayout';
import { FixedModelNote } from './studio/TierPicker';
import { AspectRatioPicker } from './studio/AspectRatioPicker';
import { AdvancedOptions } from './studio/AdvancedOptions';
import { GenerateBar } from './studio/GenerateBar';
import { IMAGE_COUNT_OPTIONS, OUTPUT_FORMAT_OPTIONS } from './studio/options';

type FormValues = {
  prompt: string;
  choices: string;
  numImages: number;
  outputFormat: string;
  aspectRatios: string[];
  questionnaire?: string[];
  uploadedFiles: File[];
};

export const ImageToImage = () => {
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
      aspectRatios: [],
      uploadedFiles: [],
    },
    mode: 'onChange',
  });

  const prompt = watch('prompt');
  const aspectRatios = watch('aspectRatios');
  const uploadedFiles = watch('uploadedFiles') || [];

  const [editedImages, setEditedImages] = useState<ImageData[]>([
    {
      url: '',
      aspectRatio: '16:9',
    },
  ]);
  const [status, setStatus] = useState<
    'idle' | 'generating' | 'in-progress' | 'completed'
  >('idle');
  const [urlInput, setUrlInput] = useState('');
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeVersion, setActiveVersion] = useState(0);
  const [processedImageUrls, setProcessedImageUrls] = useState<string[]>([]); // Store processed URLs
  const { data: userInfo, refetch: refetchUser } = useAuth();
  // Modified processImage function to accept aspect ratio
  const processImage = (file: File, aspectRatio: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        // Set dimensions based on aspect ratio
        let targetWidth: number, targetHeight: number;

        if (aspectRatio === '16:9') {
          targetWidth = 1280;
          targetHeight = 720;
        } else if (aspectRatio === '9:16') {
          targetWidth = 720;
          targetHeight = 1280;
        } else {
          // Default to 16:9 if aspect ratio is not recognized
          targetWidth = 1280;
          targetHeight = 720;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Fill with white background
        ctx!.fillStyle = 'white';
        ctx!.fillRect(0, 0, targetWidth, targetHeight);

        if (img.width < targetWidth || img.height < targetHeight) {
          const offsetX = (targetWidth - img.width) / 2;
          const offsetY = (targetHeight - img.height) / 2;
          ctx!.drawImage(img, offsetX, offsetY, img.width, img.height);
        } else {
          ctx!.drawImage(img, 0, 0, targetWidth, targetHeight);
        }

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas is empty'));
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type);
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const previews = files.map((file) => URL.createObjectURL(file));
      setLocalPreviews((prev) => [...prev, ...previews]);
      setValue('uploadedFiles', [...uploadedFiles, ...files]);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) return;
    const previews = files.map((file) => URL.createObjectURL(file));
    setLocalPreviews((prev) => [...prev, ...previews]);
    setValue('uploadedFiles', [...uploadedFiles, ...files]);

    toast.success('Files added successfully!');
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAddUrl = async () => {
    if (urlInput.trim()) {
      try {
        // Convert URL to File object
        const response = await fetch(urlInput.trim());
        const blob = await response.blob();
        const file = new File([blob], `url-image-${Date.now()}.jpg`, {
          type: blob.type,
        });

        setLocalPreviews((prev) => [...prev, urlInput.trim()]);
        setValue('uploadedFiles', [...uploadedFiles, file]);
        setUrlInput('');
        toast.success('Image URL added!');
      } catch (error) {
        toast.error('Failed to load image from URL');
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setLocalPreviews((prev) => prev.filter((_, i) => i !== index));
    setValue(
      'uploadedFiles',
      uploadedFiles.filter((_, i) => i !== index),
    );
    const formattedImages = editedImages.filter((_, e) => e !== index);
    setEditedImages(formattedImages);
    toast.success('Image removed!');
  };

  const onSubmit = async (data: FormValues) => {
    if (userInfo?.credits === 0) {
      toast.error('Your Free Credits Exhausted, Buy a Plan to use ThumbAI');
      return;
    } else if (
      userInfo?.credits !== undefined &&
      userInfo.credits < data.numImages
    ) {
      toast.error(
        'Credits are less than the no of images you want to generate',
      );
      return;
    }

    setIsGenerating(true);
    setStatus('generating');

    try {
      // Each aspect ratio is an independent job; run them together rather
      // than waiting for one to finish before starting the next.
      const perRatio = await Promise.all(
        data.aspectRatios.map(async (aspectRatio) => {
          const processedFiles = await Promise.all(
            data.uploadedFiles.map((file) => processImage(file, aspectRatio)),
          );

          const uploadedUrls = await Promise.all(
            processedFiles.map((file) => uploadFile(file)),
          );

          const res = await axios.post('/api/edit', {
            mode: 'normal',
            prompt: data.prompt,
            numImages: data.numImages,
            outputFormat: data.outputFormat,
            images_urls: uploadedUrls,
            aspectRatio,
            choices: data.choices,
            userChoices: data.questionnaire || '',
            workflow: MODEL.IMAGE_TO_IMAGE,
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

      // Replaces, rather than discarding all but the last ratio's result.
      setEditedImages(results);
      setActiveVersion(0);
      setProcessedImageUrls(results.map((image) => image.url));
      setStatus('completed');
      toast.success('Images edited successfully!', { id: 'generation' });
      refetchUser();
    } catch (err) {
      setStatus('idle');
      const message =
        err instanceof Error ? err.message : 'Failed to edit images.';
      toast.error(message, { id: 'generation' });
      refetchUser();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    reset();
    setEditedImages([]);
    setLocalPreviews([]);
    setProcessedImageUrls([]);
    setUrlInput('');
    setStatus('idle');
    toast.success('Form reset successfully!');
  };

  let displayImages: ImageData[] = [];
  displayImages = editedImages.filter(
    (img) => img.url && img.url.trim() !== '',
  );

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
    setInput('');

    // Use processed image URLs instead of re-processing
    const formattedImages =
      processedImageUrls.length > 0
        ? processedImageUrls
        : editedImages.filter((img) => img.url.length > 0).map((e) => e.url);

    const noOfImages = watch('numImages');

    try {
      const res = await axios.post('/api/edit', {
        mode: 'chat',
        prompt: userPrompt,
        numImages: noOfImages,
        outputFormat: watch('outputFormat'),
        images_urls: formattedImages,
        aspectRatio: aspectRatios[0] || '16:9',
        workflow: MODEL.IMAGE_TO_IMAGE,
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

      setEditedImages((prev) => {
        const next = [
          ...prev,
          ...urls.map((url) => ({
            url,
            aspectRatio: aspectRatios[0] || '16:9',
          })),
        ];
        setActiveVersion(next.length - 1);
        return next;
      });
      setProcessedImageUrls((prev) => [...prev, ...urls]);

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
              text: `Sorry, I couldn't process your request.`,
            },
          ],
        },
      ]);

      setStatus('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const numImages = watch('numImages');
  const ratioCount = aspectRatios?.length || 0;
  const creditCost =
    (numImages || 1) * Math.max(ratioCount, 1) * EDIT_MODEL.creditsPerImage;

  return (
    <>
      <StudioLayout
        controls={
          <ControlsPanel
            onSubmit={handleSubmit(onSubmit)}
            footer={
              <GenerateBar
                cost={creditCost}
                costNote={`${numImages || 1} × ${Math.max(ratioCount, 1)} format${
                  ratioCount > 1 ? 's' : ''
                } × ${EDIT_MODEL.creditsPerImage} cr`}
                balance={userInfo?.credits}
                isGenerating={isGenerating}
                busyLabel='Processing…'
                disabled={
                  !prompt.trim() ||
                  isGenerating ||
                  uploadedFiles.length === 0 ||
                  ratioCount === 0
                }
                label={
                  ratioCount > 1
                    ? `Composite ${ratioCount} formats`
                    : 'Composite'
                }
                onReset={handleReset}
              />
            }
          >
            {/* Reference images */}
            <ControlSection
              label='Your images'
              htmlFor='i2i-file-input'
              aside={
                uploadedFiles.length > 0 ? (
                  <span className='font-mono tabular-nums'>
                    {uploadedFiles.length} added
                  </span>
                ) : undefined
              }
              hint='A face, a product, a logo. They are fitted to the format you pick when you generate.'
            >
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className='rounded-xl border-2 border-dashed border-foreground/15 bg-background transition-colors hover:border-brand'
              >
                <input
                  type='file'
                  accept='image/*'
                  multiple
                  onChange={handleFileUpload}
                  className='hidden'
                  id='i2i-file-input'
                />
                <label
                  htmlFor='i2i-file-input'
                  className='flex cursor-pointer flex-col items-center gap-1.5 px-4 py-6 text-center'
                >
                  <span className='flex size-9 items-center justify-center rounded-full bg-accent text-brand'>
                    <Upload className='size-4' />
                  </span>
                  <span className='text-sm font-medium'>
                    Drop images or browse
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    PNG, JPG or WEBP · several at once is fine
                  </span>
                </label>
              </div>

              {/* Image Previews */}
              {localPreviews.length > 0 && (
                <div className='mt-3 grid grid-cols-4 gap-2'>
                  {localPreviews.map((src, index) => (
                    <div
                      key={index}
                      className='group relative aspect-square overflow-hidden rounded-lg border bg-secondary'
                    >
                      <img
                        src={src}
                        alt={`Uploaded ${index + 1}`}
                        className='h-full w-full object-cover'
                      />
                      <button
                        type='button'
                        onClick={() => handleRemoveImage(index)}
                        aria-label={`Remove image ${index + 1}`}
                        className='absolute right-1 top-1 rounded-full bg-card/90 p-1 text-foreground shadow-xs transition-opacity hover:bg-card sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100'
                      >
                        <X className='size-3' />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* URL Input */}
              <div className='mt-3 flex gap-2'>
                <input
                  type='url'
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder='Or paste an image URL'
                  aria-label='Image URL'
                  className={`${fieldClass()} py-2`}
                />
                <Button
                  type='button'
                  onClick={handleAddUrl}
                  variant='outline'
                  className='h-auto cursor-pointer rounded-xl'
                >
                  <Link2 className='size-4' />
                  Add
                </Button>
              </div>
            </ControlSection>

            <Controller
              name='prompt'
              control={control}
              rules={{
                required: 'Prompt is required',
                minLength: {
                  value: 10,
                  message: 'Prompt must be at least 10 characters',
                },
                maxLength: {
                  value: 300,
                  message: 'Prompt should have at max 300 characters',
                },
              }}
              render={({ field }) => (
                <ControlSection
                  label='What to make'
                  htmlFor='i2i-prompt'
                  aside={
                    <span
                      className={`font-mono tabular-nums ${
                        field.value.length > 300 ? 'text-destructive' : ''
                      }`}
                    >
                      {field.value.length}/300
                    </span>
                  }
                  hint='Say where your subject goes and what the thumbnail is for.'
                  error={errors.prompt?.message}
                >
                  <textarea
                    {...field}
                    id='i2i-prompt'
                    placeholder='e.g. Put me on the right looking shocked, a burning laptop on the left, headline “I broke prod”'
                    className={`${fieldClass(!!errors.prompt)} h-32 resize-none`}
                  />
                </ControlSection>
              )}
            />

            {/* Questionnaire with choices */}
            <FormQuestionnaire
              control={control}
              choicesFieldName='choices'
              questionnaireFieldName='questionnaire'
              errors={errors}
            />

            <ControlSection label='Model'>
              <FixedModelNote model={EDIT_MODEL} />
            </ControlSection>

            <Controller
              name='aspectRatios'
              control={control}
              render={({ field }) => (
                <ControlSection
                  label='Format'
                  hint={
                    ratioCount === 0
                      ? 'Pick at least one format.'
                      : 'Pick both to get a thumbnail and a Shorts cover.'
                  }
                >
                  <AspectRatioPicker
                    value={field.value}
                    onChange={field.onChange}
                  />
                </ControlSection>
              )}
            />

            <Controller
              name='numImages'
              control={control}
              rules={{
                required: 'Number of images is required',
                min: {
                  value: 1,
                  message: 'Must generate at least 1 image',
                },
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
            onCustomize={
              displayImages.length > 0 ? () => setIsChatOpen(true) : undefined
            }
            hasChatMessages={messages.length > 0}
            ratios={aspectRatios}
            empty={{
              title: 'Your composite appears here',
              description:
                'Add a photo of yourself or your product, say what the thumbnail is about, and ThumbAI builds the scene around your subject.',
              steps: [
                'Add your images',
                'Describe the scene',
                'Refine it with chat',
              ],
            }}
          />
        }
      />

      <CustomizeDialog
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        versions={displayImages}
        activeIndex={activeVersion}
        onSelectVersion={setActiveVersion}
        messages={messages}
        onSendMessage={handleChatSubmit}
        onRegenerate={regenerate}
        chatStatus={chatStatus}
        isGenerating={isGenerating}
        creditCost={EDIT_MODEL.creditsPerImage}
      />
    </>
  );
};
