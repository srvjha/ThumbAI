'use client';

import { useState, type ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { RenderRazorpay } from '@/components/RenderRazorpay';
import { env } from '@/config/env';
import type { Plan } from '@/config/plans';

type OrderDetails = {
  orderId: string;
  currency: string;
  amount: number;
};

/**
 * Buying credits, shared by /pricing and /billing.
 *
 * Creates the order, then mounts RenderRazorpay, which opens the checkout,
 * verifies the payment and invalidates the ['user'] query so balances (and
 * anything keyed under ['user', ...], like order history) refetch. Render
 * `checkout` somewhere in the page for that to happen.
 */
export const useCreditCheckout = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [planDetails, setPlanDetails] = useState<Plan | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const startCheckout = async (plan: Plan) => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
      return;
    }
    try {
      setLoadingPlanId(plan.id);
      // Only the plan id is sent; the server resolves price and credits
      // from src/config/plans.ts.
      const res = await axios.post(`/api/order/order`, {
        productId: plan.id,
      });

      const data = res.data;

      if (data?.order?.razorpayOrderId) {
        setOrderDetails({
          orderId: data.order.razorpayOrderId,
          currency: data.order.currency,
          amount: data.order.amount,
        });
        setPlanDetails(plan);
      }
    } catch {
      toast.error('Could not start checkout. Please try again.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  const checkout: ReactNode =
    orderDetails && planDetails ? (
      <RenderRazorpay
        // A fresh mount per order, so a second purchase opens its own checkout.
        key={orderDetails.orderId}
        amount={orderDetails.amount}
        currency={orderDetails.currency}
        orderId={orderDetails.orderId}
        keyId={env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''}
        planDetails={planDetails}
      />
    ) : null;

  return { startCheckout, loadingPlanId, checkout };
};
