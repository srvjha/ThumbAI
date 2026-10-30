'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  DragEvent,
  ChangeEvent,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { Button } from './ui/button';
import { Link2, Plus, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useChat } from '@ai-sdk/react';
import { uploadFile } from '@/config/falClient';
import { useAuth } from '@/hooks/user/auth';
import { FormQuestionnaire } from './shared/FormQuestionnaire';
import { ImageData } from './shared/imageUtils';
import { MODEL } from '@prisma/client';
import { waitForGeneration } from '@/lib/waitForGeneration';
import { EDIT_MODEL, isAspectRatio, isOutputFormat } from '@/config/models';
import {
  AdvancedPopover,
  AspectToggle,
  AutoTextarea,
  Composer,
  CountSelect,
  FixedModelChip,
  OverlayTextPopover,
  StylePopover,
  focusComposer,
  useStylePopover,
} from './studio/Composer';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { StudioWorkspace } from './studio/StudioWorkspace';
import { StylePresetPicker } from './studio/StylePresetPicker';
import { composePrompt } from './studio/presets';
import type { GenerationDetail } from './dashboard/types';

type FormValues = {
  prompt: string;
  choices: string;
  numImages: number;
  outputFormat: string;
  aspectRatios: string[];
  questionnaire?: string[];
  uploadedFiles: File[];
  /** Words to set on the thumbnail; folded into the prompt on submit. */
  overlayText: string;
  stylePreset: string;
};

const IMAGE_SUGGESTIONS = [
  'Put me on the right looking shocked, a laptop on fire on the left',
  'Me holding the product up to camera on a clean teal backdrop',
  'Me on a mountain ridge at sunrise, arms raised, huge headline',
];

export const ImageToImage = () => {
  const style = useStylePopover();
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      prompt: '',
      choices: '',
      numImages: 1,
      outputFormat: 'jpeg',
      aspectRatios: [],
      uploadedFiles: [],
      overlayText: '',
      stylePreset: '',
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

  // Adds an image by URL without the toast-on-type flow above: used by the
  // hand-off from other modes and by "Use as input" on the canvas.
  const addImageFromUrl = useCallback(
    async (src: string) => {
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const file = new File([blob], `url-image-${Date.now()}.jpg`, {
          type: blob.type,
        });
        setLocalPreviews((prev) => [...prev, src]);
        setValue('uploadedFiles', [...getValues('uploadedFiles'), file]);
        return true;
      } catch {
        toast.error('Failed to load image from URL');
        return false;
      }
    },
    [getValues, setValue],
  );

  // Hand-off from "Edit in Image to Image" in the other modes.
  const searchParams = useSearchParams();
  const handedOff = useRef(false);
  useEffect(() => {
    const src = searchParams.get('url');
    if (!src || handedOff.current) return;
    handedOff.current = true;
    const ratio = searchParams.get('aspectRatio');
    if (ratio && isAspectRatio(ratio)) setValue('aspectRatios', [ratio]);
    const format = searchParams.get('outputFormat');
    if (format && isOutputFormat(format)) setValue('outputFormat', format);
    addImageFromUrl(src).then((ok) => {
      if (ok) toast.success('Image added. Describe the edit you want.');
    });
  }, [searchParams, setValue, addImageFromUrl]);

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

  // The last request sent, so Vary can send it again with a fresh seed.
  const lastRequest = useRef<FormValues | null>(null);

  const onSubmit = async (data: FormValues) => {
    lastRequest.current = data;
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
            prompt: composePrompt(
              data.prompt,
              data.overlayText,
              data.stylePreset,
            ),
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

  const overlayText = watch('overlayText');

  // Same request again; the server picks a new seed. Earlier results stay on
  // the canvas ahead of the new ones so they can be compared.
  const handleVary = async () => {
    if (!lastRequest.current || isGenerating) return;
    const before = editedImages.filter((img) => img.url);
    await onSubmit(lastRequest.current);
    const kept = new Set(before.map((img) => img.url));
    setEditedImages((prev) => [
      ...before,
      ...prev.filter((img) => img.url && !kept.has(img.url)),
    ]);
  };

  const handleLoadImages = useCallback((images: ImageData[]) => {
    setEditedImages(images);
    // Chat edits fall back to the canvas images when this is empty.
    setProcessedImageUrls([]);
    setStatus(images.length > 0 ? 'completed' : 'idle');
  }, []);

  const handleRestoreInputs = useCallback(
    (gen: GenerationDetail) => {
      setValue('prompt', gen.prompt, { shouldValidate: true });
      if (gen.aspect_ratio) setValue('aspectRatios', [gen.aspect_ratio]);
      if (gen.num_of_images) {
        setValue('numImages', Math.min(Math.max(gen.num_of_images, 1), 4));
      }
    },
    [setValue],
  );

  const handleUseAsInput = async (image: ImageData) => {
    if (await addImageFromUrl(image.url)) {
      toast.success('Added to your images.');
    }
  };

  const choices = watch('choices');

  const composer = (
    <Composer
      onSubmit={handleSubmit(onSubmit, style.onInvalid)}
      onDropFiles={(e) => handleDrop(e as unknown as DragEvent<HTMLDivElement>)}
      error={errors.prompt?.message}
      cost={creditCost}
      costNote={`${numImages || 1} image${(numImages || 1) > 1 ? 's' : ''} × ${Math.max(ratioCount, 1)} format${
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
      label={ratioCount > 1 ? `Composite ${ratioCount}` : 'Composite'}
      controls={
        <>
          <Controller
            name='aspectRatios'
            control={control}
            render={({ field }) => (
              <AspectToggle value={field.value} onChange={field.onChange} />
            )}
          />
          <FixedModelChip model={EDIT_MODEL} />
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
              <CountSelect value={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            name='stylePreset'
            control={control}
            render={({ field }) => (
              <StylePresetPicker
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name='overlayText'
            control={control}
            render={({ field }) => (
              <OverlayTextPopover
                value={field.value}
                onChange={field.onChange}
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
      {/* Attachments, like a chat composer. */}
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        {localPreviews.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className='group relative size-14 overflow-hidden rounded-lg border bg-secondary'
          >
            <img
              src={src}
              alt={`Your image ${index + 1}`}
              width={56}
              height={56}
              className='size-full object-cover'
            />
            <button
              type='button'
              onClick={() => handleRemoveImage(index)}
              aria-label={`Remove image ${index + 1}`}
              className='absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-card/95 text-foreground shadow-xs transition-opacity focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 md:opacity-0 md:group-hover:opacity-100'
            >
              <X className='size-3' />
            </button>
          </div>
        ))}
        <input
          type='file'
          accept='image/*'
          multiple
          onChange={handleFileUpload}
          className='sr-only'
          id='i2i-file-input'
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <label
              htmlFor='i2i-file-input'
              className='flex size-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-foreground/20 text-muted-foreground transition-colors hover:border-brand hover:bg-accent hover:text-brand has-[:focus-visible]:ring-2'
            >
              <Plus className='size-5' />
              <span className='sr-only'>Add images</span>
            </label>
          </TooltipTrigger>
          <TooltipContent>
            Add a face, product or logo. You can also drop files here.
          </TooltipContent>
        </Tooltip>
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type='button'
                  aria-label='Add an image from a link'
                  className='flex size-14 items-center justify-center rounded-lg border border-dashed border-foreground/20 text-muted-foreground transition-colors hover:border-brand hover:bg-accent hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
                >
                  <Link2 className='size-5' />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Add from a link</TooltipContent>
          </Tooltip>
          <PopoverContent align='start' className='w-80 p-3'>
            <label
              htmlFor='i2i-url'
              className='mb-1.5 block text-[13px] font-medium'
            >
              Image link
            </label>
            <div className='flex gap-2'>
              <input
                id='i2i-url'
                type='url'
                inputMode='url'
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder='https://…'
                className='h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-brand focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30'
              />
              <Button
                type='button'
                onClick={handleAddUrl}
                variant='outline'
                className='h-9'
              >
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {localPreviews.length === 0 && (
          <span className='text-[13px] text-muted-foreground'>
            Add your face, product or logo
          </span>
        )}
      </div>

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
          <>
            <label htmlFor='composer-input' className='sr-only'>
              Describe the thumbnail
            </label>
            <AutoTextarea
              {...field}
              id='composer-input'
              aria-invalid={!!errors.prompt || undefined}
              placeholder='Say where your subject goes and what the thumbnail is for…'
            />
            {field.value.length > 240 && (
              <p
                className={`mt-1 text-right text-xs tabular-nums ${
                  field.value.length > 300
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {field.value.length}/300
              </p>
            )}
          </>
        )}
      />
    </Composer>
  );

  return (
    <StudioWorkspace
      mode='image'
      composer={composer}
      status={status}
      images={displayImages}
      ratios={aspectRatios}
      outputFormat={watch('outputFormat')}
      isGenerating={isGenerating}
      canGenerate={
        !!prompt.trim() &&
        !isGenerating &&
        uploadedFiles.length > 0 &&
        ratioCount > 0
      }
      suggestions={IMAGE_SUGGESTIONS}
      onSuggest={(text) => {
        setValue('prompt', text, { shouldValidate: true });
        focusComposer();
      }}
      onVary={lastRequest.current ? handleVary : undefined}
      onEdit={handleUseAsInput}
      editLabel='Use as input'
      refine={{
        onSend: handleChatSubmit,
        onRetry: regenerate,
        messages,
        creditCost: (numImages || 1) * EDIT_MODEL.creditsPerImage,
      }}
      onLoadImages={handleLoadImages}
      onRestoreInputs={handleRestoreInputs}
      previewTitle={overlayText?.trim() || prompt.trim() || undefined}
    />
  );
};
