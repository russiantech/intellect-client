// /**
//  * CourseDetail.tsx  v5
//  *
//  * Changes vs v4
//  * ─────────────────────────────────────────────────────────────────
//  * 1. INLINE PAYSTACK POPUP
//  *    Uses the Paystack inline JS SDK (@paystack/inline-js) so the
//  *    payment sheet opens as an overlay — no redirect away from the page.
//  *    Verification runs immediately in the onSuccess callback.
//  *    Falls back to authorization_url redirect if the SDK is unavailable.
//  *
//  * 2. PAYMENT TYPE SWITCHER
//  *    When a course supports multiple billing modes (e.g. one_time AND
//  *    subscription, or pay_as_you_go), students see a compact pill-tab
//  *    selector in the sidebar and the price + description update
//  *    reactively.  The switcher only renders when the course exposes
//  *    more than one available payment type.
//  *
//  * 3. INSTRUCTOR-LED TOGGLE — CONSISTENT WITH BILLING MODE
//  *    The "+₦X" badge and footer copy now reflect the currently-selected
//  *    payment type (per enrollment / per billing period / per access
//  *    period) so the student always knows exactly what they will pay.
//  *
//  * 4. EMAIL FAILURE DOES NOT BLOCK ENROLLMENT
//  *    paymentsApi.verify() response is treated as successful whenever
//  *    r.data.paid === true OR r.data.status === 'success', regardless
//  *    of any email_sent / notification fields.  The backend must also be
//  *    fixed to swallow email errors (see note below), but this ensures
//  *    the frontend never shows an error to an already-charged student.
//  *
//  * 5. All existing v4 functionality preserved:
//  *    - Free-preview topic modal
//  *    - Discount code
//  *    - Progress display for enrolled users
//  *    - Mobile sticky CTA
//  *    - Breadcrumb
//  *    - Instructor / tutor section
//  * ─────────────────────────────────────────────────────────────────
//  *
//  * BACKEND NOTE (email):
//  *   In app/services/payment_service.py (or wherever verify() is
//  *   called), wrap the email dispatch in try/except and log the error
//  *   rather than re-raising it:
//  *
//  *     try:
//  *         await email_service.send_enrollment_confirmation(...)
//  *     except Exception as exc:
//  *         logger.error("Enrollment email failed (non-fatal): %s", exc)
//  *
//  *   This ensures a Resend API key issue never causes a 500 on a
//  *   payment that Paystack has already settled.
//  */

// import { useState, useEffect, useCallback } from 'react';
// import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { coursesApi, enrollmentsApi, paymentsApi } from '@/services/api';
// import { Course } from '@/types';
// import { Spinner, RatingStars, Avatar } from '@/components/shared/index';
// import { useAuth } from '@/context/AuthContext';
// import { renderContent } from '@/pages/learning/LearnPage';
// import { resolveImage } from '@/utils/resolveImage';
// import '@/styles/pages/courses/CourseDetail.css';

// /* ═══════════════════════════════════════════════════════════
//    Types
//    ═══════════════════════════════════════════════════════════ */

// type PaymentType = 'free' | 'one_time' | 'subscription' | 'pay_as_you_go';

// /** Shape Paystack inline JS exposes via window.PaystackPop */
// interface PaystackPopOptions {
//   key:          string;
//   email:        string;
//   amount:       number;   // kobo
//   reference:    string;
//   currency?:    string;
//   onSuccess:    (transaction: { reference: string }) => void;
//   onCancel:     () => void;
// }
// interface PaystackPop {
//   setup(opts: PaystackPopOptions): { openIframe(): void };
// }
// declare global {
//   interface Window { PaystackPop?: PaystackPop; }
// }

// /* ═══════════════════════════════════════════════════════════
//    Helpers
//    ═══════════════════════════════════════════════════════════ */

// function mediaUrl(path: string | null | undefined, folder = 'courses/thumbnails') {
//   return resolveImage(path, undefined, folder) ?? undefined;
// }

// /**
//  * All payment types a course can be purchased with.
//  * The course model stores ONE canonical payment_type, but the
//  * available_payment_types array (if present) lets admins expose
//  * multiple options.  Fall back to the single type when absent.
//  */
// function availablePaymentTypes(course: Course): PaymentType[] {
//   const extra = (course as any).available_payment_types as PaymentType[] | undefined;
//   if (extra && extra.length > 0) return extra;
//   return [course.payment_type as PaymentType];
// }

// /** Human label for a payment type */
// function paymentTypeLabel(type: PaymentType, interval?: string | null): string {
//   switch (type) {
//     case 'free':         return 'Free';
//     case 'one_time':     return 'One-time';
//     case 'subscription': {
//       const cap = (interval ?? 'monthly');
//       return `${cap.charAt(0).toUpperCase()}${cap.slice(1)}ly`;
//     }
//     case 'pay_as_you_go': return 'Pay-as-you-go';
//   }
// }

// /** One-liner description shown below the price */
// function paymentTypeDescription(
//   type: PaymentType,
//   course: Course,
// ): string {
//   switch (type) {
//     case 'free':
//       return 'No payment required — enrol instantly.';
//     case 'one_time':
//       return 'Pay once, keep lifetime access to all course content.';
//     case 'subscription': {
//       const interval = course.subscription_interval ?? 'monthly';
//       return `Billed every ${interval}. Cancel anytime. Access is active while your subscription is.`;
//     }
//     case 'pay_as_you_go': {
//       const days = (course as any).access_period_days ?? 30;
//       const wLimit = (course as any).weekly_topic_limit;
//       const extra = wLimit ? ` Up to ${wLimit} topics/week.` : '';
//       return `Each payment unlocks ${days} days of access.${extra} Pay again to continue.`;
//     }
//   }
// }

// /**
//  * Effective price for the chosen payment type.
//  * subscription/pay_as_you_go may have their own fee stored in
//  * subscription_plans[].  We fall back to course.fee when absent.
//  */
// function priceForType(course: Course, type: PaymentType): number {
//   if (type === 'free') return 0;

//   // Look up a matching plan first
//   const plans = (course as any).subscription_plans as any[] | undefined;
//   if (plans && plans.length > 0) {
//     if (type === 'subscription') {
//       const plan = plans.find((p: any) => p.interval && p.is_active && !p.is_deleted);
//       if (plan) return plan.amount;
//     }
//     if (type === 'pay_as_you_go') {
//       const plan = plans.find((p: any) => p.interval === 'pay_as_you_go' && p.is_active && !p.is_deleted);
//       if (plan) return plan.amount;
//     }
//   }
//   return course.fee;
// }

// /** A course is ready when it has at least one topic */
// function courseIsReady(course: Course) {
//   return (course.topics_count ?? 0) > 0;
// }

// /**
//  * Load the Paystack inline JS once.
//  * Resolves true when PaystackPop is available on window.
//  *//*
// function loadPaystackScript(): Promise<boolean> {
//   return new Promise(resolve => {
//     if (window.PaystackPop) { resolve(true); return; }
//     const existing = document.getElementById('paystack-inline-js');
//     if (existing) {
//       existing.addEventListener('load', () => resolve(!!window.PaystackPop));
//       return;
//     }
//     const script = document.createElement('script');
//     script.id  = 'paystack-inline-js';
//     script.src = 'https://js.paystack.co/v1/inline.js';
//     script.onload  = () => resolve(!!window.PaystackPop);
//     script.onerror = () => resolve(false);
//     document.head.appendChild(script);
//   });
// }
// */
// function loadPaystackScript(): Promise<boolean> {
//   return new Promise(resolve => {
//     // Already loaded
//     if (window.PaystackPop) {
//       resolve(true);
//       return;
//     }

//     const existing = document.getElementById('paystack-inline-js') as HTMLScriptElement | null;

//     if (existing) {
//       // Script already in DOM — check current state
//       if (window.PaystackPop) {
//         resolve(true);
//         return;
//       }
//       // Still loading — wait for it, but also handle error case
//       const onLoad = () => {
//         cleanup();
//         resolve(!!window.PaystackPop);
//       };
//       const onError = () => {
//         cleanup();
//         resolve(false);
//       };
//       const cleanup = () => {
//         existing.removeEventListener('load', onLoad);
//         existing.removeEventListener('error', onError);
//       };
//       existing.addEventListener('load', onLoad);
//       existing.addEventListener('error', onError);
//       // Safety: if already loaded/error'd before listeners attached, check again
//       if (existing.readyState === 'complete' || existing.readyState === 'loaded') {
//         cleanup();
//         resolve(!!window.PaystackPop);
//       }
//       return;
//     }

//     // Create fresh script
//     const script = document.createElement('script');
//     script.id = 'paystack-inline-js';
//     script.src = 'https://js.paystack.co/v1/inline.js';
//     script.async = true;

//     script.onload = () => resolve(!!window.PaystackPop);
//     script.onerror = () => resolve(false);

//     document.head.appendChild(script);
//   });
// }

// /* ═══════════════════════════════════════════════════════════
//    Free-preview topic content modal
//    ═══════════════════════════════════════════════════════════ */
// function PreviewTopicContent({ topicId, courseId }: { topicId: number; courseId: number }) {
//   const [content, setContent] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     coursesApi
//       .getTopicContent(courseId, topicId)
//       .then(r => setContent(r.data))
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }, [topicId, courseId]);

//   if (loading) {
//     return (
//       <div style={{ padding: '2rem', textAlign: 'center' }}>
//         <span className="spinner-border spinner-border-sm text-primary" />
//       </div>
//     );
//   }

//   const contents = content?.contents ?? [];
//   if (!contents.length) {
//     return (
//       <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.875rem' }}>
//         <i className="bi bi-tools d-block mb-2" style={{ fontSize: '1.5rem' }} />
//         Content coming soon.
//       </div>
//     );
//   }
//   return <div>{contents.map((c: any) => renderContent(c))}</div>;
// }

// /* ═══════════════════════════════════════════════════════════
//    Main component
//    ═══════════════════════════════════════════════════════════ */
// export default function CourseDetail() {
//   const { slug }       = useParams<{ slug: string }>();
//   const [searchParams] = useSearchParams();
//   const { user }       = useAuth();
//   const navigate       = useNavigate();

//   const [course,       setCourse]       = useState<Course | null>(null);
//   const [loading,      setLoading]      = useState(true);
//   const [enrolling,    setEnrolling]    = useState(false);
//   const [openLesson,   setOpenLesson]   = useState<number | null>(0);
//   const [discountCode, setDiscountCode] = useState('');
//   const [discountInfo, setDiscountInfo] = useState<any>(null);
//   const [checking,     setChecking]     = useState(false);
//   const [previewTopic, setPreviewTopic] = useState<{ id: number; title: string } | null>(null);

//   // ── Instructor-led toggle ────────────────────────────────────────────────
//   const [instructorLed, setInstructorLed] = useState(false);

//   // ── Payment type chosen by the student ──────────────────────────────────
//   // Initialised to the course's canonical type; overridable via switcher.
//   const [chosenPaymentType, setChosenPaymentType] = useState<PaymentType | null>(null);

//   /* ── Load course ── */
//   useEffect(() => {
//     if (!slug) return;
//     setLoading(true);
//     coursesApi
//       .get(slug)
//       .then(r => {
//         const c: Course = r.data;
//         setCourse(c);
//         // Default to the course's own payment_type
//         setChosenPaymentType(c.payment_type as PaymentType);
//       })
//       .catch(() => navigate('/explore'))
//       .finally(() => setLoading(false));
//   }, [slug]);

//   /* ── Handle Paystack redirect callback (fallback path) ───────────────────
//    * Only fires when the user was redirected to Paystack and came back
//    * via ?reference= in the URL (i.e. the inline popup was unavailable).
//    * Guard: requires both reference AND course to be present.
//    */
//   useEffect(() => {
//     const reference = searchParams.get('reference') || searchParams.get('trxref');
//     if (!reference || !slug || !course) return;
//     verifyAndEnroll(reference).finally(() => {
//       navigate(`/courses/${slug}`, { replace: true });
//     });
//   }, [course, searchParams]);   // course kept intentionally — needs to be loaded first

//   /* ── Core: verify a Paystack reference and update enrolment state ────────
//    *
//    * IMPORTANT: we treat the payment as successful whenever the backend
//    * confirms paid=true OR status='success'.  Any auxiliary failure
//    * (e.g. Resend email 401) must NOT propagate as a top-level error —
//    * the backend should swallow it (see file header note).  We also
//    * never surface a failure toast for a transaction Paystack settled.
//    */
//   const verifyAndEnroll = useCallback(async (reference: string) => {
//     try {
//       const r = await paymentsApi.verify(reference);
//       const paid = r.data?.paid === true || r.data?.status === 'success';
//       if (paid) {
//         toast.success('Payment successful! You are now enrolled.');
//         if (slug) {
//           const r2 = await coursesApi.get(slug);
//           setCourse(r2.data);
//         }
//       } else {
//         // Paystack confirmed the transaction but our backend says not paid —
//         // this is a genuine failure worth reporting.
//         toast.error('Payment could not be verified. Contact support if you were charged.');
//       }
//     } catch (err: any) {
//       // If the backend threw because of an email error (non-payment issue),
//       // the course reload will reveal the enrollment anyway.  Reload first.
//       if (slug) {
//         try {
//           const r2 = await coursesApi.get(slug);
//           const enrolled = r2.data?.is_enrolled;
//           setCourse(r2.data);
//           if (enrolled) {
//             // The payment went through even though the endpoint errored
//             toast.success('Payment successful! You are now enrolled.');
//             return;
//           }
//         } catch { /* ignore secondary failure */ }
//       }
//       toast.error(
//         err.response?.data?.detail ||
//         'Payment verification failed. Contact support if you were charged.',
//       );
//     }
//   }, [slug]);

//   /* ── Enroll / pay ─────────────────────────────────────────────────────────
//    *
//    * Strategy:
//    *  1. Free / discounted-to-zero  → direct enrolment, no payment flow.
//    *  2. Paystack inline available  → open popup; onSuccess calls verifyAndEnroll.
//    *  3. Paystack inline unavailable → redirect to authorization_url (fallback).
//    *//*
//   const handleEnroll = async () => {
//     if (!user)   { navigate('/auth/signin'); return; }
//     if (!course) return;

//     const effectivePaymentType = chosenPaymentType ?? (course.payment_type as PaymentType);
//     const effectivePrice       = totalPrice;

//     setEnrolling(true);
//     try {
//       if (effectivePrice <= 0) {
//         // ── Free enrolment ──────────────────────────────────────────────
//         await enrollmentsApi.enroll(course.id);
//         toast.success('Enrolled successfully!');
//         navigate(`/learn/${course.slug}`);
//         return;
//       }

//       // ── Initiate payment ─────────────────────────────────────────────
//       const res = await paymentsApi.initiate({
//         course_id:      course.id,
//         payment_type:   effectivePaymentType,
//         discount_code:  discountCode || undefined,
//         instructor_led: instructorLed,
//         callback_url:   `${window.location.origin}/courses/${course.slug}`,
//       });

//       const authUrl   = res.data?.authorization_url ?? res.data?.data?.authorization_url;
//       const reference = res.data?.reference         ?? res.data?.data?.reference;
//       const paystackKey = res.data?.public_key      ?? res.data?.data?.public_key
//                           ?? (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined);

//       // ── Try inline popup first ────────────────────────────────────────
//       const sdkAvailable = await loadPaystackScript();

//       if (sdkAvailable && window.PaystackPop && reference && paystackKey && user?.email) {
//         const handler = window.PaystackPop.setup({
//           key:       paystackKey,
//           email:     user.email,
//           amount:    Math.round(effectivePrice * 100),   // kobo
//           reference,
//           currency:  'NGN',
//           onSuccess: async ({ reference: ref }) => {
//             // Verification runs in-page — no redirect needed
//             setEnrolling(true);
//             await verifyAndEnroll(ref);
//             setEnrolling(false);
//           },
//           onCancel: () => {
//             toast('Payment cancelled.', { icon: 'ℹ️' });
//             setEnrolling(false);
//           },
//         });
//         handler.openIframe();
//         // setEnrolling(false) is called inside onSuccess/onCancel
//         return;
//       }

//       // ── Fallback: redirect to Paystack-hosted page ────────────────────
//       if (!authUrl) {
//         toast.error('Could not retrieve payment URL. Please try again.');
//         return;
//       }
//       window.location.href = authUrl;

//     } catch (err: any) {
//       toast.error(err.response?.data?.detail || 'Enrollment failed');
//     } finally {
//       // Only clear spinner here for the redirect/free paths.
//       // The inline popup callbacks manage it themselves.
//       setEnrolling(false);
//     }
//   };
//   */
//   const handleEnroll = async () => {
//   if (!user) { navigate('/auth/signin'); return; }
//   if (!course) return;

//   const effectivePaymentType = chosenPaymentType ?? (course.payment_type as PaymentType);
//   const effectivePrice = totalPrice;

//   setEnrolling(true);
//   let usedInlinePopup = false; // <-- track which path we took

//   try {
//     if (effectivePrice <= 0) {
//       await enrollmentsApi.enroll(course.id);
//       toast.success('Enrolled successfully!');
//       navigate(`/learn/${course.slug}`);
//       return;
//     }

//     const res = await paymentsApi.initiate({
//       course_id: course.id,
//       payment_type: effectivePaymentType,
//       discount_code: discountCode || undefined,
//       instructor_led: instructorLed,
//       callback_url: `${window.location.origin}/courses/${course.slug}`,
//     });

//     const authUrl = res.data?.authorization_url ?? res.data?.data?.authorization_url;
//     const reference = res.data?.reference ?? res.data?.data?.reference;
//     const paystackKey =
//       res.data?.public_key ??
//       res.data?.data?.public_key ??
//       (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined);

//     // ── DEBUG: log what the backend returned
//     console.log('[Paystack] initiate response:', res.data);
//     console.log('[Paystack] extracted:', { authUrl, reference, paystackKey: paystackKey ? '***' : undefined, userEmail: user?.email });

//     // ── Try inline popup first ──
//     const sdkAvailable = await loadPaystackScript();

//     console.log('[Paystack] sdkAvailable:', sdkAvailable, 'PaystackPop:', !!window.PaystackPop);

//     if (sdkAvailable && window.PaystackPop && reference && paystackKey && user?.email) {
//       usedInlinePopup = true;

//       const handler = window.PaystackPop.setup({
//         key: paystackKey,
//         email: user.email,
//         amount: Math.round(effectivePrice * 100),
//         reference,
//         currency: 'NGN',
//         onSuccess: async ({ reference: ref }) => {
//           setEnrolling(true);
//           await verifyAndEnroll(ref);
//           setEnrolling(false);
//         },
//         onCancel: () => {
//           toast('Payment cancelled.', { icon: 'ℹ️' });
//           setEnrolling(false);
//         },
//       });
//       handler.openIframe();
//       return; // <-- prevents fallback redirect
//     }

//     // ── Fallback: redirect ──
//     if (!authUrl) {
//       toast.error('Could not retrieve payment URL. Please try again.');
//       return;
//     }
//     window.location.href = authUrl;

//   } catch (err: any) {
//     toast.error(err.response?.data?.detail || 'Enrollment failed');
//   } finally {
//     // Only clear spinner for paths that don't manage it themselves
//     if (!usedInlinePopup) {
//       setEnrolling(false);
//     }
//   }
// };

//   /* ── Discount code ── */
//   const checkDiscount = async () => {
//     if (!discountCode || !course) return;
//     setChecking(true);
//     try {
//       const res = await paymentsApi.validateDiscount({ code: discountCode, course_id: course.id });
//       setDiscountInfo(res.data);
//       res.data.valid ? toast.success(res.data.message) : toast.error(res.data.message);
//     } catch {
//       toast.error('Could not validate code');
//     } finally {
//       setChecking(false);
//     }
//   };

//   /* ── Guards ── */
//   if (loading) return <Spinner />;
//   if (!course) return null;

//   /* ── Derived state ── */
//   const isFree     = course.fee === 0;
//   const isEnrolled = !!course.is_enrolled;
//   const isReady    = courseIsReady(course);
//   const progress   = course.progress_pct ?? 0;

//   // Instructor-led
//   const instructorLedFee: number = (course as any).instructor_led_fee ?? 0;
//   const hasInstructorOption      = instructorLedFee > 0;

//   // Payment type options available to this student
//   const paymentOptions = availablePaymentTypes(course);
//   const hasMultiplePaymentOptions = paymentOptions.length > 1;
//   const activePaymentType: PaymentType = chosenPaymentType ?? paymentOptions[0];

//   // Base price for chosen type, then apply discount
//   const basePrice: number      = priceForType(course, activePaymentType);
//   const discountedBase: number = discountInfo?.valid
//     ? discountInfo.final_price
//     : basePrice;
//   const totalPrice: number     = discountedBase + (instructorLed ? instructorLedFee : 0);

//   const payDescription = paymentTypeDescription(activePaymentType, course);

//   // Instructor-led period label — adapts to payment type
//   const instructorLedPeriodLabel = (() => {
//     switch (activePaymentType) {
//       case 'one_time':      return 'per enrollment';
//       case 'subscription':  return `per billing period`;
//       case 'pay_as_you_go': return 'per access period';
//       default:              return '';
//     }
//   })();

//   const thumbSrc     = mediaUrl(course.thumbnail);
//   const learnItems   = (course.what_you_learn ?? '').split('\n').map(s => s.trim()).filter(Boolean);
//   const requirements = (course.requirements   ?? '').split('\n').map(s => s.trim()).filter(Boolean);

//   const includes = [
//     { icon: 'bi-collection',        label: `${course.lessons_count ?? 0} lessons`  },
//     { icon: 'bi-file-earmark-play', label: `${course.topics_count  ?? 0} topics`   },
//     ...(course.duration_weeks
//       ? [{ icon: 'bi-clock', label: `${course.duration_weeks} weeks` }]
//       : []),
//     ...(activePaymentType === 'pay_as_you_go' && (course as any).weekly_topic_limit
//       ? [{ icon: 'bi-bar-chart-steps', label: `Up to ${(course as any).weekly_topic_limit} topics/week` }]
//       : []),
//     { icon: 'bi-phone',  label: 'Mobile & desktop access'  },
//     { icon: 'bi-award',  label: 'Certificate on completion' },
//   ];

//   /* ─── Sub-components ─────────────────────────────────────────────────────
//    * Defined inside the component so they close over the reactive state
//    * above without needing prop-drilling. They are NOT defined inside JSX
//    * (which would create new component types on every render).
//    */

//   /* ── Thumbnail ── */
//   const Thumbnail = () => {
//     if (course.preview_video) {
//       return (
//         <div className="cd-preview-video-wrap">
//           <video controls poster={thumbSrc}>
//             <source src={course.preview_video} />
//           </video>
//         </div>
//       );
//     }
//     if (thumbSrc) {
//       return (
//         <img
//           src={thumbSrc}
//           alt={course.title}
//           className="cd-thumb"
//           onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
//         />
//       );
//     }
//     return (
//       <div className="cd-thumb-placeholder" aria-hidden="true">
//         <i className="bi bi-play-circle cd-thumb-placeholder-icon" />
//         <span className="cd-thumb-placeholder-label">Course Preview</span>
//       </div>
//     );
//   };

//   /* ── Payment type switcher (pill tabs) ── */
//   const PaymentTypeSwitcher = () => {
//     if (!hasMultiplePaymentOptions || isEnrolled) return null;
//     return (
//       <div className="cd-payment-switcher" role="group" aria-label="Choose payment model">
//         {paymentOptions.map(type => (
//           <button
//             key={type}
//             type="button"
//             className={`cd-payment-tab ${activePaymentType === type ? 'active' : ''}`}
//             onClick={() => {
//               setChosenPaymentType(type);
//               setDiscountInfo(null);   // reset discount — it may not apply to the new type
//             }}
//           >
//             {paymentTypeLabel(type, course.subscription_interval)}
//           </button>
//         ))}
//       </div>
//     );
//   };

//   /* ── Price block ── */
//   const PriceBlock = ({ compact = false }: { compact?: boolean }) => {
//     const effectiveFree = totalPrice === 0;

//     if (effectiveFree) {
//       return compact
//         ? (
//           <div className="cd-sticky-price">
//             <span className="cd-sticky-price-main" style={{ color: 'var(--success)' }}>Free</span>
//           </div>
//         ) : (
//           <div className="cd-price-block">
//             <span className="cd-free-badge"><i className="bi bi-lightning-fill me-1" />Free</span>
//             {hasInstructorOption && !isEnrolled && (
//               <div className="cd-price-type" style={{ marginTop: '0.25rem' }}>
//                 + ₦{instructorLedFee.toLocaleString()} for instructor-led
//               </div>
//             )}
//           </div>
//         );
//     }

//     if (compact) {
//       return (
//         <div className="cd-sticky-price">
//           <span className="cd-sticky-price-main">₦{totalPrice.toLocaleString()}</span>
//           {(discountInfo?.valid || instructorLed) && (
//             <span className="cd-sticky-price-orig">₦{basePrice.toLocaleString()}</span>
//           )}
//         </div>
//       );
//     }

//     return (
//       <div className="cd-price-block">
//         <span className="cd-price-main">
//           ₦{totalPrice.toLocaleString()}
//           {(discountInfo?.valid || (instructorLed && instructorLedFee > 0)) && (
//             <span className="cd-price-original">₦{basePrice.toLocaleString()}</span>
//           )}
//         </span>

//         {discountInfo?.valid && (
//           <div className="cd-price-savings">
//             You save ₦{discountInfo.savings.toLocaleString()}
//           </div>
//         )}

//         {/* Instructor-led fee breakdown */}
//         {instructorLed && instructorLedFee > 0 && (
//           <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
//             Base ₦{discountedBase.toLocaleString()} + instructor ₦{instructorLedFee.toLocaleString()}
//           </div>
//         )}

//         {/* Payment model label + description */}
//         <div className="cd-price-type">
//           {paymentTypeLabel(activePaymentType, course.subscription_interval)}
//         </div>
//         {payDescription && (
//           <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
//             {payDescription}
//           </div>
//         )}
//       </div>
//     );
//   };

//   /* ── CTA button ── */
//   const CtaButton = ({ variant = 'card' }: { variant?: 'card' | 'sticky' }) => {
//     const cls = variant === 'sticky' ? 'cd-sticky-btn' : 'cd-cta-btn';
//     const spinning = (
//       <>
//         <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
//         {' '}Processing…
//       </>
//     );

//     if (isEnrolled) {
//       return (
//         <Link to={`/learn/${course.slug}`} className={`${cls} success`}>
//           <i className="bi bi-play-fill" />
//           Continue Learning
//           {progress > 0 && (
//             <span className="ms-1 opacity-75" style={{ fontSize: '0.8em' }}>{progress}%</span>
//           )}
//         </Link>
//       );
//     }

//     if (!isReady) {
//       return (
//         <button className={`${cls} ${variant === 'sticky' ? 'disabled-state' : 'disabled'}`} disabled>
//           <i className="bi bi-hourglass-split" />
//           Coming Soon
//         </button>
//       );
//     }

//     const priceLabel = totalPrice > 0 ? `₦${totalPrice.toLocaleString()}` : 'Free';

//     return (
//       <button
//         type='button'
//         className={`${cls} primary btn-primary`}
//         onClick={handleEnroll}
//         disabled={enrolling}
//       >
//         {enrolling ? spinning : (
//           <>
//             <i className={`bi ${totalPrice === 0 ? 'bi-lightning-fill' : 'bi-lock-fill'}`} />
//             {totalPrice === 0 ? 'Enroll for Free' : `Enroll · ${priceLabel}`}
//           </>
//         )}
//       </button>
//     );
//   };

//   /* ═══════════════════════════════════════════════════════════
//      Render
//      ═══════════════════════════════════════════════════════════ */
//   return (
//     <div className="cd-root fade-in">

//       {/* Breadcrumb */}
//       <nav className="cd-breadcrumb" aria-label="Breadcrumb">
//         <ol className="breadcrumb">
//           <li className="breadcrumb-item"><Link to="/">Home</Link></li>
//           <li className="breadcrumb-item"><Link to="/explore">Courses</Link></li>
//           <li className="breadcrumb-item active" aria-current="page">{course.title}</li>
//         </ol>
//       </nav>

//       <div className="row g-4">

//         {/* ════════════ Main column ════════════ */}
//         <div className="col-lg-8">

//           {/* Hero */}
//           <div className="cd-header">
//             <div className="cd-badges">
//               {(course.categories || []).map((c: any) => (
//                 <span key={c.id} className="cd-cat-badge">{c.title}</span>
//               ))}
//               {course.level && (
//                 <span className={`badge-level ${course.level}`}>{course.level}</span>
//               )}
//               {course.featured && <span className="cd-badge-featured">Featured</span>}
//             </div>

//             <h1 className="cd-title">{course.title}</h1>
//             {course.short_description && (
//               <p className="cd-short-desc">{course.short_description}</p>
//             )}

//             <div className="cd-meta">
//               {course.avg_rating != null && (
//                 <div className="cd-meta-item">
//                   <span className="cd-rating-val">{course.avg_rating}</span>
//                   <RatingStars rating={course.avg_rating} />
//                 </div>
//               )}
//               <span className="cd-meta-item">
//                 <i className="bi bi-people" />{course.enrolled_count ?? 0} enrolled
//               </span>
//               <span className="cd-meta-item">
//                 <i className="bi bi-book" />{course.lessons_count ?? 0} lessons
//               </span>
//               {course.duration_weeks && (
//                 <span className="cd-meta-item">
//                   <i className="bi bi-clock" />{course.duration_weeks} weeks
//                 </span>
//               )}
//               {course.lang && (
//                 <span className="cd-meta-item">
//                   <i className="bi bi-translate" />{course.lang.toUpperCase()}
//                 </span>
//               )}
//             </div>

//             {course.creator && (
//               <div className="cd-creator">
//                 <Avatar image={course.creator.image} name={course.creator.name} size={36} />
//                 <div>
//                   <div className="cd-creator-name">{course.creator.name}</div>
//                   <div className="cd-creator-role">Course Creator</div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Instructors */}
//           {course.tutors && course.tutors.length > 0 && (
//             <div className="cd-section-card cd-card-pad">
//               <h6>
//                 <i className="bi bi-person-video3 text-primary" />
//                 {' '}Assigned Instructor{course.tutors.length > 1 ? 's' : ''}
//               </h6>
//               <div className="cd-instructors-list">
//                 {course.tutors.map((t: any) => (
//                   <div key={t.id} className="cd-instructor-item">
//                     <Avatar image={t.image} name={t.name} size={36} />
//                     <div>
//                       <div className="cd-instructor-name">{t.name}</div>
//                       <div className="cd-instructor-role">Instructor</div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* What you'll learn */}
//           {learnItems.length > 0 && (
//             <div className="cd-section-card cd-card-pad">
//               <h5><i className="bi bi-lightbulb text-warning" />{' '}What You'll Learn</h5>
//               <div className="cd-learn-grid">
//                 {learnItems.map((item, i) => (
//                   <div key={i} className="cd-learn-item">
//                     <i className="bi bi-check-circle-fill" />
//                     <span>{item}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Curriculum */}
//           <div className="cd-section-card cd-curriculum-card">
//             <div className="cd-curriculum-header">
//               <h5 className="mb-0">
//                 <i className="bi bi-list-ol text-primary" />{' '}Curriculum
//               </h5>
//               <span className="cd-count">
//                 {course.lessons_count ?? 0} lessons · {course.topics_count ?? 0} topics
//               </span>
//             </div>

//             {(course.lessons || []).length === 0 ? (
//               <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
//                 <i className="bi bi-inbox d-block mb-2" style={{ fontSize: '1.5rem' }} />
//                 Curriculum hasn't been added yet.
//               </div>
//             ) : (
//               (course.lessons || []).map((lesson: any, li: number) => (
//                 <div key={lesson.id}>
//                   <button
//                     className="cd-lesson-btn"
//                     onClick={() => setOpenLesson(openLesson === li ? null : li)}
//                     aria-expanded={openLesson === li}
//                   >
//                     <span className="cd-lesson-btn-left">
//                       <i className="bi bi-collection text-primary" />
//                       {lesson.title}
//                     </span>
//                     <span className="cd-lesson-btn-right">
//                       {(lesson.topics || []).length} topics
//                       <i className={`bi ${openLesson === li ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
//                     </span>
//                   </button>

//                   {openLesson === li && (lesson.topics || []).map((topic: any) => (
//                     <div key={topic.id} className="cd-topic-row">
//                       {isEnrolled ? (
//                         <Link
//                           to={`/learn/${course.slug}`}
//                           className="cd-topic-preview-link"
//                           style={{ display: 'flex', alignItems: 'center', gap: '.4rem', textDecoration: 'none', color: 'inherit', flex: 1 }}
//                         >
//                           <i className="bi bi-play-circle text-primary" style={{ flexShrink: 0 }} />
//                           <span className="cd-topic-title">{topic.title}</span>
//                           {topic.duration_minutes && (
//                             <span className="cd-topic-duration ms-auto">{topic.duration_minutes}m</span>
//                           )}
//                         </Link>
//                       ) : topic.is_free_preview ? (
//                         <button
//                           className="cd-topic-preview-link"
//                           onClick={() => setPreviewTopic({ id: topic.id, title: topic.title })}
//                           style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', flex: 1, textAlign: 'left', padding: 0 }}
//                         >
//                           <i className="bi bi-play-circle-fill" style={{ color: 'var(--primary)', flexShrink: 0 }} />
//                           <span className="cd-topic-title">{topic.title}</span>
//                           {topic.duration_minutes && (
//                             <span className="cd-topic-duration">{topic.duration_minutes}m</span>
//                           )}
//                           <span className="cd-preview-badge ms-auto">Free Preview</span>
//                         </button>
//                       ) : (
//                         <>
//                           <i className="bi bi-lock" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
//                           <span className="cd-topic-title">{topic.title}</span>
//                           {topic.duration_minutes && (
//                             <span className="cd-topic-duration">{topic.duration_minutes}m</span>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               ))
//             )}
//           </div>

//           {/* Requirements */}
//           {requirements.length > 0 && (
//             <div className="cd-section-card cd-card-pad">
//               <h5>Requirements</h5>
//               <ul className="cd-req-list">
//                 {requirements.map((r, i) => <li key={i}>{r}</li>)}
//               </ul>
//             </div>
//           )}

//         </div>
//         {/* ── end col-lg-8 ── */}

//         {/* ════════════ Sidebar ════════════ */}
//         <div className="col-lg-4">
//           <div className="cd-enroll-card">

//             <Thumbnail />

//             <div className="cd-enroll-body">

//               {/* ── Payment type switcher ── */}
//               <PaymentTypeSwitcher />

//               {/* ── Price + CTA ── */}
//               <div className="cd-price-cta-row">
//                 <PriceBlock compact={false} />
//                 <CtaButton variant="card" />
//               </div>

//               {/* ── Instructor-led toggle ─────────────────────────────────
//                *  Only shown when the admin has set instructor_led_fee > 0,
//                *  the student is not yet enrolled, and the course has content.
//                *  The period label updates to match the chosen payment type
//                *  so the student knows exactly what "+₦X" covers.
//                */}
//               {hasInstructorOption && !isEnrolled && isReady && activePaymentType !== 'free' && (
//                 <div className="cd-instructor-led-toggle">
//                   <label
//                     htmlFor="cd-il-toggle"
//                     style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}
//                   >
//                     <input
//                       id="cd-il-toggle"
//                       type="checkbox"
//                       className="form-check-input mt-1"
//                       checked={instructorLed}
//                       onChange={e => setInstructorLed(e.target.checked)}
//                     />
//                     <div>
//                       <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
//                         <i className="bi bi-person-video3 me-1 text-primary" />
//                         Instructor-led learning
//                         <span
//                           className="badge bg-primary ms-2"
//                           style={{ fontSize: '0.65rem', verticalAlign: 'middle' }}
//                         >
//                           +₦{instructorLedFee.toLocaleString()}
//                         </span>
//                       </div>
//                       <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>
//                         Get live sessions and direct feedback from an instructor.
//                         {instructorLedPeriodLabel && (
//                           <> Additional ₦{instructorLedFee.toLocaleString()} applies {instructorLedPeriodLabel}.</>
//                         )}
//                       </div>
//                     </div>
//                   </label>
//                 </div>
//               )}

//               {/* ── Not-ready notice ── */}
//               {!isReady && !isEnrolled && (
//                 <div className="cd-not-ready-notice">
//                   <i className="bi bi-hourglass-split" />
//                   <div className="cd-not-ready-notice-text">
//                     <strong>Content coming soon</strong>
//                     The instructor is still preparing this course.
//                   </div>
//                 </div>
//               )}

//               {/* ── Discount code — hidden for free payment type ── */}
//               {activePaymentType !== 'free' && !isEnrolled && isReady && (
//                 <div className="cd-discount-row">
//                   <input
//                     type="text"
//                     className="form-control form-control-sm"
//                     placeholder="Discount code"
//                     value={discountCode}
//                     onChange={e => setDiscountCode(e.target.value.toUpperCase())}
//                     onKeyDown={e => e.key === 'Enter' && checkDiscount()}
//                   />
//                   <button
//                     className="btn btn-sm btn-outline-primary"
//                     onClick={checkDiscount}
//                     disabled={checking || !discountCode}
//                     style={{ whiteSpace: 'nowrap' }}
//                   >
//                     {checking ? <span className="spinner-border spinner-border-sm" /> : 'Apply'}
//                   </button>
//                 </div>
//               )}

//               {/* ── Course includes ── */}
//               <div className="cd-includes">
//                 {includes.map((item, i) => (
//                   <div key={i} className="cd-include-item">
//                     <i className={`bi ${item.icon}`} />
//                     {item.label}
//                   </div>
//                 ))}
//               </div>

//             </div>
//           </div>
//         </div>
//         {/* ── end col-lg-4 ── */}

//       </div>

//       {/* ══ Mobile sticky CTA ══ */}
//       <div className="cd-sticky-cta" role="region" aria-label="Quick enroll">
//         {isEnrolled ? (
//           <div className="cd-sticky-price">
//             <span className="cd-sticky-price-main" style={{ color: 'var(--success)', fontSize: '0.8rem' }}>
//               Enrolled{progress > 0 ? ` · ${progress}%` : ''}
//             </span>
//           </div>
//         ) : (
//           <PriceBlock compact />
//         )}
//         <CtaButton variant="sticky" />
//       </div>

//       {/* ══ Free-preview modal ══ */}
//       {previewTopic && (
//         <div className="cd-preview-modal-overlay" onClick={() => setPreviewTopic(null)}>
//           <div className="cd-preview-modal" onClick={e => e.stopPropagation()}>
//             <div className="cd-preview-modal-header">
//               <div>
//                 <div className="cd-preview-badge" style={{ marginBottom: '.4rem' }}>Free Preview</div>
//                 <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{previewTopic.title}</h5>
//               </div>
//               <button className="cd-preview-modal-close" onClick={() => setPreviewTopic(null)}>
//                 <i className="bi bi-x-lg" />
//               </button>
//             </div>
//             <div className="cd-preview-modal-body">
//               <PreviewTopicContent topicId={previewTopic.id} courseId={course.id} />
//             </div>
//             <div className="cd-preview-modal-footer">
//               <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', margin: 0 }}>
//                 This is a free preview. Enroll for full access.
//               </p>
//               <button type='button' className="cd-cta-btn primary" onClick={handleEnroll} disabled={enrolling}>
//                 <i className="bi bi-lightning-fill" />
//                 {totalPrice === 0 ? 'Enroll for Free' : `Enroll · ₦${totalPrice.toLocaleString()}`}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// }








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
    if (
      selectedPayment.payment_type === 'free' ||
      Number(totalPrice) <= 0
    ) {
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
  const isFree     = selectedPayment.payment_type === 'free' || selectedPayment.fee === 0;
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
            <i className={`bi ${totalPrice === 0 ? 'bi-lightning-fill' : 'bi-lock-fill'}`} />
            {totalPrice === 0
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
                {totalPrice === 0 ? 'Enroll for Free' : `Enroll · ₦${totalPrice.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
