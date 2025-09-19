import { steps } from "@/app/data/homeData";
import React from "react";
import { Card, CardContent } from "../ui/card";
import { ArrowRight } from "lucide-react";

export const HowItWorkSection = () => {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
    >
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
  );
};
