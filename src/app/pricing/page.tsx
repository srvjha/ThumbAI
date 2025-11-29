'use client';
import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PricingCard } from '@/components/Pricing';
import { RenderRazorpay } from '@/components/RenderRazorpay';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/user/auth';
import { useRouter } from 'next/navigation';

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
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const router = useRouter();
  const { data: userInfo } = useAuth();
  const handleBuyNow = async (product: PricingDetails) => {
    if (!userInfo) {
      return router.push('/sign-in');
    }
    try {
      setLoadingPlanId(product.id);
      const res = await axios.post(`/api/order/order`, {
        amount: product.amount * 100, // Razorpay expects paise
        currency: 'INR',
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
      console.error('Failed to create Razorpay order', err);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className='min-h-screen bg-neutral-950 mt-8 py-16 px-4'>
      <div className='max-w-7xl mx-auto'>
        {/* Header Section */}
        <div className='text-center mb-16'>
          <h1 className='text-5xl font-bold text-neutral-400 mb-6 leading-tight'>
            Generate{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'>
              Stunning Thumbnails
            </span>
            <br />
            That Actually Convert
          </h1>
        </div>

        {/* Pricing Cards */}
        <div className='flex flex-wrap justify-center gap-8 mb-16'>
          <PricingCard
            title='Free Starter'
            price='0'
            description='Perfect for testing our quality.'
            features={[
              '3 High Quality Thumbnails',
              'Download Images in standard resolution',
              'Download URL links for easy sharing',
              'YouTube thumbnail and shorts thumbnail sizes',
            ]}
            ctaText='Start Free Today'
            onClick={() => {}}
          />

          <PricingCard
            title='Creator Pro'
            price='80'
            originalPrice='200'
            description='Most popular! Huge savings.'
            features={[
              '8 High Quality Thumbnails',
              'HD Download Images available',
              'Fast Download URL links',
              'YouTube thumbnail and shorts optimization',
            ]}
            highlighted={true}
            popular={true}
            badge='60% OFF'
            ctaText='Get Pro Now - Save ₹150!'
            loading={loadingPlanId === '2'}
            onClick={() =>
              handleBuyNow({
                id: '2',
                name: 'Creator Pro',
                credit: 8,
                amount: 80,
              })
            }
          />

          <PricingCard
            title='Business Elite'
            price='150'
            originalPrice='300'
            description='⭐ Ultimate value!'
            features={[
              '20 High Quality Thumbnails',
              'HD Download Images available',
              'Priority Download URL links',
              'YouTube formats + custom sizes',
            ]}
            badge='50% OFF'
            ctaText='Go Elite - Save ₹200!'
            loading={loadingPlanId === '3'}
            onClick={() =>
              handleBuyNow({
                id: '3',
                name: 'Business Elite',
                credit: 20,
                amount: 150,
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
          keyId={env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''}
          planDetails={planDetails}
        />
      )}
    </div>
  );
};

export default PricingPage;
