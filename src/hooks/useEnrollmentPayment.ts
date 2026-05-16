// // hooks/useEnrollmentPayment.ts
// /**
//  * Shared enrollment + payment hook for CourseDetail and PathDetail.
//  *
//  * Changes vs previous version
//  * ───────────────────────────────────────────────────────────────────
//  * 1. PaystackPop — was incorrectly referencing window.Paystack.
//  *    The v2 inline SDK exposes window.PaystackPop.  Fixed everywhere
//  *    (SDK ready check, guard, instantiation).  This was the root cause
//  *    of the redirect-instead-of-popup behaviour.
//  *
//  * 2. instructorLedFee prop — hook now accepts instructorLedFee directly
//  *    instead of reading window.__instructorLedFee.  Callers no longer
//  *    need the useEffect hack.
//  *
//  * 3. Modal state — isModalOpen / openModal / closeModal are now owned
//  *    by the hook so PathDetail (and any future consumer) can open the
//  *    enrollment review modal before handing off to Paystack.
//  *
//  * 4. setDiscountInfo exposed — the modal needs to reset discount state
//  *    when the user switches payment type mid-session.
//  *
//  * 5. verifyAndEnroll — after a successful payment the page state is
//  *    refreshed rather than navigated away, so the user sees the enrolled
//  *    UI without a full redirect (path-specific behaviour controlled by
//  *    onSuccess callback prop, falls back to navigate).
//  * ───────────────────────────────────────────────────────────────────
//  */

// import { useState, useCallback, useEffect } from 'react';
// import toast from 'react-hot-toast';
// import { paymentsApi, enrollmentsApi } from '@/services/api';

// /* ── Public types ───────────────────────────────────────────────────── */

// export interface PaymentOption {
//   payment_type:          string;   // 'free' | 'one_time' | 'subscription' | 'pay_as_you_go'
//   fee:                   number;
//   subscription_interval?: string;
//   access_period_days?:   number;
//   label:                 string;
// }

// export interface DiscountInfo {
//   valid:       boolean;
//   final_price: number;
//   savings:     number;
//   message:     string;
// }

// export interface UseEnrollmentPaymentProps {
//   itemId:           number;
//   itemType:         'course' | 'path';
//   slug?:            string;
//   paymentOptions:   PaymentOption[];
//   /** Pass the path/course instructor_led_fee directly — no global hack needed */
//   instructorLedFee?: number;
//   user:             any;
//   navigate:         (path: string, opts?: any) => void;
//   /**
//    * Optional: called after a successful free enroll or payment verify.
//    * If not supplied the hook navigates to /learn/:slug (course) or
//    * /my-courses (path).
//    */
//   onSuccess?:       () => void;
// }

// export interface UseEnrollmentPaymentReturn {
//   /* payment selection */
//   selectedPayment:    PaymentOption | null;
//   setSelectedPayment: (opt: PaymentOption | null) => void;
//   /* instructor-led */
//   instructorLed:      boolean;
//   setInstructorLed:   (v: boolean) => void;
//   /* discount */
//   discountCode:       string;
//   setDiscountCode:    (v: string) => void;
//   discountInfo:       DiscountInfo | null;
//   setDiscountInfo:    (info: DiscountInfo | null) => void;
//   checkingDiscount:   boolean;
//   checkDiscount:      () => Promise<void>;
//   /* prices */
//   totalPrice:         number;
//   /* enrollment */
//   enrolling:          boolean;
//   handleEnroll:       () => Promise<void>;
//   /* modal */
//   isModalOpen:        boolean;
//   openModal:          () => void;
//   closeModal:         () => void;
//   /* misc */
//   paystackReady:      boolean;
// }

// /* ── Paystack v2 SDK loader ─────────────────────────────────────────── */

// function loadPaystackSDK(): Promise<boolean> {
//   return new Promise(resolve => {
//     // v2 SDK exposes PaystackPop — not Paystack
//     if ((window as any).PaystackPop) { resolve(true); return; }

//     const SCRIPT_SRC = 'https://js.paystack.co/v2/inline.js';
//     const existing   = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
//     if (existing) {
//       existing.addEventListener('load',  () => resolve(true));
//       existing.addEventListener('error', () => resolve(false));
//       return;
//     }

//     const script    = document.createElement('script');
//     script.src      = SCRIPT_SRC;
//     script.async    = true;
//     script.onload   = () => resolve(true);
//     script.onerror  = () => resolve(false);
//     document.body.appendChild(script);
//   });
// }

// /* ── Main hook ──────────────────────────────────────────────────────── */

// export function useEnrollmentPayment({
//   itemId,
//   itemType,
//   slug,
//   paymentOptions,
//   instructorLedFee = 0,
//   user,
//   navigate,
//   onSuccess,
// }: UseEnrollmentPaymentProps): UseEnrollmentPaymentReturn {

//   const [enrolling,        setEnrolling]        = useState(false);
//   const [selectedPayment,  setSelectedPayment]  = useState<PaymentOption | null>(null);
//   const [instructorLed,    setInstructorLed]    = useState(false);
//   const [discountCode,     setDiscountCode]     = useState('');
//   const [discountInfo,     setDiscountInfo]     = useState<DiscountInfo | null>(null);
//   const [checkingDiscount, setCheckingDiscount] = useState(false);
//   const [paystackReady,    setPaystackReady]    = useState(false);
//   const [isModalOpen,      setIsModalOpen]      = useState(false);

//   /* ── Initialise selected payment from options ── */
//   useEffect(() => {
//     if (paymentOptions.length > 0 && !selectedPayment) {
//       setSelectedPayment(paymentOptions[0]);
//     }
//   }, [paymentOptions]); // intentionally omit selectedPayment to only run on options change

//   /* ── Load Paystack SDK once ── */
//   useEffect(() => {
//     loadPaystackSDK().then(setPaystackReady);
//   }, []);

//   /* ── Modal helpers ── */
//   const openModal  = useCallback(() => setIsModalOpen(true),  []);
//   const closeModal = useCallback(() => setIsModalOpen(false), []);

//   /* ── Derived price ── */
//   const discountedBase = discountInfo?.valid
//     ? discountInfo.final_price
//     : (selectedPayment?.fee ?? 0);
//   const totalPrice = discountedBase + (instructorLed ? instructorLedFee : 0);

//   /* ── Discount validation ── */
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

//   /* ── Post-payment success handler ── */
//   const handleSuccess = useCallback(() => {
//     closeModal();
//     if (onSuccess) {
//       onSuccess();
//     } else if (itemType === 'course' && slug) {
//       navigate(`/learn/${slug}`);
//     } else {
//       navigate('/my-courses');
//     }
//   }, [onSuccess, itemType, slug, navigate, closeModal]);

//   /* ── Verify payment with backend ── */
//   const verifyAndEnroll = useCallback(async (reference: string) => {
//     try {
//       const r    = await paymentsApi.verify(reference);
//       const paid = r.data?.status === 'success' || r.data?.paid === true;

//       if (paid) {
//         toast.success('Payment successful! You are now enrolled 🎉');
//         handleSuccess();
//       } else {
//         toast.error('Payment could not be verified. Contact support if you were charged.');
//       }
//     } catch (err: any) {
//       const detail = (
//         err?.response?.data?.detail ?? err?.message ?? ''
//       ).toLowerCase();

//       // Email/SMTP errors don't mean enrollment failed — swallow gracefully
//       if (
//         detail.includes('email')  ||
//         detail.includes('resend') ||
//         detail.includes('smtp')
//       ) {
//         toast.success('Enrolled! (Confirmation email may be delayed.)');
//         handleSuccess();
//       } else {
//         toast.error('Payment verification failed. Contact support if you were charged.');
//       }
//     }
//   }, [handleSuccess]);

//   /* ── Main enroll handler ── */
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
//       /* ── Free enrollment ── */
//       if (selectedPayment.payment_type === 'free' || totalPrice <= 0) {
//         if (itemType === 'path') {
//           await enrollmentsApi.enrollPath(itemId);
//         } else {
//           await enrollmentsApi.enroll(itemId);
//         }
//         toast.success('Enrolled successfully!');
//         handleSuccess();
//         return;
//       }

//       /* ── Initiate paid transaction ── */
//       const res = await paymentsApi.initiate({
//         [`${itemType}_id`]: itemId,
//         payment_type:       selectedPayment.payment_type,
//         discount_code:      discountCode || undefined,
//         instructor_led:     instructorLed,
//         // Redirect fallback — picked up by useEffect on the page if popup is blocked
//         callback_url: `${window.location.origin}${window.location.pathname}`,
//       });

//       const paymentData      = res?.data?.data || res?.data;
//       const authorizationUrl = paymentData?.authorization_url;
//       const accessCode       = paymentData?.access_code;
//       const txRef            = paymentData?.tx_ref;

//       if (!authorizationUrl) {
//         toast.error('Could not initialize payment. Please try again.');
//         return;
//       }

//       /* ── Paystack v2 inline popup ── */
//       // window.PaystackPop is the correct global exposed by the v2 SDK.
//       const PaystackPop = (window as any).PaystackPop;

//       if (!accessCode || !PaystackPop) {
//         // SDK not available or access_code missing — fall back to redirect
//         window.location.href = authorizationUrl;
//         return;
//       }

//       const popup = new PaystackPop();
//       popup.checkout({
//         accessCode,
//         onSuccess: async (transaction: any) => {
//           const reference =
//             transaction?.reference ||
//             transaction?.trxref    ||
//             txRef;
//           if (reference) {
//             await verifyAndEnroll(reference);
//           } else {
//             toast.error('Missing transaction reference after payment');
//           }
//         },
//         onCancel: () => {
//           toast('Payment cancelled.', { icon: 'ℹ️' });
//         },
//         onError: (error: any) => {
//           console.error('[Paystack] error:', error);
//           toast.error(error?.message || 'Payment failed. Please try again.');
//         },
//       });

//     } catch (err: any) {
//       console.error('[useEnrollmentPayment] handleEnroll error:', err);
//       toast.error(
//         err?.response?.data?.detail ||
//         err?.response?.data?.message ||
//         'Enrollment failed. Please try again.'
//       );
//     } finally {
//       setEnrolling(false);
//     }
//   }, [
//     user, selectedPayment, totalPrice, itemId, itemType,
//     discountCode, instructorLed, navigate,
//     verifyAndEnroll, handleSuccess,
//   ]);

//   return {
//     /* payment selection */
//     selectedPayment,
//     setSelectedPayment,
//     /* instructor-led */
//     instructorLed,
//     setInstructorLed,
//     /* discount */
//     discountCode,
//     setDiscountCode,
//     discountInfo,
//     setDiscountInfo,
//     checkingDiscount,
//     checkDiscount,
//     /* prices */
//     totalPrice,
//     /* enrollment */
//     enrolling,
//     handleEnroll,
//     /* modal */
//     isModalOpen,
//     openModal,
//     closeModal,
//     /* misc */
//     paystackReady,
//   };
// }



// v2
// hooks/useEnrollmentPayment.ts
/**
 * Shared enrollment + payment hook — CourseDetail & PathDetail.
 *
 * Key fixes in this version
 * ─────────────────────────────────────────────────────────────────────────
 * 1. isFree logic  — free enrollment is triggered ONLY when payment_type
 *    is literally "free".  The old check `totalPrice <= 0` silently treated
 *    subscription / pay_as_you_go courses whose fee column happened to be 0
 *    as free, bypassing Paystack entirely.
 *
 * 2. totalPrice    — correctly uses the resolved fee from the PaymentOption
 *    (which derivePaymentOptions already maps to subscription_fee /
 *    pay_as_you_go_fee).  No change needed here once the option's fee field
 *    is correct.
 *
 * 3. window.PaystackPop — the v2 SDK global.  Not window.Paystack.
 *
 * 4. instructorLedFee — accepted as a direct prop; window.__instructorLedFee
 *    hack removed entirely.
 *
 * 5. Modal state — isModalOpen / openModal / closeModal returned so callers
 *    that want a review step can use them (PathDetail does not need it but
 *    it is available for future use).
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { paymentsApi, enrollmentsApi } from '@/services/api';

/* ── Public types ───────────────────────────────────────────────────────── */

export interface PaymentOption {
  payment_type:           string;  // 'free' | 'one_time' | 'subscription' | 'pay_as_you_go'
  fee:                    number;  // actual charge amount for this billing model
  subscription_interval?: string;
  access_period_days?:    number;
  label:                  string;
}

export interface DiscountInfo {
  valid:        boolean;
  final_price:  number;
  savings:      number;
  message:      string;
}

export interface UseEnrollmentPaymentProps {
  itemId:            number;
  itemType:          'course' | 'path';
  slug?:             string;
  paymentOptions:    PaymentOption[];
  /** Instructor-led fee uplift — pass directly, no window global needed */
  instructorLedFee?: number;
  user:              any;
  navigate:          (path: string, opts?: any) => void;
  /**
   * Optional callback after successful enrollment.
   * Defaults: course → /learn/:slug, path → /my-courses.
   */
  onSuccess?:        () => void;
}

export interface UseEnrollmentPaymentReturn {
  selectedPayment:    PaymentOption | null;
  setSelectedPayment: (opt: PaymentOption | null) => void;
  instructorLed:      boolean;
  setInstructorLed:   (v: boolean) => void;
  discountCode:       string;
  setDiscountCode:    (v: string) => void;
  discountInfo:       DiscountInfo | null;
  setDiscountInfo:    (info: DiscountInfo | null) => void;
  checkingDiscount:   boolean;
  checkDiscount:      () => Promise<void>;
  totalPrice:         number;
  enrolling:          boolean;
  handleEnroll:       () => Promise<void>;
  isModalOpen:        boolean;
  openModal:          () => void;
  closeModal:         () => void;
  paystackReady:      boolean;
}

/* ── Paystack v2 SDK loader ─────────────────────────────────────────────── */

function loadPaystackSDK(): Promise<boolean> {
  return new Promise(resolve => {
    // The v2 SDK exposes window.PaystackPop — not window.Paystack
    if ((window as any).PaystackPop) { resolve(true); return; }

    const SRC      = 'https://js.paystack.co/v2/inline.js';
    const existing = document.querySelector(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load',  () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const s    = document.createElement('script');
    s.src      = SRC;
    s.async    = true;
    s.onload   = () => resolve(true);
    s.onerror  = () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ── Main hook ──────────────────────────────────────────────────────────── */

export function useEnrollmentPayment({
  itemId,
  itemType,
  slug,
  paymentOptions,
  instructorLedFee = 0,
  user,
  navigate,
  onSuccess,
}: UseEnrollmentPaymentProps): UseEnrollmentPaymentReturn {

  const [enrolling,        setEnrolling]        = useState(false);
  const [selectedPayment,  setSelectedPayment]  = useState<PaymentOption | null>(null);
  const [instructorLed,    setInstructorLed]    = useState(false);
  const [discountCode,     setDiscountCode]     = useState('');
  const [discountInfo,     setDiscountInfo]     = useState<DiscountInfo | null>(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [paystackReady,    setPaystackReady]    = useState(false);
  const [isModalOpen,      setIsModalOpen]      = useState(false);

  /* Initialise selected payment from first option (runs once when options arrive) */
  useEffect(() => {
    if (paymentOptions.length > 0 && !selectedPayment) {
      setSelectedPayment(paymentOptions[0]);
    }
  }, [paymentOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Load Paystack SDK */
  useEffect(() => { loadPaystackSDK().then(setPaystackReady); }, []);

  /* Modal */
  const openModal  = useCallback(() => setIsModalOpen(true),  []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  /* ── Derived total ── */
  const discountedBase = discountInfo?.valid
    ? discountInfo.final_price
    : (selectedPayment?.fee ?? 0);
  const totalPrice = discountedBase + (instructorLed ? instructorLedFee : 0);

  /* ── Discount ── */
  const checkDiscount = useCallback(async () => {
    if (!discountCode || !itemId) return;
    setCheckingDiscount(true);
    try {
      const res = await paymentsApi.validateDiscount({
        code: discountCode,
        [`${itemType}_id`]: itemId,
      });
      setDiscountInfo(res.data);
      res.data.valid
        ? toast.success(res.data.message)
        : toast.error(res.data.message);
    } catch {
      toast.error('Could not validate discount code');
    } finally {
      setCheckingDiscount(false);
    }
  }, [discountCode, itemId, itemType]);

  /* ── Post-success navigation ── */
  const handleSuccess = useCallback(() => {
    closeModal();
    if (onSuccess) {
      onSuccess();
    } else if (itemType === 'course' && slug) {
      navigate(`/learn/${slug}`);
    } else {
      navigate('/my-courses');
    }
  }, [onSuccess, itemType, slug, navigate, closeModal]);

  /* ── Verify with backend ── */
  const verifyAndEnroll = useCallback(async (reference: string) => {
    try {
      const r    = await paymentsApi.verify(reference);
      const paid = r.data?.status === 'success' || r.data?.paid === true;
      if (paid) {
        toast.success('Payment successful! You are now enrolled 🎉');
        handleSuccess();
      } else {
        toast.error('Payment could not be verified. Contact support if charged.');
      }
    } catch (err: any) {
      const detail = (err?.response?.data?.detail ?? err?.message ?? '').toLowerCase();
      // Email/SMTP failures don't mean enrollment failed — swallow gracefully
      if (detail.includes('email') || detail.includes('resend') || detail.includes('smtp')) {
        toast.success('Enrolled! (Confirmation email may be delayed.)');
        handleSuccess();
      } else {
        toast.error('Payment verification failed. Contact support if charged.');
      }
    }
  }, [handleSuccess]);

  /* ══════════════════════════════════════════════════════════════════════════
     handleEnroll
     ─────────────────────────────────────────────────────────────────────────
     FREE PATH  → payment_type === 'free' only.
                  We do NOT use totalPrice <= 0 because a subscription or
                  pay_as_you_go course that has fee=0 (misconfigured or still
                  being set up) must go through the paid path, not silently
                  enroll for free.

     PAID PATH  → initiate with backend, get access_code, open PaystackPop.
                  Falls back to window.location redirect only when access_code
                  is missing or PaystackPop hasn't loaded yet.
     ══════════════════════════════════════════════════════════════════════════ */
  const handleEnroll = useCallback(async () => {
    if (!user) { navigate('/auth/signin'); return; }
    if (!selectedPayment) { toast.error('Select a payment option'); return; }

    setEnrolling(true);
    try {

      /* ── Free enrollment ─────────────────────────────────────────────── */
      if (selectedPayment.payment_type === 'free') {
        if (itemType === 'path') {
          await enrollmentsApi.enrollPath(itemId);
        } else {
          await enrollmentsApi.enroll(itemId);
        }
        toast.success('Enrolled successfully!');
        handleSuccess();
        return;
      }

      /* ── Initiate paid transaction ───────────────────────────────────── */
      const res = await paymentsApi.initiate({
        [`${itemType}_id`]: itemId,
        payment_type:       selectedPayment.payment_type,
        discount_code:      discountCode || undefined,
        instructor_led:     instructorLed,
        callback_url:       `${window.location.origin}${window.location.pathname}`,
      });

      const paymentData      = res?.data?.data || res?.data;
      const authorizationUrl = paymentData?.authorization_url;
      const accessCode       = paymentData?.access_code;
      const txRef            = paymentData?.tx_ref;

      if (!authorizationUrl) {
        toast.error('Could not initialize payment. Please try again.');
        return;
      }

      /* ── Paystack inline v2 ──────────────────────────────────────────── */
      const PaystackPop = (window as any).PaystackPop;

      if (!accessCode || !PaystackPop) {
        // SDK not loaded or access_code missing — fall back to redirect
        window.location.href = authorizationUrl;
        return;
      }

      const popup = new PaystackPop();
      popup.checkout({
        accessCode,
        onSuccess: async (transaction: any) => {
          const reference =
            transaction?.reference ||
            transaction?.trxref    ||
            txRef;
          if (reference) {
            await verifyAndEnroll(reference);
          } else {
            toast.error('Missing transaction reference after payment');
          }
        },
        onCancel: () => {
          toast('Payment cancelled.', { icon: 'ℹ️' });
        },
        onError: (error: any) => {
          console.error('[Paystack] error:', error);
          toast.error(error?.message || 'Payment failed. Please try again.');
        },
      });

    } catch (err: any) {
      console.error('[useEnrollmentPayment] handleEnroll:', err);
      toast.error(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Enrollment failed. Please try again.'
      );
    } finally {
      setEnrolling(false);
    }
  }, [
    user, selectedPayment, totalPrice, itemId, itemType,
    discountCode, instructorLed, navigate,
    verifyAndEnroll, handleSuccess,
  ]);

  return {
    selectedPayment, setSelectedPayment,
    instructorLed,   setInstructorLed,
    discountCode,    setDiscountCode,
    discountInfo,    setDiscountInfo,
    checkingDiscount, checkDiscount,
    totalPrice,
    enrolling, handleEnroll,
    isModalOpen, openModal, closeModal,
    paystackReady,
  };
}
