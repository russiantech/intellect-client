// // hooks/useEnrollmentPayment.ts
// /**
//  * Shared enrollment + payment logic for CourseDetail and PathDetail.
//  * Handles free enrollment, Paystack inline v2, discount codes, and verification.
//  * Keeps both pages DRY and consistent.
//  */
// import { useState, useCallback, useRef, useEffect } from 'react';
// import toast from 'react-hot-toast';
// import { paymentsApi, enrollmentsApi } from '@/services/api';

// export interface PaymentOption {
//   payment_type: string;
//   fee: number;
//   subscription_interval?: string;
//   access_period_days?: number;
//   label: string;
// }

// export interface DiscountInfo {
//   valid: boolean;
//   final_price: number;
//   savings: number;
//   message: string;
// }

// export interface UseEnrollmentPaymentProps {
//   itemId: number;
//   itemType: 'course' | 'path';
//   slug?: string;
//   paymentOptions: PaymentOption[];
//   user: any;
//   navigate: (path: string, opts?: any) => void;
// }

// export interface UseEnrollmentPaymentReturn {
//   enrolling: boolean;
//   selectedPayment: PaymentOption | null;
//   setSelectedPayment: (opt: PaymentOption | null) => void;
//   instructorLed: boolean;
//   setInstructorLed: (v: boolean) => void;
//   discountCode: string;
//   setDiscountCode: (v: string) => void;
//   discountInfo: DiscountInfo | null;
//   checkingDiscount: boolean;
//   checkDiscount: () => Promise<void>;
//   handleEnroll: () => Promise<void>;
//   totalPrice: number;
//   paystackReady: boolean;
// }

// /* ── Paystack v2 SDK loader ─────────────────────────────────────────── */
// function loadPaystackSDK(): Promise<boolean> {
//   return new Promise((resolve) => {
//     if ((window as any).Paystack) {
//       resolve(true);
//       return;
//     }
//     const existing = document.querySelector('script[src="https://js.paystack.co/v2/inline.js"]');
//     if (existing) {
//       existing.addEventListener('load', () => resolve(true));
//       existing.addEventListener('error', () => resolve(false));
//       return;
//     }
//     const script = document.createElement('script');
//     script.src = 'https://js.paystack.co/v2/inline.js';
//     script.async = true;
//     script.onload = () => resolve(true);
//     script.onerror = () => resolve(false);
//     document.body.appendChild(script);
//   });
// }

// /* ── Main hook ──────────────────────────────────────────────────────── */
// export function useEnrollmentPayment({
//   itemId,
//   itemType,
//   slug,
//   paymentOptions,
//   user,
//   navigate,
// }: UseEnrollmentPaymentProps): UseEnrollmentPaymentReturn {
//   const [enrolling, setEnrolling] = useState(false);
//   const [selectedPayment, setSelectedPayment] = useState<PaymentOption | null>(null);
//   const [instructorLed, setInstructorLed] = useState(false);
//   const [discountCode, setDiscountCode] = useState('');
//   const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
//   const [checkingDiscount, setCheckingDiscount] = useState(false);
//   const [paystackReady, setPaystackReady] = useState(false);
//   const paystackRef = useRef<any>(null);

//   // Initialize selected payment
//   useEffect(() => {
//     if (paymentOptions.length > 0 && !selectedPayment) {
//       setSelectedPayment(paymentOptions[0]);
//     }
//   }, [paymentOptions, selectedPayment]);

//   // Load Paystack SDK once
//   useEffect(() => {
//     loadPaystackSDK().then(setPaystackReady);
//   }, []);

//   /* ── Verify payment and enroll ───────────────────────────────────── */
//   const verifyAndEnroll = useCallback(async (reference: string) => {
//     try {
//       const r = await paymentsApi.verify(reference);
//       const paid = r.data?.status === 'success' || r.data?.paid === true;

//       if (paid) {
//         toast.success('Payment successful! You are now enrolled 🎉');
//         if (slug) {
//           navigate(itemType === 'course' ? `/learn/${slug}` : '/my-courses');
//         }
//       } else {
//         toast.error('Payment could not be verified. Contact support if you were charged.');
//       }
//     } catch (err: any) {
//       const detail = (err?.response?.data?.detail ?? err?.message ?? '').toLowerCase();
//       if (detail.includes('email') || detail.includes('resend') || detail.includes('smtp')) {
//         toast.success('You are now enrolled! (Confirmation email may be delayed.)');
//         if (slug) {
//           navigate(itemType === 'course' ? `/learn/${slug}` : '/my-courses');
//         }
//       } else {
//         toast.error('Payment verification failed. Contact support if you were charged.');
//       }
//     } finally {
//       if (slug && itemType === 'course') {
//         navigate(`/courses/${slug}`, { replace: true });
//       }
//     }
//   }, [itemType, slug, navigate]);

//   /* ── Check discount code ───────────────────────────────────────── */
//   const checkDiscount = useCallback(async () => {
//     if (!discountCode || !itemId) return;
//     setCheckingDiscount(true);
//     try {
//       const res = await paymentsApi.validateDiscount({
//         code: discountCode,
//         [`${itemType}_id`]: itemId,
//       });
//       setDiscountInfo(res.data);
//       if (res.data.valid) {
//         toast.success(res.data.message);
//       } else {
//         toast.error(res.data.message);
//       }
//     } catch {
//       toast.error('Could not validate discount code');
//     } finally {
//       setCheckingDiscount(false);
//     }
//   }, [discountCode, itemId, itemType]);

//   /* ── Calculate total price ───────────────────────────────────────── */
//   const discountedBase = discountInfo?.valid ? discountInfo.final_price : (selectedPayment?.fee ?? 0);
//   const totalPrice = discountedBase + (instructorLed ? ((window as any).__instructorLedFee ?? 0) : 0);

//   /* ── Handle enrollment / payment ───────────────────────────────── */
//   const handleEnroll = useCallback(async () => {
//     if (!user) {
//       navigate('/auth/signin');
//       return;
//     }
//     if (!selectedPayment) {
//       toast.error('Please select a payment option');
//       return;
//     }

//     setEnrolling(true);

//     try {
//       // Free enrollment
//       if (selectedPayment.payment_type === 'free' || totalPrice <= 0) {
//         if (itemType === 'path') {
//           await enrollmentsApi.enrollPath(itemId);
//         } else {
//           await enrollmentsApi.enroll(itemId);
//         }
//         toast.success('Enrolled successfully!');
//         navigate(itemType === 'course' && slug ? `/learn/${slug}` : '/my-courses');
//         return;
//       }

//       // Initiate payment
//       const res = await paymentsApi.initiate({
//         [`${itemType}_id`]: itemId,
//         payment_type: selectedPayment.payment_type,
//         discount_code: discountCode || undefined,
//         instructor_led: instructorLed,
//         callback_url: `${window.location.origin}${window.location.pathname}`,
//       });

//       const paymentData = res?.data?.data || res?.data;
//       const authorizationUrl = paymentData?.authorization_url;
//       const accessCode = paymentData?.access_code;
//       const txRef = paymentData?.tx_ref;

//       if (!authorizationUrl) {
//         toast.error('Could not initialize payment');
//         return;
//       }

//       if (!accessCode || !(window as any).Paystack) {
//         // Fallback to redirect
//         window.location.href = authorizationUrl;
//         return;
//       }

//       // Paystack inline v2
//       const popup = new (window as any).Paystack();
//       popup.checkout({
//         accessCode,
//         onSuccess: async (transaction: any) => {
//           const reference = transaction?.reference || transaction?.trxref || txRef;
//           if (reference) {
//             await verifyAndEnroll(reference);
//           }
//         },
//         onCancel: () => {
//           toast('Payment cancelled.', { icon: 'ℹ️' });
//         },
//         onError: (error: any) => {
//           console.error('Paystack error:', error);
//           toast.error(error?.message || 'Payment failed');
//         },
//       });

//     } catch (err: any) {
//       console.error('Enrollment error:', err);
//       toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Enrollment failed');
//     } finally {
//       setEnrolling(false);
//     }
//   }, [user, selectedPayment, totalPrice, itemId, itemType, slug, discountCode, instructorLed, navigate, verifyAndEnroll]);

//   return {
//     enrolling,
//     selectedPayment,
//     setSelectedPayment,
//     instructorLed,
//     setInstructorLed,
//     discountCode,
//     setDiscountCode,
//     discountInfo,
//     checkingDiscount,
//     checkDiscount,
//     handleEnroll,
//     totalPrice,
//     paystackReady,
//   };
// }




// 2
// hooks/useEnrollmentPayment.ts
/**
 * Shared enrollment + payment logic for CourseDetail and PathDetail.
 * Handles free enrollment, Paystack inline v2, discount codes, and verification.
 * Keeps both pages DRY and consistent.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { paymentsApi, enrollmentsApi } from '@/services/api';

export interface PaymentOption {
  payment_type: string;
  fee: number;
  subscription_interval?: string;
  access_period_days?: number;
  label: string;
}

export interface DiscountInfo {
  valid: boolean;
  final_price: number;
  savings: number;
  message: string;
}

export interface UseEnrollmentPaymentProps {
  itemId: number;
  itemType: 'course' | 'path';
  slug?: string;
  paymentOptions: PaymentOption[];
  user: any;
  navigate: (path: string, opts?: any) => void;
}

export interface UseEnrollmentPaymentReturn {
  enrolling: boolean;
  selectedPayment: PaymentOption | null;
  setSelectedPayment: (opt: PaymentOption | null) => void;
  instructorLed: boolean;
  setInstructorLed: (v: boolean) => void;
  discountCode: string;
  setDiscountCode: (v: string) => void;
  discountInfo: DiscountInfo | null;
  checkingDiscount: boolean;
  checkDiscount: () => Promise<void>;
  handleEnroll: () => Promise<void>;
  totalPrice: number;
  paystackReady: boolean;
}

/* ── Paystack v2 SDK loader ─────────────────────────────────────────── */
function loadPaystackSDK(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Paystack) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://js.paystack.co/v2/inline.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ── Main hook ──────────────────────────────────────────────────────── */
export function useEnrollmentPayment({
  itemId,
  itemType,
  slug,
  paymentOptions,
  user,
  navigate,
}: UseEnrollmentPaymentProps): UseEnrollmentPaymentReturn {
  const [enrolling, setEnrolling] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption | null>(null);
  const [instructorLed, setInstructorLed] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [paystackReady, setPaystackReady] = useState(false);
  const paystackRef = useRef<any>(null);

  // Initialize selected payment
  useEffect(() => {
    if (paymentOptions.length > 0 && !selectedPayment) {
      setSelectedPayment(paymentOptions[0]);
    }
  }, [paymentOptions, selectedPayment]);

  // Load Paystack SDK once
  useEffect(() => {
    loadPaystackSDK().then(setPaystackReady);
  }, []);

  /* ── Verify payment and enroll ───────────────────────────────────── */
  const verifyAndEnroll = useCallback(async (reference: string) => {
    try {
      const r = await paymentsApi.verify(reference);
      const paid = r.data?.status === 'success' || r.data?.paid === true;

      if (paid) {
        toast.success('Payment successful! You are now enrolled 🎉');
        if (slug) {
          navigate(itemType === 'course' ? `/learn/${slug}` : '/my-courses');
        }
      } else {
        toast.error('Payment could not be verified. Contact support if you were charged.');
      }
    } catch (err: any) {
      const detail = (err?.response?.data?.detail ?? err?.message ?? '').toLowerCase();
      if (detail.includes('email') || detail.includes('resend') || detail.includes('smtp')) {
        toast.success('You are now enrolled! (Confirmation email may be delayed.)');
        if (slug) {
          navigate(itemType === 'course' ? `/learn/${slug}` : '/my-courses');
        }
      } else {
        toast.error('Payment verification failed. Contact support if you were charged.');
      }
    } finally {
      if (slug && itemType === 'course') {
        navigate(`/courses/${slug}`, { replace: true });
      }
    }
  }, [itemType, slug, navigate]);

  /* ── Check discount code ───────────────────────────────────────── */
  const checkDiscount = useCallback(async () => {
    if (!discountCode || !itemId) return;
    setCheckingDiscount(true);
    try {
      const res = await paymentsApi.validateDiscount({
        code: discountCode,
        [`${itemType}_id`]: itemId,
      });
      setDiscountInfo(res.data);
      if (res.data.valid) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Could not validate discount code');
    } finally {
      setCheckingDiscount(false);
    }
  }, [discountCode, itemId, itemType]);

  /* ── Calculate total price ───────────────────────────────────────── */
  const discountedBase = discountInfo?.valid ? discountInfo.final_price : (selectedPayment?.fee ?? 0);
  const totalPrice = discountedBase + (instructorLed ? ((window as any).__instructorLedFee ?? 0) : 0);

  /* ── Handle enrollment / payment ───────────────────────────────── */
  const handleEnroll = useCallback(async () => {
    if (!user) {
      navigate('/auth/signin');
      return;
    }
    if (!selectedPayment) {
      toast.error('Please select a payment option');
      return;
    }

    setEnrolling(true);

    try {
      // Free enrollment
      if (selectedPayment.payment_type === 'free' || totalPrice <= 0) {
        if (itemType === 'path') {
          await enrollmentsApi.enrollPath(itemId);
        } else {
          await enrollmentsApi.enroll(itemId);
        }
        toast.success('Enrolled successfully!');
        navigate(itemType === 'course' && slug ? `/learn/${slug}` : '/my-courses');
        return;
      }

      // Initiate payment
      const res = await paymentsApi.initiate({
        [`${itemType}_id`]: itemId,
        payment_type: selectedPayment.payment_type,
        discount_code: discountCode || undefined,
        instructor_led: instructorLed,
        callback_url: `${window.location.origin}${window.location.pathname}`,
      });

      const paymentData = res?.data?.data || res?.data;
      const authorizationUrl = paymentData?.authorization_url;
      const accessCode = paymentData?.access_code;
      const txRef = paymentData?.tx_ref;

      if (!authorizationUrl) {
        toast.error('Could not initialize payment');
        return;
      }

      if (!accessCode || !(window as any).Paystack) {
        // Fallback to redirect
        window.location.href = authorizationUrl;
        return;
      }

      // Paystack inline v2
      const popup = new (window as any).Paystack();
      popup.checkout({
        accessCode,
        onSuccess: async (transaction: any) => {
          const reference = transaction?.reference || transaction?.trxref || txRef;
          if (reference) {
            await verifyAndEnroll(reference);
          }
        },
        onCancel: () => {
          toast('Payment cancelled.', { icon: 'ℹ️' });
        },
        onError: (error: any) => {
          console.error('Paystack error:', error);
          toast.error(error?.message || 'Payment failed');
        },
      });

    } catch (err: any) {
      console.error('Enrollment error:', err);
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  }, [user, selectedPayment, totalPrice, itemId, itemType, slug, discountCode, instructorLed, navigate, verifyAndEnroll]);

  return {
    enrolling,
    selectedPayment,
    setSelectedPayment,
    instructorLed,
    setInstructorLed,
    discountCode,
    setDiscountCode,
    discountInfo,
    checkingDiscount,
    checkDiscount,
    handleEnroll,
    totalPrice,
    paystackReady,
  };
}
