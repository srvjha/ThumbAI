'use client';

import { useState, DragEvent, ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Wand2, Upload, X } from 'lucide-react';
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
import { fal } from '@fal-ai/client';
import { useChat } from '@ai-sdk/react';
import { ChatToggleButton, PopoutChat } from './ChatPopup';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/user/auth';
import { useCredits } from '@/hooks/user/credits';
import { ResultPanel } from './shared/ResultPanel';
import { FormQuestionnaire } from './shared/FormQuestionnaire';
import { ImageData } from './shared/imageUtils';

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
  const [processedImageUrls, setProcessedImageUrls] = useState<string[]>([]); // Store processed URLs
  const { data: userInfo } = useAuth();
  const { mutate: deductCreditsMutation } = useCredits();
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

  const uploadFileToFal = async (file: File): Promise<string> => {
    fal.config({
      credentials: env.NEXT_PUBLIC_FAL_KEY,
    });

    const url = await fal.storage.upload(file);
    return url;
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
      // Loop over aspect ratios
      for (const aspectRatio of data.aspectRatios) {
        // 1. Process and upload files
        const processedFiles = await Promise.all(
          data.uploadedFiles.map((file) => processImage(file, aspectRatio)),
        );

        const uploadedUrls = await Promise.all(
          processedFiles.map((file) => uploadFileToFal(file)),
        );

        // 2. Submit job
        const res = await axios.post('/api/edit', {
          mode: 'normal',
          prompt: data.prompt,
          numImages: data.numImages,
          outputFormat: data.outputFormat,
          images_urls: uploadedUrls,
          aspectRatio,
          choices: data.choices,
          userChoices: data.questionnaire || '',
          userId: userInfo!.id,
          type: 'youtube',
        });

        if (!res.data.data.valid_prompt) {
          setIsGenerating(false);
          setStatus('completed');
          return toast.error(res.data.data.response, { id: 'generation' });
        }

        const { requestId } = res.data.data;

        // 3. Open SSE connection
        const evtSource = new EventSource(
          `/api/result-stream?requestId=${requestId}`,
        );

        evtSource.onmessage = (event) => {
          const payload = JSON.parse(event.data);

          if (payload.status === 'COMPLETED') {
            setEditedImages([{ url: payload.image_url, aspectRatio }]);

            setProcessedImageUrls((prev) => [...prev, payload.image_url]);

            setStatus('completed');
            toast.success('Images edited successfully!', { id: 'generation' });
            deductCreditsMutation({
              userId: userInfo!.id,
              credits: data.numImages,
            });

            evtSource.close();
          }
        };
      }
    } catch (err) {
      console.error(err);
      setStatus('idle');
      toast.error('Failed to edit images. Please try again.', {
        id: 'generation',
      });
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
    console.log("images:",noOfImages)

    try {
      const res = await axios.post('/api/edit', {
        mode: 'chat',
        prompt: userPrompt,
        numImages: noOfImages,
        outputFormat: watch('outputFormat'),
        images_urls: formattedImages,
        aspectRatio: aspectRatios[0] || '16:9',
        userId: userInfo!.id,
        type: 'youtube',
      });

      if (!res.data.data.valid_prompt) {
        setIsGenerating(false);
        setStatus('completed');
        toast.error(res.data.data.response, { id: 'generation' });
        return;
      }

      const { requestId } = res.data.data;

      // 3. Open SSE connection
      const evtSource = new EventSource(
        `/api/result-stream?requestId=${requestId}`,
      );

      evtSource.onmessage = (event) => {
        const payload = JSON.parse(event.data);

        if (payload.status === 'COMPLETED') {
          console.log("imageUrl: ",payload.image_url)
          setEditedImages([
            { url: payload.image_url, aspectRatio: aspectRatios[0] },
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
          deductCreditsMutation({ userId: userInfo!.id, credits: 1 });

          evtSource.close();
        }
      };
    } catch (err) {
      console.error(err);
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

  return (
    <div className='grid lg:grid-cols-2 gap-8'>
      {/* Left Panel - Input */}
      <div className='space-y-6'>
        <Card className='p-1 h-auto bg-transparent'>
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
                  maxLength: {
                    value: 300,
                    message: 'Prompt should have at max 300 characters',
                  },
                }}
                render={({ field }) => (
                  <div>
                    <label className='block text-sm font-medium text-neutral-300 mb-2'>
                      Edit Prompt *
                    </label>
                    <textarea
                      {...field}
                      placeholder='Describe how you want to edit the uploaded images...'
                      className={`w-full h-32 bg-neutral-800 border rounded-lg p-4 text-neutral-300 placeholder-neutral-500 focus:outline-none resize-none ${errors.prompt
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
              {/* Questionnaire with choices */}
              <FormQuestionnaire
                control={control}
                choicesFieldName='choices'
                questionnaireFieldName='questionnaire'
                errors={errors}
              />

              {/* Image Upload Section */}
              <div>
                <label className='block text-sm font-medium text-neutral-300 mb-2'>
                  Upload Images *
                </label>

                {/* URL Input */}
                <div className='flex space-x-2 mb-3'>
                  <input
                    type='url'
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder='Paste image URL'
                    className='flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-neutral-300 placeholder-neutral-500 focus:border-blue-500 focus:outline-none'
                  />
                  <Button
                    type='button'
                    onClick={handleAddUrl}
                    variant='outline'
                    className='cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800'
                  >
                    Add
                  </Button>
                </div>

                {/* File Picker + Drag & Drop */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className='border-2 border-dashed border-neutral-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-neutral-800/30'
                >
                  <input
                    type='file'
                    accept='image/*'
                    multiple
                    onChange={handleFileUpload}
                    className='hidden'
                    id='fileInput'
                  />
                  <label htmlFor='fileInput' className='cursor-pointer block'>
                    <Upload className='w-8 h-8 text-neutral-400 mx-auto mb-2' />
                    <p className='text-neutral-300 text-sm mb-1'>
                      Choose or Drop Images
                    </p>
                    <p className='text-xs text-neutral-500'>
                      Drag & drop or select files to upload (will be processed
                      on submit)
                    </p>
                  </label>
                </div>

                {/* Image Previews */}
                {localPreviews.length > 0 && (
                  <div className='grid grid-cols-4 gap-2 mt-3'>
                    {localPreviews.map((src, index) => (
                      <div key={index} className='relative group '>
                        <img
                          src={src}
                          alt={`Uploaded ${index + 1}`}
                          className='rounded-lg object-cover w-full h-full  border border-neutral-700'
                        />
                        <button
                          type='button'
                          onClick={() => handleRemoveImage(index)}
                          className='absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity'
                        >
                          <X className='w-3 h-3 text-white' />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                        Output Aspect Ratios
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
                                className={`w-[180px] bg-neutral-800 text-neutral-300 ${errors.outputFormat
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
                    uploadedFiles.length === 0 ||
                    (aspectRatios?.length || 0) === 0
                  }
                  className=' cursor-pointer flex-1 bg-gradient-to-r from-neutral-200 to-neutral-300 text-neutral-900 hover:from-neutral-300 hover:to-neutral-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isGenerating ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Wand2 className='w-4 h-4 mr-2' />
                      Edit{' '}
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
