"use client";
import { Image, Menu, X, Coins, User2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import axios from "axios";
import { Loader } from "./ai-elements/loader";
import { useThumbUser } from "@/hooks/useThumbUser";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data, isLoading, error } = useThumbUser();

  return (
    <header className="fixed top-0 w-full bg-transparent backdrop-blur-md border-b border-neutral-800 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <span className="text-xl font-bold text-white">ThumbAI</span>
          </Link>

          {/* Web Based Header  */}
          <nav className="hidden md:flex items-center space-x-4">
            <div className="flex rounded-lg border border-neutral-500 shadow-xs shadow-neutral-800 px-4 py-2 hover:bg-neutral-800">
              Credits:{" "}
              <div>
                {isLoading ? (
                  <div className="ml-1">
                    <Loader />
                  </div>
                ) : (
                  <div className="ml-1">{data?.credits || 0}</div>
                )}
              </div>
            </div>

            <Link href="/pricing" className="flex rounded-lg border cursor-pointer border-neutral-500 shadow-xs shadow-neutral-800 hover:bg-neutral-800 px-4 py-2">
              Pricing <span className="ml-2">₹</span>
            </Link>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
             
            <div className="cursor-pointer">
              <SignedOut>
                <Link href="/sign-in">
                  <div className="flex rounded-lg border cursor-pointer border-neutral-500 shadow-xs shadow-neutral-800 hover:bg-neutral-800 px-4 py-2">
                    Sign In 
                    <User2 className="w-4 h-4 mt-1 ml-1"/>
                  </div>
                </Link>
              </SignedOut>
            </div>
          </nav>

          {/* Mobile Based Header */}
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-neutral-800 bg-black/90 backdrop-blur-md">
            <div className="px-4 py-4 space-y-4">
              <SignedIn>
                {/* Mobile Credits Display */}
                <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-600 to-yellow-500 px-3 py-2 rounded-full w-fit mx-auto">
                  <Coins className="w-4 h-4 text-yellow-100" />
                  <span className="text-sm font-medium text-yellow-100">
                    {data?.credits}
                  </span>
                </div>
                <div className="flex justify-center">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>

              <SignedOut>
                <Link href="/sign-in" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Sign In
                  </Button>
                </Link>
              </SignedOut>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
