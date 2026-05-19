// hooks/useEnrollmentPayment.ts
/**
 * Shared enrollment + Paystack hook used by CourseDetail and PathDetail.
 *
 * Supports all four billing models that a student may select:
 *   free           → direct enrollment, no Paystack
 *   one_time       → single Paystack charge
 *   subscription   → recurring Paystack charge (plan-linked)
 *   pay_as_you_go  → per-window Paystack charge
 *
 * Key design decisions
 * ─────────────────────────────────────────────────────────────────────────
 * • isFree = payment_type === 'free' ONLY.
 *   Never `fee === 0` or `totalPrice <= 0` — a subscription/PAYG whose
 *   fee column is 0 (misconfigured or still being set up) must go through
 *   Paystack, not silently skip it.
 *
 * • window.PaystackPop — the correct v2 SDK global (not window.Paystack).
 *
 * • instructorLedFee passed as prop — window.__instructorLedFee hack gone.
 *
 * • selectedPayment drives totalPrice — the fee on the PaymentOption
 *   already reflects the real charge for that model (subscription_fee /
 *   pay_as_you_go_fee / fee), resolved by the backend and passed through
 *   derivePaymentOptions on the page.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { paymentsApi, enrollmentsApi } from '@/services/api';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface PaymentOption {
  payment_type:           string;   // 'free' | 'one_time' | 'subscription' | 'pay_as_you_go'
  fee:                    number;   // actual charge for this billing model
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
  instructorLedFee?: number;
  user:              any;
  navigate:          (path: string, opts?: any) => void;
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
  isFree:             boolean;
  enrolling:          boolean;
  handleEnroll:       () => Promise<void>;
  isModalOpen:        boolean;
  openModal:          () => void;
  closeModal:         () => void;
  paystackReady:      boolean;
}

/* ── SDK loader ─────────────────────────────────────────────────────────── */

function loadPaystackSDK(): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as any).PaystackPop) { resolve(true); return; }
    const SRC = 'https://js.paystack.co/v2/inline.js';
    const existing = document.querySelector(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load',  () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s  = document.createElement('script');
    s.src    = SRC; s.async = true;
    s.onload = () => resolve(true);
    s.onerror= () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ── Hook ───────────────────────────────────────────────────────────────── */

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

  /* Initialise from first option when options arrive */
  useEffect(() => {
    if (paymentOptions.length > 0 && !selectedPayment) {
      setSelectedPayment(paymentOptions[0]);
    }
  }, [paymentOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadPaystackSDK().then(setPaystackReady); }, []);

  const openModal  = useCallback(() => setIsModalOpen(true),  []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  /* Derived */
  const discountedBase = discountInfo?.valid
    ? discountInfo.final_price
    : (selectedPayment?.fee ?? 0);
  const totalPrice = discountedBase + (instructorLed ? instructorLedFee : 0);

  /* isFree — payment_type === 'free' ONLY */
  const isFree = selectedPayment?.payment_type === 'free';

  /* Discount */
  const checkDiscount = useCallback(async () => {
    if (!discountCode || !itemId) return;
    setCheckingDiscount(true);
    try {
      const res = await paymentsApi.validateDiscount({
        code: discountCode,
        [`${itemType}_id`]: itemId,
      });
      setDiscountInfo(res.data);
      res.data.valid ? toast.success(res.data.message) : toast.error(res.data.message);
    } catch {
      toast.error('Could not validate discount code');
    } finally {
      setCheckingDiscount(false);
    }
  }, [discountCode, itemId, itemType]);

  /* Post-success */
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

  /* Verify with backend */
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
      if (detail.includes('email') || detail.includes('resend') || detail.includes('smtp')) {
        toast.success('Enrolled! (Confirmation email may be delayed.)');
        handleSuccess();
      } else {
        toast.error('Payment verification failed. Contact support if charged.');
      }
    }
  }, [handleSuccess]);

  /* ══════════════════════════════════════════════════════════════════════
     handleEnroll
     ─────────────────────────────────────────────────────────────────────
     Free  → payment_type === 'free'. Direct enrollment, no Paystack.
     Paid  → initiate with backend (sends payment_type so the backend
             knows whether to create a plan, PAYG charge, or one-time).
             Backend returns access_code → PaystackPop.checkout().
     ══════════════════════════════════════════════════════════════════════ */
  const handleEnroll = useCallback(async () => {
    if (!user)            { navigate('/auth/signin'); return; }
    if (!selectedPayment) { toast.error('Select a payment option'); return; }

    setEnrolling(true);
    try {

      /* ── Free enrollment ──────────────────────────────────────────── */
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

      /* ── Paid: initiate ───────────────────────────────────────────── */
      const res = await paymentsApi.initiate({
        [`${itemType}_id`]:  itemId,
        payment_type:         selectedPayment.payment_type,    // tells backend which model
        discount_code:        discountCode || undefined,
        instructor_led:       instructorLed,
        // subscription extras
        subscription_interval: selectedPayment.subscription_interval,
        // PAYG extras
        access_period_days:   selectedPayment.access_period_days,
        // Redirect fallback for mobile/popup-blocked
        callback_url: `${window.location.origin}${window.location.pathname}`,
      });

      const paymentData      = res?.data?.data || res?.data;
      const authorizationUrl = paymentData?.authorization_url;
      const accessCode       = paymentData?.access_code;
      const txRef            = paymentData?.tx_ref;

      if (!authorizationUrl) {
        toast.error('Could not initialize payment. Please try again.');
        return;
      }

      /* ── Paystack inline v2 ───────────────────────────────────────── */
      const PaystackPop = (window as any).PaystackPop;

      if (!accessCode || !PaystackPop) {
        // SDK not ready or no access_code — redirect fallback
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
        'Enrollment failed. Please try again.',
      );
    } finally {
      setEnrolling(false);
    }
  }, [
    user, selectedPayment, itemId, itemType,
    discountCode, instructorLed, navigate,
    verifyAndEnroll, handleSuccess,
  ]);

  return {
    selectedPayment, setSelectedPayment,
    instructorLed,   setInstructorLed,
    discountCode,    setDiscountCode,
    discountInfo,    setDiscountInfo,
    checkingDiscount, checkDiscount,
    totalPrice, isFree,
    enrolling, handleEnroll,
    isModalOpen, openModal, closeModal,
    paystackReady,
  };
}
