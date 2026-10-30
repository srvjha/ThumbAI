'use client';
import { useEffect, useRef } from 'react';
import axios from 'axios';
import { RAZORPAY_APP_TAG, type Plan } from '@/config/plans';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/user/auth';
import { useQueryClient } from '@tanstack/react-query';
import { Loader } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RenderRazorpayProps {
  orderId: string;
  keyId: string;
  currency: string;
  amount: number;
  planDetails: Plan;
}

// Utility function for loading external script
const loadScript = (src: string): Promise<boolean> =>
  new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// Force close Razorpay modal by removing DOM elements
const forceCloseRazorpay = () => {
  const selectors = [
    '.razorpay-backdrop',
    '.razorpay-container',
    '.razorpay-checkout',
    '[data-razorpay]',
    '.razorpay-overlay',
    '.razorpay-modal',
  ];

  selectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => element.remove());
  });

  document.body.style.overflow = '';

  const body = document.body;
  if (body.style.position === 'fixed') {
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.width = '';
  }
};

export const RenderRazorpay: React.FC<RenderRazorpayProps> = ({
  orderId,
  keyId,
  currency,
  amount,
  planDetails,
}) => {
  const paymentId = useRef<string | null>(null);
  const paymentMethod = useRef<string | null>(null);
  const razorpayInstance = useRef<any>(null);

  // Store user data in a ref to prevent stale closure
  const userRef = useRef<any>(null);

  const { data: userInfo, isLoading, isError } = useAuth();
  const queryClient = useQueryClient();

  // Update ref whenever user data changes
  useEffect(() => {
    if (userInfo) {
      userRef.current = userInfo;
    }
  }, [userInfo]);

  const displayRazorpay = async () => {
    const res = await loadScript(
      'https://checkout.razorpay.com/v1/checkout.js',
    );
    if (!res) {
      toast.error('Checkout could not load. Check your connection and try again.');
      return;
    }

    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      name: 'ThumbAI Youtube Thumbnail Generator',
      order_id: orderId,
      methods: ['card', 'netbanking', 'upi'],
      description: planDetails.name,
      image: 'https://storage.uignite.in/saurav.png',
      prefill: {
        name: userRef.current?.name,
        email: userRef.current?.email,
        contact: userRef.current?.phone,
      },
      // The webhook reads payment notes, which come from here, not the order.
      notes: {
        ...RAZORPAY_APP_TAG,
        planId: planDetails.id,
        planName: planDetails.name,
      },
      theme: {
        color: '#3e63dd',
      },

      // Success handler
      handler: (response: any) => {
        try {
          if (razorpayInstance.current) {
            razorpayInstance.current.close();
          }
        } catch (e) {
          console.warn('Could not close checkout after payment:', e);
        }

        forceCloseRazorpay();

        setTimeout(() => {
          forceCloseRazorpay();
        }, 50);

        // Handle verification
        setTimeout(async () => {
          try {
            // The server grants the credits after verifying the Razorpay
            // signature; the client only reports the outcome.
            await axios.post('/api/order/verify', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            toast.success(
              `Payment received. ${planDetails.credits} credits added.`,
            );

            // Refresh the header credit count.
            queryClient.invalidateQueries({ queryKey: ['user'] });
          } catch (error) {
            toast.error(
              'Payment received, but confirmation failed. Your credits will appear shortly.',
            );
          }
        }, 200);
      },

      modal: {
        confirm_close: true,
        ondismiss: () => {
          forceCloseRazorpay();

          // Best-effort: mark order as cancelled in backend
          axios.post('/api/order/cancel', { orderId }).catch(() => {
            // silently ignore; this is non-critical for the user
          });
        },
      },
      retry: {
        enabled: false,
      },
      timeout: 900,
    });

    razorpayInstance.current = rzp;

    rzp.on('payment.submit', (response: any) => {
      paymentMethod.current = response.method;
    });

    rzp.on('payment.failed', (response: any) => {
      paymentId.current = response.error.metadata.payment_id;

      try {
        if (razorpayInstance.current) {
          razorpayInstance.current.close();
        }
      } catch (e) {
        console.warn('Could not close checkout after failed payment:', e);
      }

      forceCloseRazorpay();
    });

    rzp.on('payment.success', () => {
      forceCloseRazorpay();
    });

    rzp.open();
  };

  // Open checkout once per mount. Callers remount per order (key={orderId});
  // re-running on every user refetch reopened checkout for an order that had
  // just been paid, since verifying the payment refetches the user.
  const opened = useRef(false);
  useEffect(() => {
    if (userInfo && !isLoading && !opened.current) {
      opened.current = true;
      displayRazorpay();
    }
  }, [userInfo, isLoading]);

  // Close only on unmount; a background refetch must not tear down an open
  // checkout mid-payment.
  useEffect(
    () => () => {
      if (razorpayInstance.current) {
        try {
          razorpayInstance.current.close();
        } catch (e) {
          console.warn('Could not close checkout on unmount:', e);
        }
      }
      forceCloseRazorpay();
    },
    [],
  );

  // Show loading state while user data is being fetched
  if (isLoading) {
    return <Loader className='mx-auto size-6 animate-spin text-muted-foreground' />;
  }

  if (isError) {
    return toast.error('Could not load your account. Refresh and try again.');
  }

  return null;
};
