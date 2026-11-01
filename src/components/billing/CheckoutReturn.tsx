'use client';

import { useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

type VerifyResult = { status: 'paid' | 'pending' | 'failed'; credits: number };

/**
 * Handles the trip back from Dodo checkout. Render once per page.
 *
 * - /billing?order=…&payment_id=…&status=…  (return_url): asks the server to
 *   confirm the payment, which grants credits if the webhook hasn't already.
 * - /pricing?cancelled=…  (cancel_url): marks the abandoned order cancelled.
 *
 * The status Dodo puts in the URL is only used for wording; the server looks
 * the payment up itself.
 */
export const CheckoutReturn = () => {
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const url = new URL(window.location.href);
    const orderId = url.searchParams.get('order');
    const paymentId = url.searchParams.get('payment_id');
    const cancelled = url.searchParams.get('cancelled');
    if (!orderId && !cancelled) return;

    // Clean the URL so a refresh doesn't replay this.
    for (const key of ['order', 'payment_id', 'status', 'cancelled']) {
      url.searchParams.delete(key);
    }
    window.history.replaceState(null, '', url.pathname + url.search);

    if (cancelled) {
      axios.post('/api/order/cancel', { orderId: cancelled }).catch(() => {});
      toast('Checkout cancelled. You were not charged.');
      return;
    }

    if (!paymentId) {
      toast.error('Payment was not completed.');
      return;
    }

    const id = toast.loading('Confirming your payment…');
    axios
      .post<VerifyResult>('/api/order/verify', { orderId, paymentId })
      .then(({ data }) => {
        if (data.status === 'paid') {
          toast.success(`Payment received. ${data.credits} credits added.`, {
            id,
          });
        } else if (data.status === 'pending') {
          toast(
            'Your payment is processing. Credits will appear as soon as it clears.',
            { id },
          );
        } else {
          toast.error('The payment did not go through. You were not charged.', {
            id,
          });
        }
      })
      .catch(() => {
        toast.error(
          'Could not confirm the payment yet. If you were charged, credits will appear shortly.',
          { id },
        );
      })
      .finally(() => {
        // Balance, order history and anything else under ['user', ...].
        queryClient.invalidateQueries({ queryKey: ['user'] });
      });
  }, [queryClient]);

  return null;
};
