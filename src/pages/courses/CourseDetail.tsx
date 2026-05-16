

// v2
/**
 * CourseDetail.tsx  v5
 *
 * Changes vs v4
 * ─────────────────────────────────────────────────────────────────────────
 * 1. INLINE PAYSTACK  — no page redirect. PaystackPop.setup() opens the
 *    Paystack popup via the official inline-js v2 SDK loaded from their CDN
 *    once on mount. Verification runs in the onSuccess callback; the user
 *    never leaves the page. The redirect fallback (useEffect watching
 *    ?reference=) is kept as a safety net for mobile browsers that block
 *    popups or when the SDK fails to load.
 *
 * 2. MULTI-PAYMENT-TYPE SELECTOR — when a course exposes more than one
 *    payment_type the user sees a pill-switcher above the price block and
 *    can choose their preferred billing model. Price, description and CTA
 *    label all update reactively. Falls back gracefully to a single option
 *    when no alternatives are offered.
 *
 * 3. INSTRUCTOR-LED TOGGLE — integrated into the pricing section so the
 *    fee uplift is correctly reflected in whichever payment mode is chosen.
 *    The "per enrollment / per billing period" copy adjusts to match.
 *
 * 4. EMAIL DECOUPLED FROM ENROLLMENT — enrollment success is determined
 *    solely by the payment/verify 2xx response. A Resend 401 (or any
 *    transient email error) that leaks into the verify response detail is
 *    caught and swallowed; the UI still transitions to "enrolled".
 *    NOTE: The authoritative fix belongs on the backend — wrap every email
 *    call in try/except and never re-raise from the enrollment/verify
 *    endpoint. This file adds a defensive frontend guard on top of that.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { coursesApi, enrollmentsApi, paymentsApi } from '@/services/api';
import { Course } from '@/types';
import { Spinner, RatingStars, Avatar } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';
import { renderContent } from '@/pages/learning/LearnPage';
import { resolveImage } from '@/utils/resolveImage';
import '@/styles/pages/courses/CourseDetail.css';

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

/**
 * One selectable billing option shown in the payment-mode pill-switcher.
 * The API may return course.available_payment_types[] directly; if not,
 * we synthesise a single-item list from the course's own fields.
 */
interface PaymentOption {
  payment_type:           string;   // 'free' | 'one_time' | 'subscription' | 'pay_as_you_go'
  fee:                    number;
  subscription_interval?: string;   // present when payment_type === 'subscription'
  access_period_days?:    number;   // present when payment_type === 'pay_as_you_go'
  label:                  string;   // short human label (e.g. "Monthly")
}

/* ═══════════════════════════════════════════════════════════
   Pure helpers
   ═══════════════════════════════════════════════════════════ */

function mediaUrl(path: string | null | undefined, folder = 'courses/thumbnails') {
  return resolveImage(path, undefined, folder) ?? undefined;
}

function courseIsReady(course: Course) {
  return (course.topics_count ?? 0) > 0;
}

function paymentTypeLabel(type: string, interval?: string): string {
  switch (type) {
    case 'free':          return 'Free';
    case 'one_time':      return 'One-time';
    case 'subscription': {
      const cap = interval
        ? interval.charAt(0).toUpperCase() + interval.slice(1)
        : 'Monthly';
      return `${cap}ly`;
    }
    case 'pay_as_you_go': return 'Pay-as-you-go';
    default:              return type;
  }
}

function paymentDescription(opt: PaymentOption): string {
  switch (opt.payment_type) {
    case 'free':
      return 'No payment required — enrol instantly and keep lifetime access.';
    case 'one_time':
      return 'Pay once and keep lifetime access to all course content.';
    case 'subscription': {
      const interval = opt.subscription_interval ?? 'monthly';
      return `Billed every ${interval}. Cancel anytime. Access continues while your subscription is active.`;
    }
    case 'pay_as_you_go': {
      const days = opt.access_period_days ?? 30;
      return `Each payment unlocks ${days} days of access. Pay again when your period expires.`;
    }
    default:
      return '';
  }
}

/**
 * Derive the selectable payment options from the course object.
 * Prefers course.available_payment_types[] if the API returns it;
 * otherwise synthesises a single-item list from the course's own fields
 * so the pill-switcher UI is always consistent.
 */
/*
function derivePaymentOptions(course: Course): PaymentOption[] {
  const raw: any[] = (course as any).available_payment_types ?? [];
  if (raw.length > 0) {
    return raw.map((r: any) => ({
      payment_type:          r.payment_type,
      fee:                   r.fee ?? 0,
      subscription_interval: r.subscription_interval,
      access_period_days:    r.access_period_days,
      label:                 paymentTypeLabel(r.payment_type, r.subscription_interval),
    }));
  }
  return [{
    payment_type:          course.payment_type,
    fee:                   course.fee,
    subscription_interval: (course as any).subscription_interval,
    access_period_days:    (course as any).access_period_days ?? 30,
    label:                 paymentTypeLabel(course.payment_type, (course as any).subscription_interval),
  }];
}
*/
// v2
// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 1 of 4 — derivePaymentOptions (~line 116)
//
// Replace the existing derivePaymentOptions function with this version.
// The fallback branch now reads subscription_fee / pay_as_you_go_fee from
// the course object (returned by the updated backend _course_dict) instead
// of always using the generic `fee` column.
// ═══════════════════════════════════════════════════════════════════════════

function derivePaymentOptions(course: Course): PaymentOption[] {
  const raw: any[] = (course as any).available_payment_types ?? [];
  if (raw.length > 0) {
    return raw.map((r: any) => ({
      payment_type:          r.payment_type,
      fee:                   Number(r.fee ?? 0),
      subscription_interval: r.subscription_interval,
      access_period_days:    r.access_period_days,
      label:                 paymentTypeLabel(r.payment_type, r.subscription_interval),
    }));
  }
 
  // Fallback: synthesise from individual course fields
  const type = course.payment_type ?? 'one_time';
  let fee: number;
 
  if (type === 'free') {
    fee = 0;
  } else if (type === 'subscription') {
    // subscription_fee is the recurring charge; fall back to fee
    fee = Number((course as any).subscription_fee || course.fee || 0);
  } else if (type === 'pay_as_you_go') {
    // pay_as_you_go_fee is the per-window charge; fall back to fee
    fee = Number((course as any).pay_as_you_go_fee || course.fee || 0);
  } else {
    fee = Number(course.fee || 0);
  }
 
  return [{
    payment_type:          type,
    fee,
    subscription_interval: (course as any).subscription_interval,
    access_period_days:    (course as any).access_period_days ?? 30,
    label:                 paymentTypeLabel(type, (course as any).subscription_interval),
  }];
}
 
/* ═══════════════════════════════════════════════════════════
   usePaystackInline
   ───────────────────────────────────────────────────────────
   Loads the Paystack inline-js v2 SDK from their CDN exactly
   once (idempotent). Exposes a single openPaystack() call
   that opens the in-page popup using a pre-created access_code.
   Falls back to window.location redirect if the SDK hasn't
   loaded by the time the user clicks.
   ═══════════════════════════════════════════════════════════ */
// function usePaystackInline() {
//   const sdkReady = useRef(false);

//   useEffect(() => {
//     // Already loaded (hot-reload / StrictMode double-run guard)
//     if (sdkReady.current || (window as any).PaystackPop) {
//       sdkReady.current = true;
//       return;
//     }
//     const script    = document.createElement('script');
//     script.src      = 'https://js.paystack.co/v2/inline.js';
//     script.async    = true;
//     script.onload   = () => { sdkReady.current = true; };
//     script.onerror  = () => console.warn('[Paystack] inline SDK failed to load — will use redirect fallback');
//     document.body.appendChild(script);
//   }, []);

//   /**
//    * Open the Paystack popup.
//    * @param authorizationUrl  Redirect fallback URL (used only when SDK is absent)
//    * @param accessCode        Pre-created transaction access_code from /payments/initiate
//    * @param onSuccess         Called with the transaction reference on payment success
//    * @param onClose           Called when the user dismisses the popup without paying
//    */
//   const openPaystack = useCallback((
//     authorizationUrl: string,
//     accessCode:       string,
//     onSuccess:        (reference: string) => void,
//     onClose:          () => void,
//   ) => {
//     const Pop = (window as any).PaystackPop;
//     if (!Pop || !accessCode) {
//       // SDK not available or no access_code — redirect flow
//       window.location.href = authorizationUrl;
//       return;
//     }
//     const handler = Pop.setup({
//       // Paystack v2 inline identifies the transaction via access_code,
//       // not by re-specifying amount/email/key here.
//       accessCode,
//       onSuccess: (transaction: any) => {
//         onSuccess(transaction.reference ?? transaction.trxref ?? '');
//       },
//       onCancel: onClose,
//     });
//     handler.openIframe();
//   }, []);

//   return { openPaystack };
// }

  // v2

/*  function usePaystackInline() {
  const sdkReady = useRef(false);

  useEffect(() => {
    if (sdkReady.current || (window as any).PaystackPop) {
      sdkReady.current = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => { sdkReady.current = true; };
    script.onerror = () => console.warn('[Paystack] inline SDK failed to load');
    document.body.appendChild(script);
  }, []);

  const openPaystack = useCallback((
    authorizationUrl: string,
    accessCode: string,
    onSuccess: (reference: string) => void,
    onClose: () => void,
  ) => {
    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop || !accessCode) {
      window.location.href = authorizationUrl;
      return;
    }

    try {
      // v2 API: instantiate then resumeTransaction
      const popup = new PaystackPop();
      popup.resumeTransaction(accessCode)
        .then((transaction: any) => {
          // Transaction completed (success or failure)
          if (transaction.status === 'success') {
            onSuccess(transaction.reference || transaction.trxref || '');
          } else {
            onClose(); // User cancelled or failed
          }
        })
        .catch((err: any) => {
          console.error('[Paystack] transaction error:', err);
          onClose();
        });
    } catch (err) {
      console.error('[Paystack] resumeTransaction failed:', err);
      window.location.href = authorizationUrl;
    }
  }, []);

  return { openPaystack };
}
*/

// v3
/*
function usePaystackInline() {
  const sdkReady = useRef(false);

  useEffect(() => {
    // Prevent duplicate script loads
    if (sdkReady.current || (window as any).PaystackPop) {
      sdkReady.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;

    script.onload = () => {
      sdkReady.current = true;
      console.log('[Paystack] SDK loaded');
    };

    script.onerror = () => {
      console.error('[Paystack] SDK failed to load');
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const openPaystack = useCallback(
    (
      email: string,
      amount: number,
      publicKey: string,
      reference: string,
      onSuccess: (reference: string) => void,
      onClose: () => void
    ) => {
      const PaystackPop = (window as any).PaystackPop;

      if (!PaystackPop) {
        toast.error('Payment SDK failed to load');
        return;
      }

      try {
        const handler = PaystackPop.setup({
          key: publicKey,
          email,
          amount: Math.round(amount * 100), // Kobo
          ref: reference,

          callback: function (response: any) {
            onSuccess(response.reference);
          },

          onClose: function () {
            onClose();
          },
        });

        handler.openIframe();

      } catch (err) {
        console.error('[Paystack] popup error:', err);
        toast.error('Could not start payment');
      }
    },
    []
  );

  return { openPaystack };
}
*/

// v4
function usePaystackInline() {
  const sdkReady = useRef(false);

  useEffect(() => {
    if (sdkReady.current || (window as any).Paystack) {
      sdkReady.current = true;
      return;
    }

    const existing = document.querySelector(
      'script[src="https://js.paystack.co/v2/inline.js"]'
    );

    if (existing) {
      sdkReady.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;

    script.onload = () => {
      sdkReady.current = true;
      console.log('[Paystack] v2 SDK loaded');
    };

    script.onerror = () => {
      console.error('[Paystack] Failed to load SDK');
    };

    document.body.appendChild(script);
  }, []);

  const openPaystack = useCallback(
    async ({
      email,
      amount,
      publicKey,
      reference,
      onSuccess,
      onClose,
      metadata,
    }: {
      email: string;
      amount: number;
      publicKey: string;
      reference: string;
      metadata?: any;
      onSuccess: (reference: string) => void;
      onClose: () => void;
    }) => {
      try {
        const Paystack = (window as any).Paystack;

        if (!Paystack) {
          throw new Error('Paystack SDK not loaded');
        }

        const popup = new Paystack();

        popup.checkout({
          key: publicKey,
          email,
          amount, // Kobo
          ref: reference,
          metadata,

          onSuccess: (transaction: any) => {
            console.log('[Paystack] success:', transaction);

            onSuccess(
              transaction.reference ||
              transaction.trxref ||
              reference
            );
          },

          onCancel: () => {
            console.log('[Paystack] cancelled');
            onClose();
          },

          onError: (error: any) => {
            console.error('[Paystack] error:', error);
            onClose();
          },
        });

      } catch (err) {
        console.error('[Paystack] checkout failed:', err);
        onClose();
      }
    },
    []
  );

  return { openPaystack };
}


/* ═══════════════════════════════════════════════════════════
   PaymentTypeSelector
   ───────────────────────────────────────────────────────────
   Compact pill-switcher rendered above the price block in the
   sidebar. Returns null when there is only one option.
   ═══════════════════════════════════════════════════════════ */
function PaymentTypeSelector({
  options,
  selected,
  onChange,
}: {
  options:  PaymentOption[];
  selected: PaymentOption;
  onChange: (opt: PaymentOption) => void;
}) {
  if (options.length <= 1) return null;

  return (
    <div className="cd-payment-selector" role="group" aria-label="Choose payment model">
      <div
        className="fw-600 mb-2"
        style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
      >
        <i className="bi bi-wallet2 me-1" />Choose how to pay
      </div>
      <div className="cd-payment-pills">
        {options.map(opt => (
          <button
            key={opt.payment_type}
            type="button"
            className={`cd-payment-pill${selected.payment_type === opt.payment_type ? ' active' : ''}`}
            onClick={() => onChange(opt)}
          >
            <span className="cd-payment-pill-label">{opt.label}</span>
            {opt.fee > 0 && (
              <span className="cd-payment-pill-price">₦{opt.fee.toLocaleString()}</span>
            )}
            {opt.fee === 0 && opt.payment_type === 'free' && (
              <span className="cd-payment-pill-price" style={{ color: 'var(--success)' }}>Free</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PreviewTopicContent — free-preview modal body
   ═══════════════════════════════════════════════════════════ */
function PreviewTopicContent({ topicId, courseId }: { topicId: number; courseId: number }) {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coursesApi
      .getTopicContent(courseId, topicId)
      .then(r => setContent(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [topicId, courseId]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <span className="spinner-border spinner-border-sm text-primary" />
      </div>
    );
  }
  const contents = content?.contents ?? [];
  if (!contents.length) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.875rem' }}>
        <i className="bi bi-tools d-block mb-2" style={{ fontSize: '1.5rem' }} />
        Content coming soon.
      </div>
    );
  }
  return <div>{contents.map((c: any) => renderContent(c))}</div>;
}

/* ═══════════════════════════════════════════════════════════
   CourseDetail — main component
   ═══════════════════════════════════════════════════════════ */
export default function CourseDetail() {
  const { slug }       = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { user }       = useAuth();
  const navigate       = useNavigate();

  const [course,       setCourse]       = useState<Course | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [enrolling,    setEnrolling]    = useState(false);
  const [openLesson,   setOpenLesson]   = useState<number | null>(0);
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<any>(null);
  const [checking,     setChecking]     = useState(false);
  const [previewTopic, setPreviewTopic] = useState<{ id: number; title: string } | null>(null);

  // ── Payment selection & instructor-led ───────────────────────────────────
  const [paymentOptions,  setPaymentOptions]  = useState<PaymentOption[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption | null>(null);
  const [instructorLed,   setInstructorLed]   = useState(false);

  const { openPaystack } = usePaystackInline();

  /* ── Load course ── */
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    coursesApi
      .get(slug)
      .then(r => {
        const c: Course = r.data;
        setCourse(c);
        const opts = derivePaymentOptions(c);
        setPaymentOptions(opts);
        setSelectedPayment(opts[0] ?? null);
      })
      .catch(() => navigate('/explore'))
      .finally(() => setLoading(false));
  }, [slug]);

  /* ── verifyAndEnroll ─────────────────────────────────────────────────────
   * Central handler called by BOTH the inline-popup onSuccess AND the
   * redirect-callback useEffect. Kept as useCallback so the reference is
   * stable across renders (the useEffect dependency array needs it stable).
   *
   * EMAIL GUARD: if the backend verify endpoint 500s solely due to an email
   * failure, the detail string will mention "email", "resend", or "smtp".
   * We treat that as a successful enrollment — the authoritative fix is to
   * wrap email sends in try/except on the backend and never re-raise.
   */
  const verifyAndEnroll = useCallback(async (reference: string) => {
    try {
      const r    = await paymentsApi.verify(reference);
      const paid = r.data?.status === 'success' || r.data?.paid === true;

      if (paid) {
        toast.success('Payment successful! You are now enrolled 🎉');
        if (slug) coursesApi.get(slug).then(r2 => setCourse(r2.data));
      } else {
        toast.error('Payment could not be verified. Contact support if you were charged.');
      }
    } catch (err: any) {
      const detail: string = (
        err?.response?.data?.detail ??
        err?.message ??
        ''
      ).toLowerCase();

      if (detail.includes('email') || detail.includes('resend') || detail.includes('smtp')) {
        // Email failure — enrollment actually succeeded; just notify gracefully
        toast.success('You are now enrolled! (Confirmation email may be delayed.)');
        if (slug) coursesApi.get(slug).then(r2 => setCourse(r2.data));
      } else {
        toast.error('Payment verification failed. Contact support if you were charged.');
      }
    } finally {
      // Strip ?reference= / ?trxref= from the URL without a full reload
      if (slug) navigate(`/courses/${slug}`, { replace: true });
    }
  }, [slug, navigate]);

  /* ── Redirect-callback safety net ────────────────────────────────────────
   * Paystack appends ?reference= when it redirects back (mobile browsers,
   * popup-blocked desktop, or SDK-absent fallback). We pick it up here.
   * Guard: only fires when reference AND slug AND course are all present so
   * this never races with the initial course load.
   */
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference || !slug || !course) return;
    verifyAndEnroll(reference);
  }, [course, searchParams, verifyAndEnroll]);

  // /* ── handleEnroll ── */

  // const handleEnroll = async () => {
  //   if (!user)            { navigate('/auth/signin'); return; }
  //   if (!course)          return;
  //   if (!selectedPayment) return;

  //   setEnrolling(true);
  //   try {
  //     // Free path — direct enrollment, no Paystack involved
  //     if (selectedPayment.payment_type === 'free' || totalPrice <= 0) {
  //       await enrollmentsApi.enroll(course.id);
  //       toast.success('Enrolled successfully!');
  //       navigate(`/learn/${course.slug}`);
  //       return;
  //     }

  //     // Paid path — initiate transaction with backend
  //     const res = await paymentsApi.initiate({
  //       course_id:      course.id,
  //       payment_type:   selectedPayment.payment_type,
  //       discount_code:  discountCode || undefined,
  //       instructor_led: instructorLed,
  //       // Redirect fallback — lands back here where the useEffect picks up ?reference=
  //       callback_url:   `${window.location.origin}/courses/${course.slug}`,
  //     });

  //     const authUrl    = res.data?.authorization_url ?? res.data?.data?.authorization_url;
  //     const accessCode = res.data?.access_code       ?? res.data?.data?.access_code;

  //     if (!authUrl) {
  //       toast.error('Could not retrieve payment URL. Please try again.');
  //       return;
  //     }

  //     // Open inline popup; SDK falls back to redirect if absent
  //     openPaystack(
  //       authUrl,
  //       accessCode ?? '',
  //       (reference) => verifyAndEnroll(reference),
  //       ()          => toast('Payment cancelled.', { icon: 'ℹ️' }),
  //     );

  //   } catch (err: any) {
  //     toast.error(err.response?.data?.detail || 'Enrollment failed');
  //   } finally {
  //     setEnrolling(false);
  //   }
  // };

  // v2
  /* ──────────────────────────────────────────────────────────────
 * handleEnroll — Paystack Inline v2
 * Uses:
 *   https://js.paystack.co/v2/inline.js
 *
 * Backend MUST return:
 *   {
 *     authorization_url,
 *     access_code,
 *     tx_ref
 *   }
 * ────────────────────────────────────────────────────────────── */

const handleEnroll = async () => {
  if (!user) {
    navigate('/auth/signin');
    return;
  }

  if (!course) {
    toast.error('Course not found');
    return;
  }

  if (!selectedPayment) {
    toast.error('Please select a payment option');
    return;
  }

  setEnrolling(true);

  try {
    /* ──────────────────────────────────────────────────────────
     * FREE ENROLLMENT
     * ────────────────────────────────────────────────────────── */
    // if (
    //   selectedPayment.payment_type === 'free' ||
    //   Number(totalPrice) <= 0
    // ) {
    // v2
        if (selectedPayment.payment_type === 'free') {
    // Only explicitly free courses skip Paystack.
    // totalPrice <= 0 is NOT a safe free-enrollment trigger:
    // a misconfigured subscription/PAYG with fee=0 would bypass payment.
 
      await enrollmentsApi.enroll(course.id);

      toast.success('Enrolled successfully!');

      navigate(`/learn/${course.slug}`);

      return;
    }

    /* ──────────────────────────────────────────────────────────
     * INITIATE PAYMENT
     * ────────────────────────────────────────────────────────── */
    const res = await paymentsApi.initiate({
      course_id: course.id,
      payment_type: selectedPayment.payment_type,
      discount_code: discountCode || undefined,
      instructor_led: instructorLed,

      // Redirect fallback only
      callback_url: `${window.location.origin}/courses/${course.slug}`,
    });

    /*
     * Your backend wraps payload in api_response(...)
     * so actual data is usually res.data.data
     */
    const paymentData = res?.data?.data || res?.data;

    const authorizationUrl = paymentData?.authorization_url;
    const accessCode       = paymentData?.access_code;
    const txRef            = paymentData?.tx_ref;

    /* ──────────────────────────────────────────────────────────
     * BACKEND VALIDATION
     * ────────────────────────────────────────────────────────── */
    if (!authorizationUrl) {
      toast.error('Could not initialize payment');
      return;
    }

    /*
     * Paystack v2 REQUIRES access_code
     * Without it Paystack redirects instead of popup
     */
    if (!accessCode) {
      console.error('Missing Paystack access_code', paymentData);

      toast.error(
        'Payment initialization incomplete. Please try again.'
      );

      return;
    }

    /*
     * Ensure SDK exists
     */
    if (!(window as any).PaystackPop) {
      toast.error(
        'Payment SDK failed to load. Refresh the page and try again.'
      );

      return;
    }

    /* ──────────────────────────────────────────────────────────
     * PAYSTACK INLINE V2
     * ────────────────────────────────────────────────────────── */
    const popup = new (window as any).PaystackPop();

    popup.checkout({
      accessCode,

      /* ────────────────────────────────────────────────────────
       * SUCCESS
       * ──────────────────────────────────────────────────────── */
      onSuccess: async (transaction: any) => {
        try {
          const reference =
            transaction?.reference ||
            transaction?.trxref ||
            txRef;

          if (!reference) {
            toast.error('Missing transaction reference');
            return;
          }

          /*
           * Verify on backend
           */
          await paymentsApi.verify(reference);

          toast.success('Payment successful!');

          navigate(`/learn/${course.slug}`);

        } catch (verifyErr: any) {
          console.error('Verify error:', verifyErr);

          toast.error(
            verifyErr?.response?.data?.detail ||
            'Payment verification failed'
          );
        }
      },

      /* ────────────────────────────────────────────────────────
       * USER CLOSED POPUP
       * ──────────────────────────────────────────────────────── */
      onCancel: () => {
        toast('Payment cancelled.', {
          icon: 'ℹ️',
        });
      },

      /* ────────────────────────────────────────────────────────
       * PAYSTACK ERROR
       * ──────────────────────────────────────────────────────── */
      onError: (error: any) => {
        console.error('Paystack error:', error);

        toast.error(
          error?.message ||
          'Payment failed. Please try again.'
        );
      },
    });

  } catch (err: any) {
    console.error('Enrollment error:', err);

    toast.error(
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      'Enrollment failed'
    );

  } finally {
    setEnrolling(false);
  }
};


  /* ── Discount code ── */
  const checkDiscount = async () => {
    if (!discountCode || !course) return;
    setChecking(true);
    try {
      const res = await paymentsApi.validateDiscount({ code: discountCode, course_id: course.id });
      setDiscountInfo(res.data);
      res.data.valid ? toast.success(res.data.message) : toast.error(res.data.message);
    } catch {
      toast.error('Could not validate code');
    } finally { setChecking(false); }
  };

  /* ── Guards ── */
  if (loading) return <Spinner />;
  if (!course || !selectedPayment) return null;

  /* ── Derived values ── */
  // const isFree     = selectedPayment.payment_type === 'free' || selectedPayment.fee === 0;
  // v2
  const isFree = selectedPayment.payment_type === 'free';
  // NOTE: Do NOT use `selectedPayment.fee === 0` here.
  // A subscription or pay_as_you_go course whose generic fee column is 0
  // (because its actual charge lives in subscription_fee / pay_as_you_go_fee)
  // must go through the Paystack paid flow, not silently enroll for free.
 
 
  const isEnrolled = !!course.is_enrolled;
  const isReady    = courseIsReady(course);
  const progress   = course.progress_pct ?? 0;

  const instructorLedFee: number = (course as any).instructor_led_fee ?? 0;
  const hasInstructorOption      = instructorLedFee > 0;

  const discountedBase: number = discountInfo?.valid
    ? discountInfo.final_price
    : selectedPayment.fee;
  const totalPrice: number = discountedBase + (instructorLed ? instructorLedFee : 0);

  const payDesc  = paymentDescription(selectedPayment);
  const thumbSrc = mediaUrl(course.thumbnail);

  const learnItems   = (course.what_you_learn ?? '').split('\n').map(s => s.trim()).filter(Boolean);
  const requirements = (course.requirements   ?? '').split('\n').map(s => s.trim()).filter(Boolean);

  const includes = [
    { icon: 'bi-collection',        label: `${course.lessons_count ?? 0} lessons`  },
    { icon: 'bi-file-earmark-play', label: `${course.topics_count  ?? 0} topics`   },
    ...(course.duration_weeks
      ? [{ icon: 'bi-clock', label: `${course.duration_weeks} weeks` }]
      : []),
    ...(selectedPayment.payment_type === 'pay_as_you_go' && (course as any).weekly_topic_limit
      ? [{ icon: 'bi-bar-chart-steps', label: `Up to ${(course as any).weekly_topic_limit} topics/week` }]
      : []),
    { icon: 'bi-phone', label: 'Mobile & desktop access' },
    { icon: 'bi-award', label: 'Certificate on completion' },
  ];

  /* ─────────────────────────────────────────────────────────────────────────
     Sub-components — defined inside render so they close over derived state.
     They are stable per render cycle; React will not remount them.
  ───────────────────────────────────────────────────────────────────────── */

  const Thumbnail = () => {
    if (course.preview_video) {
      return (
        <div className="cd-preview-video-wrap">
          <video controls poster={thumbSrc}>
            <source src={course.preview_video} />
          </video>
        </div>
      );
    }
    if (thumbSrc) {
      return (
        <img
          src={thumbSrc}
          alt={course.title}
          className="cd-thumb"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      );
    }
    return (
      <div className="cd-thumb-placeholder" aria-hidden="true">
        <i className="bi bi-play-circle cd-thumb-placeholder-icon" />
        <span className="cd-thumb-placeholder-label">Course Preview</span>
      </div>
    );
  };

  /* ── Price block ── */
  const PriceBlock = ({ compact = false }: { compact?: boolean }) => {
    if (isFree && !instructorLed) {
      return compact ? (
        <div className="cd-sticky-price">
          <span className="cd-sticky-price-main" style={{ color: 'var(--success)' }}>Free</span>
        </div>
      ) : (
        <div className="cd-price-block">
          <span className="cd-free-badge"><i className="bi bi-lightning-fill me-1" />Free</span>
          {hasInstructorOption && !isEnrolled && (
            <div className="cd-price-type" style={{ marginTop: '0.25rem' }}>
              + ₦{instructorLedFee.toLocaleString()} for instructor-led
            </div>
          )}
        </div>
      );
    }

    if (compact) {
      return (
        <div className="cd-sticky-price">
          <span className="cd-sticky-price-main">₦{totalPrice.toLocaleString()}</span>
          {(discountInfo?.valid || instructorLed) && (
            <span className="cd-sticky-price-orig">₦{selectedPayment.fee.toLocaleString()}</span>
          )}
          <span className="cd-sticky-price-type">{selectedPayment.label}</span>
        </div>
      );
    }

    return (
      <div className="cd-price-block">
        <span className="cd-price-main">
          ₦{totalPrice.toLocaleString()}
          {(discountInfo?.valid || instructorLed) && (
            <span className="cd-price-original">₦{selectedPayment.fee.toLocaleString()}</span>
          )}
        </span>

        {selectedPayment.payment_type === 'subscription' && (
          <div className="cd-price-type" style={{ marginTop: '0.1rem' }}>
            per {selectedPayment.subscription_interval ?? 'month'}
          </div>
        )}
        {selectedPayment.payment_type === 'pay_as_you_go' && (
          <div className="cd-price-type" style={{ marginTop: '0.1rem' }}>
            per {selectedPayment.access_period_days ?? 30} days
          </div>
        )}

        {discountInfo?.valid && (
          <div className="cd-price-savings">You save ₦{discountInfo.savings.toLocaleString()}</div>
        )}

        {/* Instructor-led fee breakdown */}
        {instructorLed && instructorLedFee > 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Base ₦{discountedBase.toLocaleString()} + instructor ₦{instructorLedFee.toLocaleString()}
          </div>
        )}

        {/* Payment type label + description */}
        <div className="cd-price-type">{selectedPayment.label}</div>
        {payDesc && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
            {payDesc}
          </div>
        )}
      </div>
    );
  };

  /* ── CTA button ── */
  const CtaButton = ({ variant = 'card' }: { variant?: 'card' | 'sticky' }) => {
    const cls      = variant === 'sticky' ? 'cd-sticky-btn' : 'cd-cta-btn';
    const spinning = (
      <>
        <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
        {' '}Processing…
      </>
    );

    if (isEnrolled) {
      return (
        <Link to={`/learn/${course.slug}`} className={`${cls} success`}>
          <i className="bi bi-play-fill" />
          Continue Learning
          {progress > 0 && (
            <span className="ms-1 opacity-75" style={{ fontSize: '0.8em' }}>{progress}%</span>
          )}
        </Link>
      );
    }

    if (!isReady) {
      return (
        <button className={`${cls} ${variant === 'sticky' ? 'disabled-state' : 'disabled'}`} disabled>
          <i className="bi bi-hourglass-split" />
          Coming Soon
        </button>
      );
    }

    return (
      <button
        className={`${cls} primary btn-primary`}
        onClick={handleEnroll}
        disabled={enrolling}
      >
        {enrolling ? spinning : (
          <>
            <i className={`bi ${isFree ? 'bi-lightning-fill' : 'bi-lock-fill'}`} />
            {isFree
              ? 'Enroll for Free'
              : `Enroll · ₦${totalPrice.toLocaleString()}`}
          </>
        )}
      </button>
    );
  };

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="cd-root fade-in">

      {/* Breadcrumb */}
      <nav className="cd-breadcrumb" aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/explore">Courses</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{course.title}</li>
        </ol>
      </nav>

      <div className="row g-4">

        {/* ════════════ Main column ════════════ */}
        <div className="col-lg-8">

          {/* Hero */}
          <div className="cd-header">
            <div className="cd-badges">
              {(course.categories || []).map((c: any) => (
                <span key={c.id} className="cd-cat-badge">{c.title}</span>
              ))}
              {course.level && (
                <span className={`badge-level ${course.level}`}>{course.level}</span>
              )}
              {course.featured && <span className="cd-badge-featured">Featured</span>}
            </div>

            <h1 className="cd-title">{course.title}</h1>
            {course.short_description && (
              <p className="cd-short-desc">{course.short_description}</p>
            )}

            <div className="cd-meta">
              {course.avg_rating != null && (
                <div className="cd-meta-item">
                  <span className="cd-rating-val">{course.avg_rating}</span>
                  <RatingStars rating={course.avg_rating} />
                </div>
              )}
              <span className="cd-meta-item">
                <i className="bi bi-people" />{course.enrolled_count ?? 0} enrolled
              </span>
              <span className="cd-meta-item">
                <i className="bi bi-book" />{course.lessons_count ?? 0} lessons
              </span>
              {course.duration_weeks && (
                <span className="cd-meta-item">
                  <i className="bi bi-clock" />{course.duration_weeks} weeks
                </span>
              )}
              {course.lang && (
                <span className="cd-meta-item">
                  <i className="bi bi-translate" />{course.lang.toUpperCase()}
                </span>
              )}
            </div>

            {course.creator && (
              <div className="cd-creator">
                <Avatar image={course.creator.image} name={course.creator.name} size={36} />
                <div>
                  <div className="cd-creator-name">{course.creator.name}</div>
                  <div className="cd-creator-role">Course Creator</div>
                </div>
              </div>
            )}
          </div>

          {/* Instructors */}
          {course.tutors && course.tutors.length > 0 && (
            <div className="cd-section-card cd-card-pad">
              <h6>
                <i className="bi bi-person-video3 text-primary" />
                {' '}Assigned Instructor{course.tutors.length > 1 ? 's' : ''}
              </h6>
              <div className="cd-instructors-list">
                {course.tutors.map((t: any) => (
                  <div key={t.id} className="cd-instructor-item">
                    <Avatar image={t.image} name={t.name} size={36} />
                    <div>
                      <div className="cd-instructor-name">{t.name}</div>
                      <div className="cd-instructor-role">Instructor</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What you'll learn */}
          {learnItems.length > 0 && (
            <div className="cd-section-card cd-card-pad">
              <h5><i className="bi bi-lightbulb text-warning" />{' '}What You'll Learn</h5>
              <div className="cd-learn-grid">
                {learnItems.map((item, i) => (
                  <div key={i} className="cd-learn-item">
                    <i className="bi bi-check-circle-fill" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curriculum */}
          <div className="cd-section-card cd-curriculum-card">
            <div className="cd-curriculum-header">
              <h5 className="mb-0">
                <i className="bi bi-list-ol text-primary" />{' '}Curriculum
              </h5>
              <span className="cd-count">
                {course.lessons_count ?? 0} lessons · {course.topics_count ?? 0} topics
              </span>
            </div>

            {(course.lessons || []).length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <i className="bi bi-inbox d-block mb-2" style={{ fontSize: '1.5rem' }} />
                Curriculum hasn't been added yet.
              </div>
            ) : (
              (course.lessons || []).map((lesson: any, li: number) => (
                <div key={lesson.id}>
                  <button
                    className="cd-lesson-btn"
                    onClick={() => setOpenLesson(openLesson === li ? null : li)}
                    aria-expanded={openLesson === li}
                  >
                    <span className="cd-lesson-btn-left">
                      <i className="bi bi-collection text-primary" />
                      {lesson.title}
                    </span>
                    <span className="cd-lesson-btn-right">
                      {(lesson.topics || []).length} topics
                      <i className={`bi ${openLesson === li ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                    </span>
                  </button>

                  {openLesson === li && (lesson.topics || []).map((topic: any) => (
                    <div key={topic.id} className="cd-topic-row">
                      {isEnrolled ? (
                        <Link
                          to={`/learn/${course.slug}`}
                          className="cd-topic-preview-link"
                          style={{ display: 'flex', alignItems: 'center', gap: '.4rem', textDecoration: 'none', color: 'inherit', flex: 1 }}
                        >
                          <i className="bi bi-play-circle text-primary" style={{ flexShrink: 0 }} />
                          <span className="cd-topic-title">{topic.title}</span>
                          {topic.duration_minutes && (
                            <span className="cd-topic-duration ms-auto">{topic.duration_minutes}m</span>
                          )}
                        </Link>
                      ) : topic.is_free_preview ? (
                        <button
                          className="cd-topic-preview-link"
                          onClick={() => setPreviewTopic({ id: topic.id, title: topic.title })}
                          style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', flex: 1, textAlign: 'left', padding: 0 }}
                        >
                          <i className="bi bi-play-circle-fill" style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span className="cd-topic-title">{topic.title}</span>
                          {topic.duration_minutes && (
                            <span className="cd-topic-duration">{topic.duration_minutes}m</span>
                          )}
                          <span className="cd-preview-badge ms-auto">Free Preview</span>
                        </button>
                      ) : (
                        <>
                          <i className="bi bi-lock" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span className="cd-topic-title">{topic.title}</span>
                          {topic.duration_minutes && (
                            <span className="cd-topic-duration">{topic.duration_minutes}m</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Requirements */}
          {requirements.length > 0 && (
            <div className="cd-section-card cd-card-pad">
              <h5>Requirements</h5>
              <ul className="cd-req-list">
                {requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

        </div>
        {/* ── end col-lg-8 ── */}

        {/* ════════════ Sidebar ════════════ */}
        <div className="col-lg-4">
          <div className="cd-enroll-card">

            <Thumbnail />

            <div className="cd-enroll-body">

              {/* ── Payment mode selector ─────────────────────────────────
               *  Rendered only for unenrolled users on a ready course.
               *  Selecting a pill updates selectedPayment which drives the
               *  price, description, CTA label, and discount field.
               *  Resets any applied discount code on switch — the previous
               *  discount was validated against the old payment type / price.
               */}
              {!isEnrolled && isReady && (
                <PaymentTypeSelector
                  options={paymentOptions}
                  selected={selectedPayment}
                  onChange={opt => {
                    setSelectedPayment(opt);
                    setDiscountInfo(null);
                    setDiscountCode('');
                  }}
                />
              )}

              {/* Price + CTA */}
              <div className="cd-price-cta-row">
                <PriceBlock compact={false} />
                <CtaButton variant="card" />
              </div>

              {/* ── Instructor-led toggle ──────────────────────────────────
               *  Visible when instructor_led_fee > 0 and the user has not
               *  yet enrolled and the course has content.
               *  Works across all payment types — the uplift is added on
               *  top of whichever billing model is selected.
               *  The "per enrollment / per billing period" copy adjusts
               *  to match the selected payment_type.
               */}
              {hasInstructorOption && !isEnrolled && isReady && (
                <div className="cd-instructor-led-toggle">
                  <label
                    htmlFor="cd-il-toggle"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}
                  >
                    <input
                      id="cd-il-toggle"
                      type="checkbox"
                      className="form-check-input mt-1"
                      checked={instructorLed}
                      onChange={e => setInstructorLed(e.target.checked)}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        <i className="bi bi-person-video3 me-1 text-primary" />
                        Instructor-led learning
                        <span
                          className="badge bg-primary ms-2"
                          style={{ fontSize: '0.65rem', verticalAlign: 'middle' }}
                        >
                          +₦{instructorLedFee.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>
                        Get live sessions and direct feedback from an instructor.
                        Additional fee applies per{' '}
                        {selectedPayment.payment_type === 'one_time' ? 'enrollment' : 'billing period'}.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Not-ready notice */}
              {!isReady && !isEnrolled && (
                <div className="cd-not-ready-notice">
                  <i className="bi bi-hourglass-split" />
                  <div className="cd-not-ready-notice-text">
                    <strong>Content coming soon</strong>
                    The instructor is still preparing this course.
                  </div>
                </div>
              )}

              {/* Discount code — hidden when free mode is selected */}
              {selectedPayment.payment_type !== 'free' && !isEnrolled && isReady && (
                <div className="cd-discount-row">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Discount code"
                    value={discountCode}
                    onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && checkDiscount()}
                  />
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={checkDiscount}
                    disabled={checking || !discountCode}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {checking ? <span className="spinner-border spinner-border-sm" /> : 'Apply'}
                  </button>
                </div>
              )}

              {/* Course includes */}
              <div className="cd-includes">
                {includes.map((item, i) => (
                  <div key={i} className="cd-include-item">
                    <i className={`bi ${item.icon}`} />
                    {item.label}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
        {/* ── end col-lg-4 ── */}

      </div>

      {/* ══ Mobile sticky CTA ══ */}
      <div className="cd-sticky-cta" role="region" aria-label="Quick enroll">
        {isEnrolled ? (
          <div className="cd-sticky-price">
            <span
              className="cd-sticky-price-main"
              style={{ color: 'var(--success)', fontSize: '0.8rem' }}
            >
              Enrolled{progress > 0 ? ` · ${progress}%` : ''}
            </span>
          </div>
        ) : (
          <PriceBlock compact />
        )}
        <CtaButton variant="sticky" />
      </div>

      {/* ══ Free-preview modal ══ */}
      {previewTopic && (
        <div className="cd-preview-modal-overlay" onClick={() => setPreviewTopic(null)}>
          <div className="cd-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-preview-modal-header">
              <div>
                <div className="cd-preview-badge" style={{ marginBottom: '.4rem' }}>Free Preview</div>
                <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{previewTopic.title}</h5>
              </div>
              <button className="cd-preview-modal-close" onClick={() => setPreviewTopic(null)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="cd-preview-modal-body">
              <PreviewTopicContent topicId={previewTopic.id} courseId={course.id} />
            </div>
            <div className="cd-preview-modal-footer">
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', margin: 0 }}>
                This is a free preview. Enroll for full access.
              </p>
              <button
                className="cd-cta-btn primary"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                <i className="bi bi-lightning-fill" />
                {isFree ? 'Enroll for Free' : `Enroll · ₦${totalPrice.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
