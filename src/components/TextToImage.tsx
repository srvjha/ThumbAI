"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import {
  CheckCircle,
  Clock,
  Copy,
  Download,
  Edit,
  Eye,
  ImageIcon,
  Loader2,
  Share2,
  Wand2,
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
import { useRouter } from "next/navigation";
import { ChatToggleButton, PopoutChat } from "./ChatPopup";
import { useChat } from "@ai-sdk/react";
import { YouTubeThumbnailQuestionnaire } from "./Questionarie";
import { deductCredits } from "@/utils/credits";
import { useThumbUser } from "@/hooks/useThumbUser";

type FormValues = {
  prompt: string;
  numImages: number;
  outputFormat: string;
  aspectRatios: string[];
  imagesUrl?: string[];
};

type ImageData = {
  url: string;
  aspectRatio: string;
};

export const TextToImageGenerator = () => {
  const [generatedImages, setGeneratedImages] = useState<ImageData[]>([]);
  const [status, setStatus] = useState<
    "idle" | "generating" | "in-progress" | "completed"
  >("idle");

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      prompt: "",
      numImages: 1,
      outputFormat: "jpeg",
      aspectRatios: ["16:9"],
      imagesUrl: [""],
    },
    mode: "onChange",
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const prompt = watch("prompt");
  const aspectRatios = watch("aspectRatios");
  const defaultImage = watch("imagesUrl") || [];
  const [questionnaireData, setQuestionnaireData] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { data: userInfo } = useThumbUser();

  const onSubmit = async (data: FormValues) => {
    if (userInfo?.credits === 0) {
      toast.error("Your Free Credits Exhausted, Buy a Plan to use ThumbAI");
      return;
    }
    setIsGenerating(true);
    setStatus("generating");

    try {
      let results: ImageData[] = [];

      // Process images for each selected aspect ratio
      for (const aspectRatio of data.aspectRatios) {
        const res = await axios.post("/api/generate", {
          prompt: data.prompt,
          numImages: data.numImages,
          outputFormat: data.outputFormat,
          aspectRatio: data.aspectRatios,
        });
        if (res.data.success) {
          // decrease the credit by one
          const updateCredits = await deductCredits(userInfo!.id);
          if (!updateCredits) {
            console.log("credits not updated");
          }
        }

        const imgs =
          res.data?.data?.data?.images?.map((img: any) => ({
            url: img.url,
            aspectRatio: aspectRatio,
          })) || [];
        results = [...results, ...imgs];
      }

      setGeneratedImages(results);
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
    setGeneratedImages([]);
    setStatus("idle");
    toast.success("Form reset successfully!");
  };

  const handleDownload = async (url: string, filename = "image.jpg") => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch image");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);

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
          title: "Generated Image",
          text: "Check out this generated image!",
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

      // Add each image to zip
      for (let i = 0; i < displayImages.length; i++) {
        const img = displayImages[i];
        try {
          const imageUrl = typeof img === "string" ? img : img.url;
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error(`Failed to fetch image ${i + 1}`);

          const blob = await response.blob();
          const extension = watch("outputFormat") || "jpg";
          const aspectRatio =
            typeof img === "string" ? "16:9" : img.aspectRatio;
          const filename = `${
            isShowingDefault ? "default" : "generated"
          }-image-${aspectRatio.replace(":", "x")}-${i + 1}.${extension}`;

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
      link.download = `${
        isShowingDefault ? "default" : "generated"
      }-thumbnails.zip`;
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

  const displayImages = generatedImages.length > 0 ? generatedImages : [];
  const isShowingDefault =
    generatedImages.length === 0 && defaultImage.length > 0;

  const getImageContainerStyle = (aspectRatio: string) => {
    if (aspectRatio === "9:16") {
      return "aspect-[9/16] max-h-[300px] w-auto mx-auto";
    }
    return "aspect-[16/9] w-full";
  };

  const getGridLayout = () => {
    if (displayImages.length === 1) return "grid-cols-1";

    // Check if we have mixed aspect ratios
    const hasLandscape = displayImages.some(
      (img) => img.aspectRatio === "16:9"
    );
    const hasPortrait = displayImages.some((img) => img.aspectRatio === "9:16");

    if (hasLandscape && hasPortrait) {
      // Mixed ratios - use flexible grid
      return "grid-cols-1 sm:grid-cols-2 gap-4";
    }

    // Same aspect ratios
    if (displayImages[0].aspectRatio === "9:16") {
      return displayImages.length <= 2
        ? "grid-cols-2 gap-3"
        : "grid-cols-3 gap-2";
    }

    return "grid-cols-1 gap-3";
  };

  const router = useRouter();

  const handleEdit = (selectedIdx: number) => {
    const img = displayImages[selectedIdx];
    if (!img) return;

    router.push(
      `/nano-banana/edit-image?url=${encodeURIComponent(img.url)}&aspectRatio=${
        img.aspectRatio
      }&prompt=${encodeURIComponent(prompt)}&outputFormat=${watch(
        "outputFormat"
      )}`
    );
  };

  const handleQuestionnaireComplete = (data: any) => {
    setQuestionnaireData(data);
    toast.success("Form filled Successfully");
  };

  const [input, setInput] = useState("");
  const {
    messages,
    setMessages,
    sendMessage,
    status: chatStatus,
    regenerate,
  } = useChat();

  const handleChatSubmit = async (input: string) => {
    if (userInfo?.credits === 0) {
      toast.error("Your Free Credits Exhausted, Buy a Plan to use ThumbAI");
      return;
    }
    if (!input.trim()) return;
    sendMessage({ text: input });

    setIsGenerating(true);
    setStatus("generating");
    const userPrompt = input;
    setInput("");
    const imagesToSend = generatedImages
      .map((img) => img.url)
      .filter((e) => e.trim().length > 0);
    try {
      const res = await axios.post("/api/edit", {
        prompt: userPrompt,
        numImages: watch("numImages"),
        outputFormat: watch("outputFormat"),
        images_urls: imagesToSend,
        aspectRatio: aspectRatios,
        userChoices: questionnaireData ?? "",
      });

      if (res.data.success) {
        // decrease the credit by one
        const updateCredits = await deductCredits(userInfo!.id);
        if (!updateCredits) {
          console.log("credits not updated");
        }
      }

      const imgs =
        res.data?.data?.data?.images?.map((img: any) => ({
          url: img.url,
          aspectRatio: aspectRatios[0] || "16:9",
        })) || [];

      setGeneratedImages(imgs);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `I’ve updated your images as per "${userPrompt}".`,
            },
          ],
        },
      ]);

      setStatus("completed");
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `Sorry, I couldn’t process your request.`,
            },
          ],
        },
      ]);

      setStatus("idle");
    } finally {
      setIsGenerating(false);
    }
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
                      Prompt *
                    </label>
                    <textarea
                      {...field}
                      placeholder="Describe the thumbnail you want to create..."
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

              <YouTubeThumbnailQuestionnaire
                onComplete={handleQuestionnaireComplete}
              />

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
                        Aspect Ratios
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
                    (aspectRatios?.length || 0) === 0
                  }
                  className=" cursor-pointer flex-1 bg-gradient-to-r from-neutral-200 to-neutral-300 text-neutral-900 hover:from-neutral-300 hover:to-neutral-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate{" "}
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
                      ? "Generating..."
                      : "Processing your image..."}
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
                              isShowingDefault ? "Default Preview" : "Generated"
                            }
                            className="w-full h-full object-cover"
                          />

                          {isShowingDefault && (
                            <div className="absolute top-2 left-2 bg-neutral-900/80 text-neutral-300 px-2 py-1 rounded-md text-sm">
                              Preview
                            </div>
                          )}

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
                                    isShowingDefault ? "default" : "generated"
                                  }-image.jpg`
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
                                  isShowingDefault ? "Default" : "Generated"
                                } ${idx + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                              {isShowingDefault && (
                                <div className="absolute top-2 left-2 bg-neutral-900/80 text-neutral-300 px-2 py-1 rounded-md text-xs">
                                  Preview {idx + 1}
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
                                        isShowingDefault
                                          ? "default"
                                          : "generated"
                                      }-image-${img.aspectRatio.replace(
                                        ":",
                                        "x"
                                      )}-${idx + 1}.jpg`
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

                  <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-neutral-800">
                    <Select
                      onValueChange={(value) => handleEdit(parseInt(value))}
                    >
                      <SelectTrigger className="w-[200px] cursor-pointer border-neutral-600 text-neutral-300">
                        <Edit className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Edit Image" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {displayImages.map((_, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            Edit Image {idx + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleDownloadAll}
                      className="border-neutral-600 cursor-pointer text-neutral-300 hover:bg-neutral-800"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All as ZIP
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-neutral-400 h-full min-h-[400px]">
                  <ImageIcon className="w-16 h-16" />
                  <p className="text-lg mb-1">No images generated yet</p>
                  <p className="text-sm text-center">
                    Enter a prompt to start generating
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
