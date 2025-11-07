"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface ModelCardProps {
  title: string;
  subtitle: string;
  description: string;
  isNew?: boolean;
  backgroundImage: string;
  icon: React.ReactNode;
  navigate: string;
  onClick?: () => void;
}

const FeatureCard: React.FC<ModelCardProps> = ({
  subtitle,
  description,
  backgroundImage,
  icon,
  navigate,
  onClick,
}) => {
  return (
    <Card
      className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all group overflow-hidden relative p-0"
      onClick={onClick}
    >
      {/* Background Image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <div
          className="absolute inset-0 transition-transform group-hover:scale-105"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent"></div>
      </div>

      {/* Content */}
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-2 py-1 text-xs">
              {icon}
              <span>{subtitle}</span>
            </div>
          </div>

          <p className="text-gray-400 text-left text-sm leading-relaxed">
            {description}
          </p>

          <Link href={`${navigate}`}>
            <Button className="w-full mt-4 cursor-pointer  bg-neutral-300  border border-black/10 text-neutral-900 hover:bg-neutral-400 hover:border-neutral-600 transition-all">
              Try Now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;
