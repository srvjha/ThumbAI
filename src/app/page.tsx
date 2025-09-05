"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  MessageCircle,
  Upload,
  Sparkles,
  ArrowRight,
  Star,
  Image,
  Wand2,
  Clock,
  Shield,
  Menu,
  X,
  Edit3,
  VideoIcon,
  Youtube,
  Play,
  Download,
  Link2,
} from "lucide-react";
import { Header } from "@/components/Header";
import UploadImage from "@/components/UploadImage";
import FeatureCard from "@/components/Feature";
import Link from "next/link";
import { ImageBackground } from "@/components/ImagesBackground";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { Footer } from "@/components/ui/Footer";

const Home = () => {
  const features = [
    {
      icon: <Download className="w-6 h-6" />,
      title: "Instant Downloads",
      description:
        "Get your generated thumbnail immediately with a single click. High-quality downloads in multiple formats for any platform.",
    },
    {
      icon: <Link2 className="w-6 h-6" />,
      title: "Shareable Image Links",
      description:
        "Every thumbnail comes with a unique shareable link. Easily preview, share, or integrate your design anywhere online.",
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Smart Follow-up Chat",
      description:
        "Not happy with the first draft? Continue chatting with ThumbAI to refine, tweak colors, or explore new styles—just like a designer on demand.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Upload Your Image",
      description:
        "Start by uploading your base image or let our AI create one from scratch.",
    },
    {
      step: "02",
      title: "Chat Your Vision",
      description:
        "Tell our AI what you want: 'Make it more vibrant', 'Add bold text', 'Gaming style thumbnail'.",
    },
    {
      step: "03",
      title: "Get Perfect Results",
      description:
        "Receive multiple thumbnail variations in seconds. Download and use immediately.",
    },
  ];

  const models = [
    {
      title: "TextThumb",
      subtitle: "text-to-image",
      description:
        "Generate stunning thumbnails from text descriptions. Perfect for creating eye-catching visuals from your ideas.",
      isNew: true,
      backgroundImage: "./pgmarry.jpeg",
      icon: <Wand2 className="w-3 h-3" />,
      navigate: "/nano-banana/text-to-image",
      onClick: () => console.log("Navigate to text-to-image"),
    },
    {
      title: "EditThumb",
      subtitle: "image-editor",
      description:
        "Transform existing images into perfect thumbnails. Edit, enhance, and optimize your visuals with AI precision.",
      isNew: true,
      backgroundImage: "./hitshchai.jpeg",
      icon: <Edit3 className="w-3 h-3" />,
      navigate: "/nano-banana/edit-image",
      onClick: () => console.log("Navigate to image-editor"),
    },
  ];

  return (
    <>
      <ImageBackground />
      <div className="min-h-screen  text-white z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/5 border border-neutral-700 rounded-full px-3 py-2 mb-8">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-gray-300">
                AI-Powered Thumbnail Generation
              </span>
            </div>
            <h1
              className="
            text-4xl sm:text-6xl lg:text-6xl 
            font-bold mb-6 
            bg-gradient-to-r from-white via-gray-200 to-gray-400 
            bg-clip-text text-transparent leading-tight 
            tracking-tight   /* decrease character spacing */
            word-spacing-tight /* custom class for word spacing */
          "
            >
              From Idea to{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Thumbnail
              </span>
              <br />
              in One Click
            </h1>

            <p className="text-sm text-neutral-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Upload your image and chat with our AI to create eye-catching
              thumbnails that boost engagement. No design skills needed – just
              describe what you want in plain English.
            </p>

            <Link
              href="/nano-banana/edit-image"
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <button className="bg-gradient-to-r cursor-pointer from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-5 py-3  rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center">
                Start Creating Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </Link>

            <div className="max-w-5xl mx-auto mb-20 bg-transparent rounded-2xl ">
              <div className="relative rounded-2xl overflow-hidden border border-neutral-900 shadow-sm shadow-neutral-800">
                <div className=" ">
                  <video
                    className="w-full h-full object-cover"
                    src="/thumbai.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>
              </div>
            </div>

            <section className="py-20 px-4 sm:px-6 lg:px-8">
              <div className="container mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Choose Your <span className="text-blue-400">AI Model</span>
                  </h2>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Two specialized AI models designed for different thumbnail
                    creation workflows
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {models.map((model, index) => (
                    <FeatureCard
                      key={index}
                      title={model.title}
                      subtitle={model.subtitle}
                      description={model.description}
                      isNew={model.isNew}
                      backgroundImage={model.backgroundImage}
                      icon={model.icon}
                      navigate={model.navigate}
                      onClick={model.onClick}
                    />
                  ))}
                </div>

                {/* Additional Info */}
                <div className="text-center mt-12">
                  <p className="text-gray-500 text-sm">
                    Both models are optimized for thumbnail generation and
                    support high-resolution outputs
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* Showcase Thumbnails  */}
        <section className="max-w-7xl mx-auto">
          <div>
            <h2 className="text-3xl text-center sm:text-5xl font-bold mb-4">
              Tutorial <span className="text-blue-400">Thumbnails</span>
            </h2>
            <InfiniteMovingCards
              items={[
                "./pgmarry.jpeg",
                "./hiteshdsa.jpg",
                "./hiteshdocker.jpg",
              ]}
              direction="right"
              speed="normal"
            />
          </div>

          <div className="mt-28">
            <h2 className="text-3xl text-center sm:text-5xl font-bold mb-4">
              Gaming/Vlogging <span className="text-blue-400">Thumbnails</span>
            </h2>
            <InfiniteMovingCards
              items={[
                "https://v3.fal.media/files/lion/X6JDNajUhwbqavCtZVYd9.jpeg",
                "https://v3.fal.media/files/zebra/ieZr7-cVRJLoYjqy3A7fR.jpeg",
                "https://v3.fal.media/files/elephant/IpgCSlkEtwpJsp2LrG7qs.jpeg",
                "./mrbeast.jpg",
              ]}
              direction="right"
              speed="normal"
            />
          </div>

          <div className="mt-28">
            <h2 className="text-3xl text-center sm:text-5xl font-bold mb-4">
              Review <span className="text-blue-400">Thumbnails</span>
            </h2>
            <InfiniteMovingCards
              items={[
                "https://v3.fal.media/files/zebra/iWJh6VpT4bulQnV3ib5FO.jpeg",
                "https://v3.fal.media/files/koala/7tpjveeHxpK8RNreZRplv.jpeg",
              ]}
              direction="right"
              speed="normal"
            />
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="py-20 px-4 sm:px-6 lg:px-8 bg-transparent max-w-6xl mx-auto"
        >
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Why Choose <span className="text-blue-400">ThumbAI</span>?
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Powerful features designed to make thumbnail creation effortless
                and engaging
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="bg-neutral-950/50 border-neutral-800 hover:border-neutral-700 py-4 transition-all hover:shadow-lg hover:shadow-blue-500/10 group"
                >
                  <CardContent className="px-6 py-4 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-blue-500  rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-center">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>


        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Three Simple Steps to{" "}
                <span className="text-cyan-400">Perfect Thumbnails</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Our intuitive process makes professional thumbnail creation
                accessible to everyone
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <Card className="bg-neutral-950/50 border-neutral-800 hover:border-neutral-700 h-full py-4 hover:shadow-xs hover:shadow-blue-500/20 transition-all">
                    <CardContent className="px-6 py-4 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                        {step.step}
                      </div>
                      <h3 className="text-2xl font-semibold mb-4 text-white">
                        {step.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* Demo Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-gradient-to-r from-neutral-950 to-neutral-900 border-neutral-900 overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-2">
                    <div className="p-8 lg:p-12">
                      <h3 className="text-3xl font-bold mb-4">
                        See the Magic in Action
                      </h3>
                      <p className="text-gray-400 mb-6 text-lg">
                        Watch how our AI transforms ordinary images into
                        click-worthy thumbnails through simple conversation.
                      </p>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-center text-gray-300">
                          <Zap className="w-5 h-5 text-yellow-400 mr-3" />
                          Instant AI-powered generation
                        </li>
                        <li className="flex items-center text-gray-300">
                          <MessageCircle className="w-5 h-5 text-blue-400 mr-3" />
                          Natural language commands
                        </li>
                        <li className="flex items-center text-gray-300">
                          <Image className="w-5 h-5 text-green-400 mr-3" />
                          Professional quality output
                        </li>
                      </ul>
                      <Link href="/">
                        <Button className="cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-neutral-100 text-lg px-6 py-6">
                          Try It Now
                          <ArrowRight className="ml-1 w-5 h-5" />
                        </Button>
                      </Link>
                    </div>
                    <div className="bg-transparent p-8 lg:p-12 flex items-center justify-center">
                      <div className="w-full max-w-sm">
                        <div className="bg-gray-800 rounded-lg p-4 mb-4">
                          <div className="w-full h-44 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center mb-3">
                            <img
                              src="https://i.ytimg.com/vi/qG1m_wIopsQ/hqdefault.jpg?sqp=-oaymwEnCNACELwBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLCVTJKqsD3tmNaaaxSITjUgl35OHw"
                              alt=""
                              className="w-full h-full rounded-lg"
                            />
                          </div>
                          <div className="text-center">
                            <ArrowRight className="w-6 h-6 text-gray-400 mx-auto mb-3" />
                          </div>
                          <div className="w-full h-44 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center relative overflow-hidden">
                            <img
                              src="https://v3.fal.media/files/elephant/qA7XmAMV6j63cOTjYbuGi.jpeg"
                              alt=""
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>


        {/* Footer */}
       <Footer/>
      </div>
    </>
  );
};

export default Home;
