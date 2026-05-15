// import { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { pathsApi, paymentsApi, enrollmentsApi } from '@/services/api';
// import { LearningPath } from '@/types';
// import { Spinner, PageTitle, CourseCard } from '@/components/shared/index';
// import { useAuth } from '@/context/AuthContext';

// export default function PathDetail() {
//   const { id } = useParams<{ id: string }>();
//   const { user } = useAuth();
//   const navigate = useNavigate();
//   const [path, setPath] = useState<LearningPath | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [enrolling, setEnrolling] = useState(false);
//   useEffect(() => {
//     if (!id) return;
//     pathsApi.get(Number(id)).then(r => setPath(r.data)).catch(() => navigate('/paths')).finally(() => setLoading(false));
//   }, [id]);
//   const enroll = async () => {
//     if (!user) { navigate('/auth/signin'); return; }
//     if (!path) return;
//     setEnrolling(true);
//     try {
//       if (path.fee > 0) { const res = await paymentsApi.initiate({ path_id: path.id, payment_type: 'one_time' }); window.location.href = res.data.payment_url; }
//       else { await enrollmentsApi.enrollPath(path.id); toast.success('Enrolled in learning path!'); navigate('/my-courses'); }
//     } catch (err: any) { toast.error(err.response?.data?.detail || 'Enrollment failed'); }
//     finally { setEnrolling(false); }
//   };
//   if (loading) return <Spinner />;
//   if (!path) return null;
//   return (
//     <div className="fade-in">
//       <PageTitle title={path.title} subtitle={path.description || ''} crumbs={[{ label: 'Paths', href: '/paths' }, { label: path.title }]} />
//       <div className="row g-4">
//         <div className="col-lg-8">
//           <h2 className="small-title">Courses in this Path ({path.courses_count})</h2>
//           <div className="row g-3">{(path.courses as any[]).map((c: any) => <div key={c.id} className="col-sm-6"><CourseCard course={c} /></div>)}</div>
//         </div>
//         <div className="col-lg-4">
//           <div className="card p-4 sticky-top" style={{ top: 'calc(var(--nav-height) + 1rem)' }}>
//             <div className="mb-3">{path.fee > 0 ? <div className="fw-bold text-primary" style={{ fontSize: '1.75rem' }}>₦{path.fee.toLocaleString()}</div> : <span className="badge bg-success px-3 py-2">Free</span>}</div>
//             <div className="d-flex flex-column gap-2 mb-4 text-muted" style={{ fontSize: '0.8rem' }}>
//               <div><i className="bi bi-collection me-2 text-primary" />{path.courses_count} courses</div>
//               <div><i className="bi bi-award me-2 text-primary" />Certificate on completion</div>
//               <div><i className="bi bi-infinity me-2 text-primary" />Lifetime access</div>
//             </div>
//             {path.is_enrolled ? <div className="btn btn-success w-100 py-2 fw-600"><i className="bi bi-check-circle me-1" />Enrolled</div>
//               : <button className="btn btn-primary w-100 py-2 fw-600" onClick={enroll} disabled={enrolling}>{enrolling ? <><span className="spinner-border spinner-border-sm me-2" />Processing…</> : path.fee > 0 ? `Enroll · ₦${path.fee.toLocaleString()}` : 'Enroll Free'}</button>}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }




// // v2
// // pages/paths/PathDetail.tsx
// /**
//  * PathDetail — v2 Professional Refactor
//  * Uses useEnrollmentPayment hook for DRY, consistent payment flow with CourseDetail.
//  * Features: Paystack inline v2, payment type selector, discount codes, instructor-led toggle.
//  */
// import { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { pathsApi, paymentsApi, enrollmentsApi } from '@/services/api';
// import { LearningPath, Course } from '@/types';
// import { Spinner, PageTitle, CourseCard, StatusBadge, RatingStars, Avatar } from '@/components/shared/index';
// import { useAuth } from '@/context/AuthContext';
// import { useEnrollmentPayment, PaymentOption } from '@/hooks/useEnrollmentPayment';
// import { resolveImage } from '@/utils/resolveImage';
// import '@/styles/pages/paths/PathDetail.css';

// /* ── Pure helpers ─────────────────────────────────────────────────── */
// function mediaUrl(path: string | null | undefined) {
//   return resolveImage(path, undefined, 'paths/thumbnails') ?? undefined;
// }

// function paymentTypeLabel(type: string): string {
//   switch (type) {
//     case 'free': return 'Free';
//     case 'one_time': return 'One-time';
//     case 'subscription': return 'Subscription';
//     case 'pay_as_you_go': return 'Pay-as-you-go';
//     default: return type;
//   }
// }

// function paymentDescription(opt: PaymentOption): string {
//   switch (opt.payment_type) {
//     case 'free':
//       return 'No payment required — enrol instantly and keep lifetime access.';
//     case 'one_time':
//       return 'Pay once and keep lifetime access to all courses in this path.';
//     case 'subscription':
//       return 'Billed periodically. Cancel anytime. Access continues while active.';
//     case 'pay_as_you_go':
//       return 'Pay for access periods as you go. Renew when your access expires.';
//     default:
//       return '';
//   }
// }

// function derivePaymentOptions(path: LearningPath): PaymentOption[] {
//   const raw: any[] = (path as any).available_payment_types ?? [];
//   if (raw.length > 0) {
//     return raw.map((r: any) => ({
//       payment_type: r.payment_type,
//       fee: r.fee ?? 0,
//       subscription_interval: r.subscription_interval,
//       access_period_days: r.access_period_days,
//       label: paymentTypeLabel(r.payment_type),
//     }));
//   }
//   return [{
//     payment_type: path.payment_type,
//     fee: path.fee,
//     label: paymentTypeLabel(path.payment_type),
//   }];
// }

// /* ── PaymentTypeSelector (shared visual component) ─────────────────── */
// function PaymentTypeSelector({
//   options,
//   selected,
//   onChange,
// }: {
//   options: PaymentOption[];
//   selected: PaymentOption | null;
//   onChange: (opt: PaymentOption) => void;
// }) {
//   if (options.length <= 1) return null;

//   return (
//     <div className="pd-payment-selector" role="group" aria-label="Choose payment model">
//       <div className="pd-payment-selector-label">
//         <i className="bi bi-wallet2 me-1" />Choose how to pay
//       </div>
//       <div className="pd-payment-pills">
//         {options.map(opt => (
//           <button
//             key={opt.payment_type}
//             type="button"
//             className={`pd-payment-pill${selected?.payment_type === opt.payment_type ? ' active' : ''}`}
//             onClick={() => onChange(opt)}
//           >
//             <span className="pd-payment-pill-label">{opt.label}</span>
//             {opt.fee > 0 && (
//               <span className="pd-payment-pill-price">₦{opt.fee.toLocaleString()}</span>
//             )}
//             {opt.fee === 0 && opt.payment_type === 'free' && (
//               <span className="pd-payment-pill-price free">Free</span>
//             )}
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }

// /* ── PriceBlock ───────────────────────────────────────────────────── */
// function PriceBlock({
//   selectedPayment,
//   discountInfo,
//   instructorLed,
//   instructorLedFee,
//   isFree,
// }: {
//   selectedPayment: PaymentOption | null;
//   discountInfo: any;
//   instructorLed: boolean;
//   instructorLedFee: number;
//   isFree: boolean;
// }) {
//   if (!selectedPayment) return null;

//   const discountedBase = discountInfo?.valid ? discountInfo.final_price : selectedPayment.fee;
//   const totalPrice = discountedBase + (instructorLed ? instructorLedFee : 0);

//   if (isFree && !instructorLed) {
//     return (
//       <div className="pd-price-block">
//         <span className="pd-price-free">
//           <i className="bi bi-lightning-fill me-1" />Free
//         </span>
//         {instructorLedFee > 0 && (
//           <div className="pd-price-type">+ ₦{instructorLedFee.toLocaleString()} for instructor-led</div>
//         )}
//       </div>
//     );
//   }

//   return (
//     <div className="pd-price-block">
//       <span className="pd-price-main">
//         ₦{totalPrice.toLocaleString()}
//         {(discountInfo?.valid || instructorLed) && (
//           <span className="pd-price-original">₦{selectedPayment.fee.toLocaleString()}</span>
//         )}
//       </span>

//       {discountInfo?.valid && (
//         <div className="pd-price-savings">
//           You save ₦{discountInfo.savings.toLocaleString()}
//         </div>
//       )}

//       {instructorLed && instructorLedFee > 0 && (
//         <div className="pd-price-breakdown">
//           Base ₦{discountedBase.toLocaleString()} + instructor ₦{instructorLedFee.toLocaleString()}
//         </div>
//       )}

//       <div className="pd-price-type">{selectedPayment.label}</div>
//       <div className="pd-price-desc">{paymentDescription(selectedPayment)}</div>
//     </div>
//   );
// }

// /* ── CtaButton ────────────────────────────────────────────────────── */
// function CtaButton({
//   isEnrolled,
//   isReady,
//   enrolling,
//   totalPrice,
//   onEnroll,
//   progress,
//   slug,
// }: {
//   isEnrolled: boolean;
//   isReady: boolean;
//   enrolling: boolean;
//   totalPrice: number;
//   onEnroll: () => void;
//   progress: number;
//   slug?: string;
// }) {
//   const spinning = (
//     <>
//       <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
//       {' '}Processing…
//     </>
//   );

//   if (isEnrolled) {
//     return (
//       <a href={`/learn/${slug}`} className="pd-cta-btn success">
//         <i className="bi bi-play-fill" />
//         Continue Learning
//         {progress > 0 && <span className="pd-progress-badge">{progress}%</span>}
//       </a>
//     );
//   }

//   if (!isReady) {
//     return (
//       <button className="pd-cta-btn disabled" disabled>
//         <i className="bi bi-hourglass-split" />
//         Coming Soon
//       </button>
//     );
//   }

//   return (
//     <button className="pd-cta-btn primary" onClick={onEnroll} disabled={enrolling}>
//       {enrolling ? spinning : (
//         <>
//           <i className={`bi ${totalPrice === 0 ? 'bi-lightning-fill' : 'bi-lock-fill'}`} />
//           {totalPrice === 0 ? 'Enroll for Free' : `Enroll · ₦${totalPrice.toLocaleString()}`}
//         </>
//       )}
//     </button>
//   );
// }

// /* ═══════════════════════════════════════════════════════════════════
//    Main Component
//    ═══════════════════════════════════════════════════════════════════ */
// export default function PathDetail() {
//   const { id } = useParams<{ id: string }>();
//   const { user } = useAuth();
//   const navigate = useNavigate();

//   const [path, setPath] = useState<LearningPath | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [openCourse, setOpenCourse] = useState<number | null>(null);

//   // Load path data
//   useEffect(() => {
//     if (!id) return;
//     setLoading(true);
//     pathsApi
//       .get(Number(id))
//       .then(r => setPath(r.data))
//       .catch(() => navigate('/paths'))
//       .finally(() => setLoading(false));
//   }, [id, navigate]);

//   // Derive payment options from path
//   const paymentOptions = path ? derivePaymentOptions(path) : [];
//   const instructorLedFee = (path as any)?.instructor_led_fee ?? 0;
//   const hasInstructorOption = instructorLedFee > 0;

//   // Use shared payment hook
//   const {
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
//   } = useEnrollmentPayment({
//     itemId: Number(id),
//     itemType: 'path',
//     paymentOptions,
//     user,
//     navigate,
//   });

//   // Set instructor fee for hook calculation
//   useEffect(() => {
//     (window as any).__instructorLedFee = instructorLedFee;
//   }, [instructorLedFee]);

//   // Guards
//   if (loading) return <Spinner />;
//   if (!path || !selectedPayment) return null;

//   const isFree = selectedPayment.payment_type === 'free' || selectedPayment.fee === 0;
//   const isEnrolled = !!path.is_enrolled;
//   const isReady = (path.courses_count ?? 0) > 0;
//   const progress = (path as any).progress_pct ?? 0;
//   const thumbSrc = mediaUrl(path.thumbnail);

//   const includes = [
//     { icon: 'bi-collection', label: `${path.courses_count ?? 0} courses` },
//     { icon: 'bi-award', label: 'Certificate on completion' },
//     { icon: 'bi-phone', label: 'Mobile & desktop access' },
//     ...(path.duration_weeks
//       ? [{ icon: 'bi-clock', label: `${path.duration_weeks} weeks` }]
//       : []),
//   ];

//   return (
//     <div className="pd-root fade-in">
//       {/* Breadcrumb */}
//       <nav className="pd-breadcrumb" aria-label="Breadcrumb">
//         <ol className="breadcrumb">
//           <li className="breadcrumb-item"><a href="/">Home</a></li>
//           <li className="breadcrumb-item"><a href="/paths">Paths</a></li>
//           <li className="breadcrumb-item active" aria-current="page">{path.title}</li>
//         </ol>
//       </nav>

//       <div className="row g-4">
//         {/* ════════════ Main column ════════════ */}
//         <div className="col-lg-8">
//           {/* Hero */}
//           <div className="pd-header">
//             <div className="pd-badges">
//               {path.featured && <span className="pd-badge-featured">Featured</span>}
//               <StatusBadge status={path.status} />
//             </div>

//             <h1 className="pd-title">{path.title}</h1>
//             {path.description && <p className="pd-desc">{path.description}</p>}

//             <div className="pd-meta">
//               {(path as any).avg_rating != null && (
//                 <div className="pd-meta-item">
//                   <span className="pd-rating-val">{(path as any).avg_rating}</span>
//                   <RatingStars rating={(path as any).avg_rating} />
//                 </div>
//               )}
//               <span className="pd-meta-item">
//                 <i className="bi bi-people" />{(path as any).enrolled_count ?? 0} enrolled
//               </span>
//               <span className="pd-meta-item">
//                 <i className="bi bi-collection" />{path.courses_count ?? 0} courses
//               </span>
//               {path.duration_weeks && (
//                 <span className="pd-meta-item">
//                   <i className="bi bi-clock" />{path.duration_weeks} weeks
//                 </span>
//               )}
//             </div>

//             {(path as any).creator && (
//               <div className="pd-creator">
//                 <Avatar image={(path as any).creator.image} name={(path as any).creator.name} size={36} />
//                 <div>
//                   <div className="pd-creator-name">{(path as any).creator.name}</div>
//                   <div className="pd-creator-role">Path Creator</div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Courses list */}
//           <div className="pd-section-card">
//             <div className="pd-section-header">
//               <h5><i className="bi bi-collection text-primary" /> Courses in this Path</h5>
//               <span className="pd-count">{path.courses_count ?? 0} courses</span>
//             </div>

//             {(path.courses as Course[] || []).length === 0 ? (
//               <div className="pd-empty-state">
//                 <i className="bi bi-inbox" />
//                 No courses have been added to this path yet.
//               </div>
//             ) : (
//               <div className="pd-courses-list">
//                 {(path.courses as Course[]).map((course, idx) => (
//                   <div key={course.id} className="pd-course-item">
//                     <div className="pd-course-number">{idx + 1}</div>
//                     <div className="pd-course-info">
//                       <div className="pd-course-title">{course.title}</div>
//                       <div className="pd-course-meta">
//                         {course.level && <span className="pd-course-level">{course.level}</span>}
//                         <span>{course.lessons_count ?? 0} lessons</span>
//                         <span>{course.topics_count ?? 0} topics</span>
//                         {course.duration_weeks && <span>{course.duration_weeks} weeks</span>}
//                       </div>
//                     </div>
//                     {course.thumbnail && (
//                       <img
//                         src={resolveImage(course.thumbnail, undefined, 'courses/thumbnails') ?? ''}
//                         alt={course.title}
//                         className="pd-course-thumb"
//                         onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
//                       />
//                     )}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* What you'll achieve */}
//           {(path as any).what_you_achieve && (
//             <div className="pd-section-card pd-card-pad">
//               <h5><i className="bi bi-trophy text-warning" /> What You'll Achieve</h5>
//               <div className="pd-achieve-list">
//                 {(path as any).what_you_achieve.split('\n').map((item: string, i: number) => (
//                   <div key={i} className="pd-achieve-item">
//                     <i className="bi bi-check-circle-fill" />
//                     <span>{item.trim()}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ════════════ Sidebar ════════════ */}
//         <div className="col-lg-4">
//           <div className="pd-enroll-card">
//             {/* Thumbnail */}
//             {thumbSrc ? (
//               <img
//                 src={thumbSrc}
//                 alt={path.title}
//                 className="pd-thumb"
//                 onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
//               />
//             ) : (
//               <div className="pd-thumb-placeholder">
//                 <i className="bi bi-signpost-split" />
//                 <span>Learning Path</span>
//               </div>
//             )}

//             <div className="pd-enroll-body">
//               {/* Payment selector */}
//               {!isEnrolled && isReady && (
//                 <PaymentTypeSelector
//                   options={paymentOptions}
//                   selected={selectedPayment}
//                   onChange={opt => {
//                     setSelectedPayment(opt);
//                     setDiscountCode('');
//                   }}
//                 />
//               )}

//               {/* Price + CTA */}
//               <div className="pd-price-cta-row">
//                 <PriceBlock
//                   selectedPayment={selectedPayment}
//                   discountInfo={discountInfo}
//                   instructorLed={instructorLed}
//                   instructorLedFee={instructorLedFee}
//                   isFree={isFree}
//                 />
//                 <CtaButton
//                   isEnrolled={isEnrolled}
//                   isReady={isReady}
//                   enrolling={enrolling}
//                   totalPrice={totalPrice}
//                   onEnroll={handleEnroll}
//                   progress={progress}
//                   slug={(path as any).slug}
//                 />
//               </div>

//               {/* Instructor-led toggle */}
//               {hasInstructorOption && !isEnrolled && isReady && (
//                 <div className="pd-instructor-led-toggle">
//                   <label htmlFor="pd-il-toggle" className="pd-il-label">
//                     <input
//                       id="pd-il-toggle"
//                       type="checkbox"
//                       className="form-check-input"
//                       checked={instructorLed}
//                       onChange={e => setInstructorLed(e.target.checked)}
//                     />
//                     <div className="pd-il-content">
//                       <div className="pd-il-title">
//                         <i className="bi bi-person-video3 me-1 text-primary" />
//                         Instructor-led learning
//                         <span className="badge bg-primary ms-2">
//                           +₦{instructorLedFee.toLocaleString()}
//                         </span>
//                       </div>
//                       <div className="pd-il-desc">
//                         Get live sessions and direct feedback from an instructor.
//                         Additional fee applies per{' '}
//                         {selectedPayment.payment_type === 'one_time' ? 'enrollment' : 'billing period'}.
//                       </div>
//                     </div>
//                   </label>
//                 </div>
//               )}

//               {/* Not ready notice */}
//               {!isReady && !isEnrolled && (
//                 <div className="pd-not-ready">
//                   <i className="bi bi-hourglass-split" />
//                   <div>
//                     <strong>Content coming soon</strong>
//                     <span>The creator is still preparing this path.</span>
//                   </div>
//                 </div>
//               )}

//               {/* Discount code */}
//               {selectedPayment.payment_type !== 'free' && !isEnrolled && isReady && (
//                 <div className="pd-discount-row">
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
//                     disabled={checkingDiscount || !discountCode}
//                   >
//                     {checkingDiscount ? (
//                       <span className="spinner-border spinner-border-sm" />
//                     ) : 'Apply'}
//                   </button>
//                 </div>
//               )}

//               {/* Includes */}
//               <div className="pd-includes">
//                 {includes.map((item, i) => (
//                   <div key={i} className="pd-include-item">
//                     <i className={`bi ${item.icon}`} />
//                     {item.label}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Mobile sticky CTA */}
//       <div className="pd-sticky-cta" role="region" aria-label="Quick enroll">
//         {isEnrolled ? (
//           <div className="pd-sticky-price enrolled">
//             Enrolled{progress > 0 ? ` · ${progress}%` : ''}
//           </div>
//         ) : (
//           <div className="pd-sticky-price">
//             <span className="pd-sticky-price-main">
//               {isFree ? 'Free' : `₦${totalPrice.toLocaleString()}`}
//             </span>
//             {!isFree && (discountInfo?.valid || instructorLed) && (
//               <span className="pd-sticky-price-orig">₦{selectedPayment.fee.toLocaleString()}</span>
//             )}
//           </div>
//         )}
//         <CtaButton
//           isEnrolled={isEnrolled}
//           isReady={isReady}
//           enrolling={enrolling}
//           totalPrice={totalPrice}
//           onEnroll={handleEnroll}
//           progress={progress}
//           slug={(path as any).slug}
//         />
//       </div>
//     </div>
//   );
// }




// v3
// pages/paths/PathDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pathsApi } from '@/services/api';
import { LearningPath, Course } from '@/types';
import { Spinner, StatusBadge, RatingStars, Avatar } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';
import { useEnrollmentPayment, PaymentOption } from '@/hooks/useEnrollmentPayment';
import { resolveImage } from '@/utils/resolveImage';
import '@/styles/pages/paths/PathDetail.css';

/* ── Pure helpers ─────────────────────────────────────────────────── */
function mediaUrl(path: string | null | undefined) {
  return resolveImage(path, undefined, 'paths/thumbnails') ?? undefined;
}

function paymentTypeLabel(type: string): string {
  switch (type) {
    case 'free':         return 'Free';
    case 'one_time':     return 'One-time';
    case 'subscription': return 'Subscription';
    case 'pay_as_you_go':return 'Pay-as-you-go';
    default:             return type;
  }
}

function paymentDescription(opt: PaymentOption): string {
  switch (opt.payment_type) {
    case 'free':         return 'No payment required — enrol instantly and keep lifetime access.';
    case 'one_time':     return 'Pay once and keep lifetime access to all courses in this path.';
    case 'subscription': return 'Billed periodically. Cancel anytime. Access continues while active.';
    case 'pay_as_you_go':return 'Pay for access periods as you go. Renew when your access expires.';
    default:             return '';
  }
}

function derivePaymentOptions(path: LearningPath): PaymentOption[] {
  const raw: any[] = (path as any).available_payment_types ?? [];
  if (raw.length > 0) {
    return raw.map((r: any) => ({
      payment_type:         r.payment_type,
      fee:                  r.fee ?? 0,
      subscription_interval:r.subscription_interval,
      access_period_days:   r.access_period_days,
      label:                paymentTypeLabel(r.payment_type),
    }));
  }
  return [{
    payment_type: path.payment_type,
    fee:          path.fee,
    label:        paymentTypeLabel(path.payment_type),
  }];
}

/* ── Sub-components (unchanged) ───────────────────────────────────── */
function PaymentTypeSelector({
  options, selected, onChange,
}: {
  options: PaymentOption[];
  selected: PaymentOption | null;
  onChange: (opt: PaymentOption) => void;
}) {
  if (options.length <= 1) return null;
  return (
    <div className="pd-payment-selector" role="group" aria-label="Choose payment model">
      <div className="pd-payment-selector-label">
        <i className="bi bi-wallet2 me-1" />Choose how to pay
      </div>
      <div className="pd-payment-pills">
        {options.map(opt => (
          <button
            key={opt.payment_type}
            type="button"
            className={`pd-payment-pill${selected?.payment_type === opt.payment_type ? ' active' : ''}`}
            onClick={() => onChange(opt)}
          >
            <span className="pd-payment-pill-label">{opt.label}</span>
            {opt.fee > 0 && <span className="pd-payment-pill-price">₦{opt.fee.toLocaleString()}</span>}
            {opt.fee === 0 && opt.payment_type === 'free' && <span className="pd-payment-pill-price free">Free</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function PriceBlock({
  selectedPayment, discountInfo, instructorLed, instructorLedFee, isFree,
}: {
  selectedPayment: PaymentOption | null;
  discountInfo: any;
  instructorLed: boolean;
  instructorLedFee: number;
  isFree: boolean;
}) {
  if (!selectedPayment) return null;
  const discountedBase = discountInfo?.valid ? discountInfo.final_price : selectedPayment.fee;
  const totalPrice = discountedBase + (instructorLed ? instructorLedFee : 0);

  if (isFree && !instructorLed) {
    return (
      <div className="pd-price-block">
        <span className="pd-price-free"><i className="bi bi-lightning-fill me-1" />Free</span>
        {instructorLedFee > 0 && (
          <div className="pd-price-type">+ ₦{instructorLedFee.toLocaleString()} for instructor-led</div>
        )}
      </div>
    );
  }

  return (
    <div className="pd-price-block">
      <span className="pd-price-main">
        ₦{totalPrice.toLocaleString()}
        {(discountInfo?.valid || instructorLed) && (
          <span className="pd-price-original">₦{selectedPayment.fee.toLocaleString()}</span>
        )}
      </span>
      {discountInfo?.valid && (
        <div className="pd-price-savings">You save ₦{discountInfo.savings.toLocaleString()}</div>
      )}
      {instructorLed && instructorLedFee > 0 && (
        <div className="pd-price-breakdown">
          Base ₦{discountedBase.toLocaleString()} + instructor ₦{instructorLedFee.toLocaleString()}
        </div>
      )}
      <div className="pd-price-type">{selectedPayment.label}</div>
      <div className="pd-price-desc">{paymentDescription(selectedPayment)}</div>
    </div>
  );
}

function CtaButton({
  isEnrolled, isReady, enrolling, totalPrice, onEnroll, progress, slug,
}: {
  isEnrolled: boolean;
  isReady: boolean;
  enrolling: boolean;
  totalPrice: number;
  onEnroll: () => void;
  progress: number;
  slug?: string;
}) {
  const spinning = (
    <>
      <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
      {' '}Processing…
    </>
  );

  if (isEnrolled) {
    return (
      <a href={`/learn/${slug}`} className="pd-cta-btn success">
        <i className="bi bi-play-fill" />
        Continue Learning
        {progress > 0 && <span className="pd-progress-badge">{progress}%</span>}
      </a>
    );
  }
  if (!isReady) {
    return (
      <button className="pd-cta-btn disabled" disabled>
        <i className="bi bi-hourglass-split" />Coming Soon
      </button>
    );
  }
  return (
    <button className="pd-cta-btn primary" onClick={onEnroll} disabled={enrolling}>
      {enrolling ? spinning : (
        <>
          <i className={`bi ${totalPrice === 0 ? 'bi-lightning-fill' : 'bi-lock-fill'}`} />
          {totalPrice === 0 ? 'Enroll for Free' : `Enroll · ₦${totalPrice.toLocaleString()}`}
        </>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Inner view — rendered only once path is loaded.
   Hooks are called with stable, non-empty paymentOptions.
   ═══════════════════════════════════════════════════════════════════ */
function PathDetailView({ path, pathId }: { path: LearningPath; pathId: number }) {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // Stable options — path is guaranteed non-null here
  const paymentOptions  = useMemo(() => derivePaymentOptions(path), [path]);
  const instructorLedFee= useMemo(() => (path as any).instructor_led_fee ?? 0, [path]);
  const hasInstructorOption = instructorLedFee > 0;

  const {
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
  } = useEnrollmentPayment({
    itemId: pathId,
    itemType: 'path',
    paymentOptions,   // always non-empty
    user,
    navigate,
  });

  // Expose instructor fee for hook's price calculation
  useEffect(() => {
    (window as any).__instructorLedFee = instructorLedFee;
  }, [instructorLedFee]);

  // selectedPayment initialises synchronously from paymentOptions[0] inside
  // the hook, so it will never be null here — but guard anyway for TS.
  if (!selectedPayment) return <Spinner />;

  const isFree     = selectedPayment.payment_type === 'free' || selectedPayment.fee === 0;
  const isEnrolled = !!path.is_enrolled;
  const isReady    = (path.courses_count ?? 0) > 0;
  const progress   = (path as any).progress_pct ?? 0;
  const thumbSrc   = mediaUrl(path.thumbnail);

  const includes = [
    { icon: 'bi-collection', label: `${path.courses_count ?? 0} courses` },
    { icon: 'bi-award',      label: 'Certificate on completion' },
    { icon: 'bi-phone',      label: 'Mobile & desktop access' },
    ...(path.duration_weeks ? [{ icon: 'bi-clock', label: `${path.duration_weeks} weeks` }] : []),
  ];

  return (
    <div className="pd-root fade-in">
      {/* Breadcrumb */}
      <nav className="pd-breadcrumb" aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/">Home</a></li>
          <li className="breadcrumb-item"><a href="/paths">Paths</a></li>
          <li className="breadcrumb-item active" aria-current="page">{path.title}</li>
        </ol>
      </nav>

      <div className="row g-4">
        {/* ════ Main column ════ */}
        <div className="col-lg-8">
          <div className="pd-header">
            <div className="pd-badges">
              {path.featured && <span className="pd-badge-featured">Featured</span>}
              <StatusBadge status={path.status} />
            </div>
            <h1 className="pd-title">{path.title}</h1>
            {path.description && <p className="pd-desc">{path.description}</p>}

            <div className="pd-meta">
              {(path as any).avg_rating != null && (
                <div className="pd-meta-item">
                  <span className="pd-rating-val">{(path as any).avg_rating}</span>
                  <RatingStars rating={(path as any).avg_rating} />
                </div>
              )}
              <span className="pd-meta-item">
                <i className="bi bi-people" />{(path as any).enrolled_count ?? 0} enrolled
              </span>
              <span className="pd-meta-item">
                <i className="bi bi-collection" />{path.courses_count ?? 0} courses
              </span>
              {path.duration_weeks && (
                <span className="pd-meta-item">
                  <i className="bi bi-clock" />{path.duration_weeks} weeks
                </span>
              )}
            </div>

            {(path as any).creator && (
              <div className="pd-creator">
                <Avatar image={(path as any).creator.image} name={(path as any).creator.name} size={36} />
                <div>
                  <div className="pd-creator-name">{(path as any).creator.name}</div>
                  <div className="pd-creator-role">Path Creator</div>
                </div>
              </div>
            )}
          </div>

          {/* Courses list */}
          <div className="pd-section-card">
            <div className="pd-section-header">
              <h5><i className="bi bi-collection text-primary" /> Courses in this Path</h5>
              <span className="pd-count">{path.courses_count ?? 0} courses</span>
            </div>
            {((path.courses as Course[]) ?? []).length === 0 ? (
              <div className="pd-empty-state">
                <i className="bi bi-inbox" />No courses have been added to this path yet.
              </div>
            ) : (
              <div className="pd-courses-list">
                {(path.courses as Course[]).map((course, idx) => (
                  <div key={course.id} className="pd-course-item">
                    <div className="pd-course-number">{idx + 1}</div>
                    <div className="pd-course-info">
                      <div className="pd-course-title">{course.title}</div>
                      <div className="pd-course-meta">
                        {course.level && <span className="pd-course-level">{course.level}</span>}
                        <span>{course.lessons_count ?? 0} lessons</span>
                        <span>{course.topics_count ?? 0} topics</span>
                        {course.duration_weeks && <span>{course.duration_weeks} weeks</span>}
                      </div>
                    </div>
                    {course.thumbnail && (
                      <img
                        src={resolveImage(course.thumbnail, undefined, 'courses/thumbnails') ?? ''}
                        alt={course.title}
                        className="pd-course-thumb"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* What you'll achieve */}
          {(path as any).what_you_achieve && (
            <div className="pd-section-card pd-card-pad">
              <h5><i className="bi bi-trophy text-warning" /> What You'll Achieve</h5>
              <div className="pd-achieve-list">
                {(path as any).what_you_achieve.split('\n').map((item: string, i: number) => (
                  <div key={i} className="pd-achieve-item">
                    <i className="bi bi-check-circle-fill" />
                    <span>{item.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════ Sidebar ════ */}
        <div className="col-lg-4">
          <div className="pd-enroll-card">
            {thumbSrc ? (
              <img
                src={thumbSrc}
                alt={path.title}
                className="pd-thumb"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="pd-thumb-placeholder">
                <i className="bi bi-signpost-split" /><span>Learning Path</span>
              </div>
            )}

            <div className="pd-enroll-body">
              {!isEnrolled && isReady && (
                <PaymentTypeSelector
                  options={paymentOptions}
                  selected={selectedPayment}
                  onChange={opt => { setSelectedPayment(opt); setDiscountCode(''); }}
                />
              )}

              <div className="pd-price-cta-row">
                <PriceBlock
                  selectedPayment={selectedPayment}
                  discountInfo={discountInfo}
                  instructorLed={instructorLed}
                  instructorLedFee={instructorLedFee}
                  isFree={isFree}
                />
                <CtaButton
                  isEnrolled={isEnrolled}
                  isReady={isReady}
                  enrolling={enrolling}
                  totalPrice={totalPrice}
                  onEnroll={handleEnroll}
                  progress={progress}
                  slug={(path as any).slug}
                />
              </div>

              {hasInstructorOption && !isEnrolled && isReady && (
                <div className="pd-instructor-led-toggle">
                  <label htmlFor="pd-il-toggle" className="pd-il-label">
                    <input
                      id="pd-il-toggle"
                      type="checkbox"
                      className="form-check-input"
                      checked={instructorLed}
                      onChange={e => setInstructorLed(e.target.checked)}
                    />
                    <div className="pd-il-content">
                      <div className="pd-il-title">
                        <i className="bi bi-person-video3 me-1 text-primary" />
                        Instructor-led learning
                        <span className="badge bg-primary ms-2">
                          +₦{instructorLedFee.toLocaleString()}
                        </span>
                      </div>
                      <div className="pd-il-desc">
                        Get live sessions and direct feedback from an instructor.
                        Additional fee applies per{' '}
                        {selectedPayment.payment_type === 'one_time' ? 'enrollment' : 'billing period'}.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {!isReady && !isEnrolled && (
                <div className="pd-not-ready">
                  <i className="bi bi-hourglass-split" />
                  <div>
                    <strong>Content coming soon</strong>
                    <span>The creator is still preparing this path.</span>
                  </div>
                </div>
              )}

              {selectedPayment.payment_type !== 'free' && !isEnrolled && isReady && (
                <div className="pd-discount-row">
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
                    disabled={checkingDiscount || !discountCode}
                  >
                    {checkingDiscount ? <span className="spinner-border spinner-border-sm" /> : 'Apply'}
                  </button>
                </div>
              )}

              <div className="pd-includes">
                {includes.map((item, i) => (
                  <div key={i} className="pd-include-item">
                    <i className={`bi ${item.icon}`} />{item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="pd-sticky-cta" role="region" aria-label="Quick enroll">
        {isEnrolled ? (
          <div className="pd-sticky-price enrolled">
            Enrolled{progress > 0 ? ` · ${progress}%` : ''}
          </div>
        ) : (
          <div className="pd-sticky-price">
            <span className="pd-sticky-price-main">
              {isFree ? 'Free' : `₦${totalPrice.toLocaleString()}`}
            </span>
            {!isFree && (discountInfo?.valid || instructorLed) && (
              <span className="pd-sticky-price-orig">₦{selectedPayment.fee.toLocaleString()}</span>
            )}
          </div>
        )}
        <CtaButton
          isEnrolled={isEnrolled}
          isReady={isReady}
          enrolling={enrolling}
          totalPrice={totalPrice}
          onEnroll={handleEnroll}
          progress={progress}
          slug={(path as any).slug}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Outer loader — owns fetch state only, renders view once ready.
   ═══════════════════════════════════════════════════════════════════ */
export default function PathDetail() {
  const { slug } = useParams<{ slug: string }>();   // App.tsx uses :slug
  const navigate  = useNavigate();

  const [path,    setPath]    = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

//   useEffect(() => {
//     if (!slug) return;
//     setLoading(true);
//     setError(false);
//     pathsApi
//       .get(slug)                          // pass slug string; adjust if your API uses numeric id
//       .then(r => setPath(r.data))
//       .catch(() => { setError(true); navigate('/paths'); })
//       .finally(() => setLoading(false));
//   }, [slug, navigate]);

  // In the outer PathDetail component
    useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    pathsApi
        .getBySlug(slug)          // ← use slug endpoint
        .then(r => setPath(r.data))
        .catch(() => { setError(true); navigate('/paths'); })
        .finally(() => setLoading(false));
    }, [slug, navigate]);

  if (loading) return <Spinner />;
  if (error || !path) return null;        // navigate() already fired

  // Key on path.id so hook state resets cleanly on navigation between paths
  return <PathDetailView key={path.id} path={path} pathId={path.id} />;
}
