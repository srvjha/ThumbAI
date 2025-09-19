import React from "react";
import { Card, CardContent } from "../ui/card";
import { ArrowRight, Image, MessageCircle, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

export const DemoSection = () => {
  return (
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
  );
};
