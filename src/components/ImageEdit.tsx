"use client";

import { useState, DragEvent, ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import {
  CheckCircle,
  Clock,
  Copy,
  Download,
  Edit,
  Eye,
  Loader2,
  Share2,
  Wand2,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import axios from "axios";
import toast from "react-hot-toast";
import { resizedImages } from "@/utils/imageUtils";
import { fal } from "@fal-ai/client";

type FormValues = {
  prompt: string;
  numImages: number;
  outputFormat: string;
  aspectRatios: string[];
  uploadedImages: string[];
};

type ImageData = {
  url: string;
  aspectRatio: string;
};

export const ImageEditorGenerator = () => {
  const searchParams = useSearchParams();

  const promptFromQuery = searchParams.get("prompt") || "";
  const aspectRatioFromQuery = searchParams.get("aspectRatio") || "16:9";
  const urlFromQuery = searchParams.get("url") || "";

  const outputFormatFromQuery = searchParams.get("outputFormat") || "jpeg";

  const finalPrompt =
    promptFromQuery.length > 0
      ? promptFromQuery
      : "A professional YouTube thumbnail for a tutorial video titled 'How to Create a YouTube Thumbnail Generator with AI'. The background should be a sleek, dark gradient with modern tech vibes.";
  const finalAspectRatio =
    aspectRatioFromQuery.length > 0 ? [aspectRatioFromQuery] : ["16:9"];
  const finalImage =
    urlFromQuery.length > 0
      ? [urlFromQuery]
      : [
          "https://i.ytimg.com/vi/Ecygj87WhZs/hqdefault.jpg?sqp=-oaymwEnCNACELwBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLALuqRUZ4UCevhLJZ5hHcR4_koCRA",
        ];
  const finalOutputFormat =
    outputFormatFromQuery.length > 0 ? outputFormatFromQuery : "jpeg";

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      prompt: finalPrompt,
      numImages: 1,
      outputFormat: finalOutputFormat,
      aspectRatios: finalAspectRatio,
      uploadedImages: finalImage,
    },
    mode: "onChange",
  });

  const prompt = watch("prompt");
  const aspectRatios = watch("aspectRatios");
  const uploadedImages = watch("uploadedImages") || [];

  const [editedImages, setEditedImages] = useState<ImageData[]>([
    {
      url:
        urlFromQuery.length > 0
          ? urlFromQuery
          : "https://v3.fal.media/files/panda/Z_BYnI4_8T-nNGe5n0FJQ.jpeg",
      aspectRatio: "16:9",
    },
  ]);
  const [status, setStatus] = useState<
    "idle" | "generating" | "in-progress" | "completed"
  >("idle");
  const [imageSizes, setImageSizes] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [localPreviews, setLocalPreviews] = useState<string[]>(uploadedImages);

  const [isGenerating, setIsGenerating] = useState(false);

  const uploadFileToFal = async (file: File): Promise<string> => {
    fal.config({
      credentials: process.env.NEXT_PUBLIC_FAL_KEY,
    });
    const url = await fal.storage.upload(file);
    return url;
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      try {
        const previews = files.map((file) => URL.createObjectURL(file));
        setLocalPreviews((prev) => [...prev, ...previews]);
        const uploadedUrls = await Promise.all(files.map(uploadFileToFal));
        setValue("uploadedImages", [...uploadedImages, ...uploadedUrls]);
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error("Failed to upload images. Please try again.", {
          id: "upload",
        });
      }
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) return;

    toast.loading("Uploading images...", { id: "upload" });

    try {
      const previews = files.map((file) => URL.createObjectURL(file));
      setLocalPreviews((prev) => [...prev, ...previews]);

      const uploadedUrls = await Promise.all(files.map(uploadFileToFal));
      setValue("uploadedImages", [...uploadedImages, ...uploadedUrls]);

      toast.success("Images uploaded successfully!", { id: "upload" });
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload images. Please try again.", {
        id: "upload",
      });
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setLocalPreviews((prev) => [...prev, urlInput.trim()]);
      setValue("uploadedImages", [...uploadedImages, urlInput.trim()]);
      setUrlInput("");
      toast.success("Image URL added!");
    }
  };

  const handleRemoveImage = (index: number) => {
    setLocalPreviews((prev) => prev.filter((_, i) => i !== index));
    setValue(
      "uploadedImages",
      uploadedImages.filter((_, i) => i !== index)
    );
    toast.success("Image removed!");
  };

  const onSubmit = async (data: FormValues) => {
    console.log({ data });
    setIsGenerating(true);
    setStatus("generating");

    try {
      let results: ImageData[] = [];

      // Process images for each selected aspect ratio
      for (const aspectRatio of data.aspectRatios) {
        const res = await axios.post("/api/edit", {
          prompt: data.prompt,
          numImages: data.numImages,
          outputFormat: data.outputFormat,
          images_urls: data.uploadedImages,
          aspectRatio: data.aspectRatios,
        });

        const imgs =
          res.data?.data?.data?.images?.map((img: any) => ({
            url: img.url,
            aspectRatio: aspectRatio,
          })) || [];
        results = [...results, ...imgs];
      }

      setEditedImages(results);
      setStatus("completed");
      toast.success("Images edited successfully!", { id: "generation" });
    } catch (err) {
      console.error(err);
      setStatus("idle");
      toast.error("Failed to edit images. Please try again.", {
        id: "generation",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    reset();
    setEditedImages([]);
    setLocalPreviews([]);
    setUrlInput("");
    setStatus("idle");
    toast.success("Form reset successfully!");
  };

  const handleDownload = async (
    url: string,
    filename = "image.jpg",
    sizes: string[] = []
  ) => {
    try {
      console.log("sizes: ", sizes);
      toast.loading("Downloading image...", { id: "download" });

      // if sizes are requested → get resized URL(s)
      const urlsToDownload =
        sizes.length > 0 ? resizedImages([url], sizes) : [url];

      for (let i = 0; i < urlsToDownload.length; i++) {
        const response = await fetch(urlsToDownload[i]);
        if (!response.ok) throw new Error("Failed to fetch image");

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download =
          sizes.length > 1
            ? `${filename.replace(/\.\w+$/, "")}-${i + 1}.jpg`
            : filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(blobUrl);
      }

      toast.success("Image downloaded successfully!", { id: "download" });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download image. Please try again.", {
        id: "download",
      });
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Image URL copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy URL. Please try again.");
    }
  };

  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Edited Image",
          text: "Check out this edited image!",
          url,
        });
        toast.success("Image shared successfully!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
          toast.error("Failed to share image.");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Image URL copied to clipboard (sharing not supported)!");
      } catch (error) {
        toast.error("Sharing not supported in this browser.");
      }
    }
  };

  const handleDownloadAll = async () => {
    if (displayImages.length === 0) return;

    try {
      toast.loading("Preparing zip file...", { id: "zip-download" });
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < displayImages.length; i++) {
        const img = displayImages[i];
        try {
          const response = await fetch(img.url);
          if (!response.ok) throw new Error(`Failed to fetch image ${i + 1}`);

          const blob = await response.blob();
          const extension = watch("outputFormat") || "jpg";
          const filename = `${
            isShowingEdited ? "edited" : "uploaded"
          }-image-${img.aspectRatio.replace(":", "x")}-${i + 1}.${extension}`;

          zip.file(filename, blob);
        } catch (error) {
          console.error(`Failed to add image ${i + 1} to zip:`, error);
          toast.error(`Failed to add image ${i + 1} to zip`);
        }
      }

      // Generate and download zip
      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(content);

      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `${isShowingEdited ? "edited" : "uploaded"}-images.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(zipUrl);
      toast.success("All images downloaded as zip!", { id: "zip-download" });
    } catch (error) {
      console.error("Zip download failed:", error);
      toast.error("Failed to create zip file. Please try again.", {
        id: "zip-download",
      });
    }
  };

  const displayImages = editedImages.length > 0 ? editedImages : [];
  const isShowingEdited = editedImages.length > 0;

  const getImageContainerStyle = (aspectRatio: string) => {
    if (aspectRatio === "9:16") {
      return "aspect-[9/16] max-h-[300px] w-auto mx-auto";
    }
    return "aspect-[16/9] w-full";
  };

  const getGridLayout = () => {
    if (displayImages.length === 1) return "grid-cols-1";
    const hasLandscape = displayImages.some(
      (img) => img.aspectRatio === "16:9"
    );
    const hasPortrait = displayImages.some((img) => img.aspectRatio === "9:16");

    if (hasLandscape && hasPortrait) {
      return "grid-cols-1 sm:grid-cols-2 gap-4";
    }

    if (displayImages[0].aspectRatio === "9:16") {
      return displayImages.length <= 2
        ? "grid-cols-2 gap-3"
        : "grid-cols-3 gap-2";
    }

    return "grid-cols-1 gap-3";
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left Panel - Input */}
      <div className="space-y-6">
        <Card className="bg-neutral-900/30 border border-neutral-800 py-1">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">
              Input
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Controller
                name="prompt"
                control={control}
                rules={{
                  required: "Prompt is required",
                  minLength: {
                    value: 10,
                    message: "Prompt must be at least 10 characters",
                  },
                }}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Edit Prompt *
                    </label>
                    <textarea
                      {...field}
                      placeholder="Describe how you want to edit the uploaded images..."
                      className={`w-full h-32 bg-neutral-800 border rounded-lg p-4 text-neutral-300 placeholder-neutral-500 focus:outline-none resize-none ${
                        errors.prompt
                          ? "border-red-500 focus:border-red-500"
                          : "border-neutral-700 focus:border-blue-500"
                      }`}
                    />
                    {errors.prompt && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.prompt.message}
                      </p>
                    )}
                  </div>
                )}
              />
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Upload Images *
                </label>

                {/* URL Input */}
                <div className="flex space-x-2 mb-3">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste image URL"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-neutral-300 placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                  />
                  <Button
                    type="button"
                    onClick={handleAddUrl}
                    variant="outline"
                    className="cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                  >
                    Add
                  </Button>
                </div>

                {/* File Picker + Drag & Drop */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-neutral-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-neutral-800/30"
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="fileInput"
                  />
                  <label htmlFor="fileInput" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-300 text-sm mb-1">
                      Choose or Drop Images
                    </p>
                    <p className="text-xs text-neutral-500">
                      Drag & drop or select files to upload
                    </p>
                  </label>
                </div>

                {/* Image Previews */}
                {localPreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {localPreviews.map((src, index) => (
                      <div key={index} className="relative group ">
                        <img
                          src={src}
                          alt={`Uploaded ${index + 1}`}
                          className="rounded-lg object-cover w-full h-full  border border-neutral-700"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Controller
                name="numImages"
                control={control}
                rules={{
                  required: "Number of images is required",
                  min: { value: 1, message: "Must generate at least 1 image" },
                  max: {
                    value: 4,
                    message: "Cannot generate more than 4 images",
                  },
                }}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Number of Images *
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="1"
                        max="4"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-neutral-300 min-w-[20px]">
                        {field.value}
                      </span>
                    </div>
                    {errors.numImages && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.numImages.message}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* Aspect Ratios */}
              <Controller
                name="aspectRatios"
                control={control}
                render={({ field }) => {
                  const ratioOptions = [
                    { value: "16:9", label: "YouTube Thumbnail (16:9)" },
                    { value: "9:16", label: "Shorts/Reels Cover (9:16)" },
                  ];

                  return (
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">
                        Output Aspect Ratios
                      </label>
                      <div className="flex gap-4">
                        {ratioOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 text-neutral-300"
                          >
                            <input
                              type="checkbox"
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
                                      (r) => r !== option.value
                                    )
                                  );
                                }
                              }}
                              className="accent-neutral-300"
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />

              <Accordion type="single" collapsible>
                <AccordionItem value="settings">
                  <AccordionTrigger className="text-base font-medium text-neutral-300">
                    Additional Settings
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 mt-4">
                      {/* Output Format */}
                      <Controller
                        name="outputFormat"
                        control={control}
                        rules={{ required: "Output format is required" }}
                        render={({ field }) => (
                          <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                              Output Format *
                            </label>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                className={`w-[180px] bg-neutral-800 text-neutral-300 ${
                                  errors.outputFormat
                                    ? "border-red-500"
                                    : "border-neutral-700"
                                }`}
                              >
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent className="bg-neutral-800 text-neutral-300 border-neutral-700">
                                <SelectItem value="jpeg">JPEG</SelectItem>
                                <SelectItem value="png">PNG</SelectItem>
                                <SelectItem value="webp">WEBP</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.outputFormat && (
                              <p className="text-red-400 text-xs mt-1">
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

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !prompt.trim() ||
                    isGenerating ||
                    uploadedImages.length === 0 ||
                    (aspectRatios?.length || 0) === 0
                  }
                  className=" cursor-pointer flex-1 bg-gradient-to-r from-neutral-200 to-neutral-300 text-neutral-900 hover:from-neutral-300 hover:to-neutral-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Edit{" "}
                      {(aspectRatios?.length || 0) > 1
                        ? `${aspectRatios?.length} Formats`
                        : "Image"}
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
        <Card className="bg-transparent border-neutral-800 h-[600px] overflow-y-auto p-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-100">Result</h3>

              {status !== "idle" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-700 bg-transparent text-white text-sm">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      status === "completed"
                        ? "bg-green-500"
                        : status === "generating"
                        ? "bg-amber-400"
                        : status === "in-progress"
                        ? "bg-blue-400"
                        : "bg-neutral-500"
                    }`}
                  />
                  <span>
                    {status === "completed"
                      ? "Completed"
                      : status === "generating"
                      ? "Generating"
                      : status === "in-progress"
                      ? "In Progress"
                      : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="min-h-[400px] bg-neutral-950 rounded-lg border-none p-4">
              {status === "generating" || status === "in-progress" ? (
                <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[400px]">
                  <Loader2 className="w-16 h-16 animate-spin text-neutral-400" />
                  <p className="text-neutral-400">
                    {status === "generating"
                      ? "Processing images..."
                      : "Editing your images..."}
                  </p>
                </div>
              ) : displayImages.length > 0 ? (
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    {displayImages.length === 1 ? (
                      <div className="flex justify-center items-start h-full">
                        <div
                          className={`relative rounded-lg overflow-hidden border-none group ${getImageContainerStyle(
                            displayImages[0].aspectRatio
                          )}`}
                        >
                          <img
                            src={displayImages[0].url}
                            alt={
                              isShowingEdited
                                ? "Edited Image"
                                : "Uploaded Image"
                            }
                            className="w-full h-full object-cover"
                          />
                          {/* Show status label */}
                          {!isShowingEdited && (
                            <div className="absolute top-2 left-2 bg-neutral-900/80 text-neutral-300 px-2 py-1 rounded-md text-sm">
                              Original
                            </div>
                          )}
                          {/* Aspect ratio badge */}
                          <div className="absolute bottom-2 left-2 bg-neutral-900/80 text-neutral-300 px-2 py-1 rounded-md text-xs">
                            {displayImages[0].aspectRatio}
                          </div>
                          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition bg-neutral-900/80 p-1 rounded-lg">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(displayImages[0].url)}
                              className="text-neutral-300 hover:text-white"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDownload(
                                  displayImages[0].url,
                                  `${
                                    isShowingEdited ? "edited" : "uploaded"
                                  }-image.jpg`,
                                  imageSizes
                                )
                              }
                              className="text-neutral-300 hover:text-white"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare(displayImages[0].url)}
                              className="text-neutral-300 hover:text-white"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`grid ${getGridLayout()}`}>
                        {displayImages.map((img, idx) => (
                          <div key={idx} className="flex justify-center">
                            <div
                              className={`relative rounded-lg overflow-hidden border border-neutral-700 group ${getImageContainerStyle(
                                img.aspectRatio
                              )}`}
                            >
                              <img
                                src={img.url}
                                alt={`${
                                  isShowingEdited ? "Edited" : "Uploaded"
                                } ${idx + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                              {!isShowingEdited && (
                                <div className="absolute top-2 left-2 bg-neutral-900/80 text-neutral-300 px-2 py-1 rounded-md text-xs">
                                  Original {idx + 1}
                                </div>
                              )}
                              {/* Aspect ratio badge */}
                              <div className="absolute bottom-2 left-2 bg-neutral-900/80 text-neutral-300 px-2 py-1 rounded-md text-xs">
                                {img.aspectRatio}
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition bg-neutral-900/80 p-1 rounded-lg">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(img.url)}
                                  className="text-neutral-300 hover:text-white p-1"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDownload(
                                      img.url,
                                      `${
                                        isShowingEdited ? "edited" : "uploaded"
                                      }-image-${img.aspectRatio.replace(
                                        ":",
                                        "x"
                                      )}-${idx + 1}.jpg`,
                                      imageSizes
                                    )
                                  }
                                  className="text-neutral-300 hover:text-white p-1"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShare(img.url)}
                                  className="text-neutral-300 hover:text-white p-1"
                                >
                                  <Share2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons at bottom */}
                  <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-neutral-800">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleDownloadAll}
                      className="cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                      disabled={displayImages.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All as ZIP
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-neutral-400 h-full min-h-[400px]">
                  <ImageIcon className="w-16 h-16" />
                  <p className="text-lg mb-2">No images uploaded yet</p>
                  <p className="text-sm text-center">
                    Upload images and enter a prompt to start editing
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
