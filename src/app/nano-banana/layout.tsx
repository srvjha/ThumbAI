"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Wand2, Settings, Dot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const modes = [
  {
    id: "text-to-image",
    label: "Text to Image",
    description: "Generate thumbnails from text descriptions",
    icon: <Wand2 className="w-4 h-4" />,
    path: "/nano-banana/text-to-image",
  },
  {
    id: "edit-image",
    label: "Image to Image",
    description: "Edit existing images with AI",
    icon: <Settings className="w-4 h-4" />,
    path: "/nano-banana/edit-image",
  },
];

export default function GeneratorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMode = modes.find((m) => pathname.includes(m.id));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen mt-16 bg-neutral-950 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              AI Thumbnail Generator
            </h1>
            <p className="text-neutral-400">
              Create stunning thumbnails with AI assistance
            </p>
          </div>

         
          <div className="flex items-center gap-4">
             <Badge className="bg-neutral-900 flex justify-center items-center gap-2 text-center text-sm border-neutral-600  hover:bg-neutral-800 text-neutral-300 px-3 py-2 rounded-md">
              <span className="w-2 h-2 rounded-full bg-green-600 -mt-0.5"></span>
              Nano Banana
            </Badge>
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="cursor-pointer border-neutral-600 text-neutral-300 hover:bg-neutral-800 min-w-[200px] justify-between"
              >
                <div className="flex items-center">
                  {currentMode?.icon}
                  <span className="ml-2">{currentMode?.label}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>

              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50">
                  <div className="p-2">
                    {modes.map((mode) => (
                      <Link key={mode.id} href={mode.path}>
                        <div
                          className={`w-full text-left p-3 mt-2 rounded-lg transition-colors cursor-pointer ${
                            pathname.includes(mode.id)
                              ? "bg-neutral-800 text-white"
                              : "hover:bg-neutral-800 text-neutral-300"
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            {mode.icon}
                            <span className="ml-2 font-medium">{mode.label}</span>
                            {pathname.includes(mode.id) && (
                              <Badge className="ml-auto bg-blue-500 text-white">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-400">
                            {mode.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

           
           
          </div>
        </div>


        <div className="min-h-[600px]">{children}</div>
      </div>
    </div>
  );
}
