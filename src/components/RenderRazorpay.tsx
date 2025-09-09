"use client";
import { useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useThumbUser } from "@/hooks/useThumbUser";

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
  planDetails: {
    id: string;
    name: string;
    credit: number;
    amount: number;
  };
}

// Utility function for loading external script
const loadScript = (src: string): Promise<boolean> =>
  new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// 🔥 Force close Razorpay modal by removing DOM elements
const forceCloseRazorpay = () => {
  const selectors = [
    ".razorpay-backdrop",
    ".razorpay-container",
    ".razorpay-checkout",
    "[data-razorpay]",
    ".razorpay-overlay",
    ".razorpay-modal",
  ];

  selectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => element.remove());
  });

  document.body.style.overflow = "";

  const body = document.body;
  if (body.style.position === "fixed") {
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.width = "";
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
  
  // 🔥 Store user data in a ref to prevent stale closure
  const userRef = useRef<any>(null);

  const { data: user, isLoading, error } = useThumbUser();
  
  // Update ref whenever user data changes
  useEffect(() => {
    if (user) {
      userRef.current = user;
      // console.log("User data updated in ref:", user);
    }
  }, [user]);

  // console.log({user});

  const displayRazorpay = async () => {
    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );
    if (!res) {
      console.error("❌ Razorpay SDK failed to load");
      toast.error("Payment system failed to load ❌");
      return;
    }

    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      name: "ThumbAI Youtube Thumbnail Generator",
      order_id: orderId,
      methods: ["card", "netbanking", "upi"],
      description: planDetails.name,
      image: "https://storage.uignite.in/saurav.png",
      prefill: {
        name: "Saurav",
        email: "jhasaurav0209001@gmail.com",
        contact: "7043495527",
      },
      notes: {
        planId: planDetails.id,
        planName: planDetails.name,
      },
      theme: {
        color: "#3399cc",
      },

      // ✅ Success handler
      handler: (response: any) => {
        // console.log("✅ Payment Success:", response);
        try {
          if (razorpayInstance.current) {
            razorpayInstance.current.close();
          }
        } catch (e) {
          console.warn("Standard close failed:", e);
        }

        forceCloseRazorpay();

        setTimeout(() => {
          forceCloseRazorpay();
        }, 50);

        // Handle verification
        setTimeout(async () => {
          try {
            const verifyRes = await axios.post("/api/order/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            // console.log("🎉 Payment verified:", verifyRes.data);
            
            // 🔥 Use ref to get current user data
            const currentUser = userRef.current;
            // console.log("Current user from ref:", { user: currentUser });
            
            if (currentUser?.id) {
              // ✅ Update user credits
              const updateRes = await axios.put("/api/user/update", {
                userId: currentUser.id,
                credits: planDetails.credit,
              });

              // console.log("💳 Credits updated:", updateRes.data);
              toast.success(
                `Payment Successful ✅ ${planDetails.credit} credits added`
              );
            } else {
              console.error("❌ User data not available for credit update");
              toast.error("Payment successful but credit update failed");
            }
          } catch (error: any) {
            console.error(
              "❌ Verification failed:",
              error.response?.data || error.message
            );
            toast.error("Payment verification failed ❌");
          }
        }, 200);
      },

      modal: {
        confirm_close: true,
        ondismiss: () => {
          // console.log("❌ Payment modal closed/cancelled.");
          forceCloseRazorpay();
        },
      },
      retry: {
        enabled: false,
      },
      timeout: 900,
    });

    razorpayInstance.current = rzp;

    rzp.on("payment.submit", (response: any) => {
      // console.log("✅ Payment Submitted:", response);
      paymentMethod.current = response.method;
    });

    rzp.on("payment.failed", (response: any) => {
      // console.error("❌ Payment Failed", response);
      paymentId.current = response.error.metadata.payment_id;

      try {
        if (razorpayInstance.current) {
          razorpayInstance.current.close();
        }
      } catch (e) {
        console.warn("Close on failure failed:", e);
      }

      forceCloseRazorpay();
    });

    rzp.on("payment.success", () => {
      // console.log("✅ Payment Success Event Triggered");
      forceCloseRazorpay();
    });

    rzp.open();
  };

  // 🔥 Only initialize Razorpay when user data is available
  useEffect(() => {
    if (user && !isLoading) {
      displayRazorpay();
    }

    return () => {
      if (razorpayInstance.current) {
        try {
          razorpayInstance.current.close();
        } catch (e) {
          console.warn("Cleanup close failed:", e);
        }
      }
      forceCloseRazorpay();
    };
  }, [user, isLoading]); // Add user and isLoading as dependencies

  // Show loading state while user data is being fetched
  if (isLoading) {
    return <div>Loading payment...</div>;
  }

  if (error || !user) {
    return <div>Error loading user data</div>;
  }

  return null;

}