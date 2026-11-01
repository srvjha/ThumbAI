'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  CHECKOUT_DISABLED_MESSAGE,
  CHECKOUT_ENABLED,
  type Plan,
} from '@/config/plans';

/**
 * Buying credits, shared by /pricing and /billing.
 *
 * Creates the order server side, then sends the buyer to Dodo's hosted
 * checkout. Dodo brings them back to /billing, where <CheckoutReturn />
 * confirms the payment.
 */
export const useCreditCheckout = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const startCheckout = async (plan: Plan) => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
      return;
    }
    if (!CHECKOUT_ENABLED) {
      toast(CHECKOUT_DISABLED_MESSAGE, { id: 'checkout-disabled' });
      return;
    }
    try {
      setLoadingPlanId(plan.id);
      // Only the plan id is sent; the server resolves price and credits
      // from src/config/plans.ts.
      const { data } = await axios.post<{ checkoutUrl?: string }>(
        '/api/order/order',
        { productId: plan.id },
      );
      if (!data?.checkoutUrl) throw new Error('No checkout URL');
      // Stays "loading" through the navigation.
      window.location.assign(data.checkoutUrl);
    } catch {
      toast.error('Could not start checkout. Please try again.');
      setLoadingPlanId(null);
    }
  };

  return { startCheckout, loadingPlanId };
};
