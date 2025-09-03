"use client";
import React, { useState } from "react";
import axios from "axios";

import { Star, TrendingUp } from "lucide-react";
import { PricingCard } from "@/components/Pricing";
import { RenderRazorpay } from "@/components/RenderRazorpay";

export interface PricingDetails {
  id: string;
  name: string;
  credit: number;
  amount: number;
}

const PricingPage = () => {
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    currency: string;
    amount: number;
  } | null>(null);

  const [planDetails, setPlanDetails] = useState<PricingDetails | null>(null);

  const handleBuyNow = async (product: PricingDetails) => {
    try {
      const res = await axios.post(`/api/order/order`, {
        amount: product.amount * 100, // Razorpay expects paise
        currency: "INR",
        productName: product.name,
        productId: product.id,
      });

      const data = res.data;

      if (data?.order?.razorpayOrderId) {
        setOrderDetails({
          orderId: data.order.razorpayOrderId,
          currency: data.order.currency,
          amount: data.order.amount,
        });

        // ✅ Save the plan details
        setPlanDetails(product);
      }
    } catch (err) {
      console.error("Failed to create Razorpay order", err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 mt-8 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-neutral-400 mb-6 leading-tight">
            Generate{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Stunning Thumbnails
            </span>
            <br />
            That Actually Convert
          </h1>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-wrap justify-center gap-8 mb-16">
          <PricingCard
            title="Free Starter"
            price="0"
            description="Perfect for testing our quality."
            features={[
              "3 High Quality Thumbnails per month",
              "Download Images in standard resolution",
              "Download URL links for easy sharing",
              "YouTube thumbnail and shorts thumbnail sizes",
            ]}
            ctaText="Start Free Today"
            onClick={()=>{}}
            
          />

          <PricingCard
            title="Creator Pro"
            price="50"
            originalPrice="200"
            description="Most popular! Huge savings."
            features={[
              "8 High Quality Thumbnails per month",
              "HD Download Images available",
              "Fast Download URL links",
              "YouTube thumbnail and shorts optimization",
            ]}
            highlighted={true}
            popular={true}
            badge="75% OFF"
            ctaText="Get Pro Now - Save ₹150!"
            onClick={() =>
              handleBuyNow({
                id: "2",
                name: "Creator Pro",
                credit: 8,
                amount: 50,
              })
            }
          />

          <PricingCard
            title="Business Elite"
            price="100"
            originalPrice="300"
            description="⭐ Ultimate value!"
            features={[
              "20 High Quality Thumbnails per month",
              "HD Download Images available",
              "Priority Download URL links",
              "YouTube formats + custom sizes",
            ]}
            badge="67% OFF"
            ctaText="Go Elite - Save ₹200!"
            onClick={() =>
              handleBuyNow({
                id: "3",
                name: "Business Elite",
                credit: 20,
                amount: 100,
              })
            }
          />
        </div>
      </div>

      {/* Render Razorpay Checkout */}
      {orderDetails && planDetails && (
        <RenderRazorpay
          amount={orderDetails.amount}
          currency={orderDetails.currency}
          orderId={orderDetails.orderId}
          keyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""}
          planDetails={planDetails} 
        />
      )}
    </div>
  );
};

export default PricingPage;
