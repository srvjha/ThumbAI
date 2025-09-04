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
} from "lucide-react";
import { Header } from "@/components/Header";
import UploadImage from "@/components/UploadImage";
import FeatureCard from "@/components/Feature";
import Link from "next/link";
import { ImageBackground } from "@/components/ImagesBackground";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";

const Home = () => {
  const features = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Chat-Based Interface",
      description:
        "Simply describe what you want in natural language. Our AI understands your vision and creates accordingly.",
    },
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Easy Upload",
      description:
        "Drag and drop your images or upload from anywhere. Support for all major image formats.",
    },
    {
      icon: <Wand2 className="w-6 h-6" />,
      title: "AI-Powered Magic",
      description:
        "Advanced AI algorithms understand context and create stunning thumbnails that capture attention.",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Lightning Fast",
      description:
        "Generate professional thumbnails in seconds, not hours. Save time and focus on content creation.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "High Quality",
      description:
        "Export in multiple resolutions and formats. Perfect for YouTube, social media, and web.",
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Endless Variations",
      description:
        "Generate multiple versions and pick your favorite. Iterate until it's perfect.",
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

            {/* <div className="flex flex-col sm:flex-row gap-4 justify-center mb-17 mt-5">
            <Link href="/nano-banana/edit-image">
              <Button
                size="lg"
                className="cursor-pointer bg-gradient-to-r from-blue-700 to-cyan-700 hover:from-blue-700 hover:to-cyan-600 text-lg text-neutral-300 px-8 py-6 font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
              >
                Start Creating
                <ArrowRight className=" w-5 h-5" />
              </Button>
            </Link>
           <a href="https://youtu.be/dnqDogyenHg" target="_blank">
            <Button
              variant="outline"
              size="lg"
              className="border-gray-600 cursor-pointer text-gray-300 hover:bg-gray-800 text-lg px-8 py-6"
            >
              Watch Demo
               <Youtube className=" w-5 h-5" />
            </Button>
            </a>
          </div> */}

            <Link href="/nano-banana/edit-image" className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button className="bg-gradient-to-r cursor-pointer from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-5 py-3  rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center">
                Start Creating Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </Link>

            <div className="max-w-4xl mx-auto mb-20 bg-neutral-900 rounded-2xl ">
              <div className="relative rounded-2xl overflow-hidden border border-neutral-900 shadow-xl shadow-neutral-800">
                <div className="aspect-video bg-black">
                  <video
                    className="w-full h-full object-fill" // ensures it fills container
                    src="/vid.mp4" // place vid.mp4 inside public/
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
            Tutorial <span className="text-blue-400">Thumbnail</span>
          </h2>
          <InfiniteMovingCards
            items={[
              "./pgmarry.jpeg",
              "./hiteshdsa.jpg",
              "./hiteshdocker.jpg"
            ]}
            direction="right"
            speed="normal"
          />
        </div>

         <div className="mt-28">
            <h2 className="text-3xl text-center sm:text-5xl font-bold mb-4">
            Gaming <span className="text-blue-400">Thumbnail</span>
          </h2>
          <InfiniteMovingCards
            items={[
              "https://v3.fal.media/files/lion/X6JDNajUhwbqavCtZVYd9.jpeg",
              "https://v3.fal.media/files/zebra/ieZr7-cVRJLoYjqy3A7fR.jpeg",
              "https://v3.fal.media/files/elephant/IpgCSlkEtwpJsp2LrG7qs.jpeg"
            ]}
            direction="right"
            speed="normal"
          />
        </div>
        </section>
        {/* Features Section */}
        <section
          id="features"
          className="py-20 px-4 sm:px-6 lg:px-8 bg-transparent"
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
                  className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all hover:shadow-lg hover:shadow-blue-500/10 group"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-neutral-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
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
                  <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-700 h-full hover:shadow-xs hover:shadow-blue-500/20 transition-all">
                    <CardContent className="p-8 text-center">
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
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                    <Image className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">ThumbAI</span>
                </div>
                <p className="text-gray-400">
                  Create stunning thumbnails with the power of AI conversation.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      API
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Templates
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Blog
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Careers
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Support</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Community
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Status
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
              <p>&copy; 2025 ThumbAI. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Home;
