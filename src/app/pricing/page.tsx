'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { PricingCard } from '@/components/Pricing';
import { RenderRazorpay } from '@/components/RenderRazorpay';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/user/auth';
import { CREDIT_COSTS, FREE_PLAN, PLANS, type Plan } from '@/config/plans';

/** Kept as the public name for consumers like RenderRazorpay. */
export type PricingDetails = Plan;

const PLAN_ORDER = ['creator-pro', 'business-elite'] as const;

const PricingPage = () => {
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    currency: string;
    amount: number;
  } | null>(null);

  const [planDetails, setPlanDetails] = useState<Plan | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const router = useRouter();
  const { data: userInfo } = useAuth();

  const handleBuyNow = async (product: Plan) => {
    if (!userInfo) {
      return router.push('/sign-in');
    }
    try {
      setLoadingPlanId(product.id);
      // Only the plan id is sent; the server resolves price and credits
      // from src/config/plans.ts.
      const res = await axios.post(`/api/order/order`, {
        productId: product.id,
      });

      const data = res.data;

      if (data?.order?.razorpayOrderId) {
        setOrderDetails({
          orderId: data.order.razorpayOrderId,
          currency: data.order.currency,
          amount: data.order.amount,
        });
        setPlanDetails(product);
      }
    } catch (err) {
      toast.error('Could not start checkout. Please try again.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className='min-h-screen bg-neutral-950'>
      <div className='mx-auto max-w-6xl px-4 pt-28 pb-24 sm:px-6 lg:px-8'>
        <header className='max-w-2xl'>
          <h1 className='text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl'>
            Buy credits, not a subscription
          </h1>
          <p className='mt-3 text-base text-neutral-400'>
            One credit is one draft thumbnail. Credits never expire, and you are
            only charged when an image is actually produced — a failed
            generation is refunded automatically.
          </p>
        </header>

        <div className='mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          <PricingCard
            plan={FREE_PLAN}
            ctaText={userInfo ? 'Go to the studio' : 'Start free'}
            ctaHref={userInfo ? '/studio/text-to-image' : '/sign-up'}
          />

          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            return (
              <PricingCard
                key={plan.id}
                plan={plan}
                recommended={plan.id === 'creator-pro'}
                ctaText={`Get ${plan.credits} credits`}
                loading={loadingPlanId === plan.id}
                onClick={() => handleBuyNow(plan)}
              />
            );
          })}
        </div>

        {/* "8 credits" is not "8 thumbnails" once tiers exist. Saying so here
            is cheaper than answering it in support. */}
        <section className='mt-16 rounded-xl border border-neutral-800 bg-neutral-900/30 p-6'>
          <h2 className='text-sm font-semibold text-neutral-100'>
            What a credit buys
          </h2>
          <dl className='mt-4 grid gap-4 sm:grid-cols-3'>
            {CREDIT_COSTS.map((item) => (
              <div key={item.label}>
                <dt className='text-sm text-neutral-300'>{item.label}</dt>
                <dd className='mt-0.5 text-sm text-neutral-500'>
                  {item.credits} {item.credits === 1 ? 'credit' : 'credits'}
                </dd>
              </div>
            ))}
          </dl>
          <p className='mt-5 text-sm text-neutral-500'>
            Draft is the default and is the better value for most thumbnails.
            Quality uses a slower model with sharper typography and stronger
            face consistency — worth it when the design leans on text or on a
            recognisable person.
          </p>
        </section>
      </div>

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
