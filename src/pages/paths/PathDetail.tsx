// pages/paths/PathDetail.tsx
/**
 * PathDetail — payment-type fix
 *
 * What was wrong
 * ─────────────────────────────────────────────────────────────────────────
 * 1. isFree  — `fee === 0` is NOT sufficient to determine free enrollment.
 *    A subscription or pay_as_you_go path whose generic `fee` column is 0
 *    would show "Free" and bypass Paystack.  Only payment_type === 'free'
 *    is truly free.
 *
 * 2. derivePaymentOptions  — was always reading the generic `.fee` column.
 *    For subscription paths the real charge is in `subscription_fee`; for
 *    pay_as_you_go it is in `pay_as_you_go_fee`.  These fields are now
 *    returned by the backend and used here.
 *
 * 3. User choice  — when the backend returns available_payment_types with
 *    multiple entries (e.g. both subscription and one_time are offered), the
 *    PaymentTypeSelector pill-switcher shows all options.  Each option now
 *    carries the correct fee so prices update correctly on switch.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { pathsApi } from '@/services/api';
import { LearningPath, Course } from '@/types';
import { Spinner, StatusBadge, RatingStars, Avatar } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';
import {
  useEnrollmentPayment,
  PaymentOption,
  DiscountInfo,
} from '@/hooks/useEnrollmentPayment';
import { resolveImage } from '@/utils/resolveImage';
import '@/styles/pages/paths/PathDetail.css';

/* ═══════════════════════════════════════════════════════════════════════
   Pure helpers
   ═══════════════════════════════════════════════════════════════════════ */

function mediaUrl(p: string | null | undefined) {
  return resolveImage(p, undefined, 'paths/thumbnails') ?? undefined;
}

function paymentTypeLabel(type: string, interval?: string): string {
  switch (type) {
    case 'free':          return 'Free';
    case 'one_time':      return 'One-time';
    case 'subscription': {
      const map: Record<string, string> = {
        weekly: 'Weekly', monthly: 'Monthly',
        quarterly: 'Quarterly', yearly: 'Yearly',
      };
      return map[(interval ?? 'monthly').toLowerCase()] ?? 'Subscription';
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
      return 'Pay once and keep lifetime access to all courses in this path.';
    case 'subscription': {
      const interval = opt.subscription_interval ?? 'monthly';
      return `Billed every ${interval}. Cancel anytime. Access continues while active.`;
    }
    case 'pay_as_you_go': {
      const days = opt.access_period_days ?? 30;
      return `Each payment unlocks ${days} days of access. Renew when your period expires.`;
    }
    default: return '';
  }
}

/**
 * Derive selectable billing options from the path API response.
 *
 * Priority order:
 *  1. path.available_payment_types[]  — returned by backend when configured
 *  2. Individual type fields           — synthesised fallback
 *
 * CRITICAL: each option's `fee` must be the ACTUAL charge for that billing
 * model, not the generic `path.fee` column.
 *   subscription  → subscription_fee  (fallback: fee)
 *   pay_as_you_go → pay_as_you_go_fee (fallback: fee)
 *   one_time      → fee
 *   free          → 0
 */
function derivePaymentOptions(path: LearningPath): PaymentOption[] {
  const raw: any[] = (path as any).available_payment_types ?? [];
  if (raw.length > 0) {
    return raw.map((r: any) => ({
      payment_type:          r.payment_type,
      fee:                   Number(r.fee ?? 0),
      subscription_interval: r.subscription_interval,
      access_period_days:    r.access_period_days,
      label:                 paymentTypeLabel(r.payment_type, r.subscription_interval),
    }));
  }

  // Fallback: synthesise from individual fields
  const type = path.payment_type ?? 'one_time';
  let fee: number;

  if (type === 'free') {
    fee = 0;
  } else if (type === 'subscription') {
    // subscription_fee is the recurring charge; fall back to fee
    fee = Number((path as any).subscription_fee || path.fee || 0);
  } else if (type === 'pay_as_you_go') {
    // pay_as_you_go_fee is the per-window charge; fall back to fee
    fee = Number((path as any).pay_as_you_go_fee || path.fee || 0);
  } else {
    fee = Number(path.fee || 0);
  }

  return [{
    payment_type:          type,
    fee,
    subscription_interval: (path as any).subscription_interval,
    access_period_days:    (path as any).access_period_days ?? 30,
    label:                 paymentTypeLabel(type, (path as any).subscription_interval),
  }];
}

/* ═══════════════════════════════════════════════════════════════════════
   Sub-components — outside PathDetailView so they are never remounted
   ═══════════════════════════════════════════════════════════════════════ */

function PaymentTypeSelector({
  options, selected, onChange,
}: {
  options:  PaymentOption[];
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
            {opt.payment_type === 'free' ? (
              <span className="pd-payment-pill-price free">Free</span>
            ) : opt.fee > 0 ? (
              <span className="pd-payment-pill-price">₦{opt.fee.toLocaleString()}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function PriceBlock({
  selectedPayment, discountInfo, instructorLed, instructorLedFee, isFree,
}: {
  selectedPayment:  PaymentOption | null;
  discountInfo:     DiscountInfo | null;
  instructorLed:    boolean;
  instructorLedFee: number;
  isFree:           boolean;
}) {
  if (!selectedPayment) return null;

  const discountedBase = discountInfo?.valid ? discountInfo.final_price : selectedPayment.fee;
  const total          = discountedBase + (instructorLed ? instructorLedFee : 0);

  if (isFree && !instructorLed) {
    return (
      <div className="pd-price-block">
        <span className="pd-price-free">
          <i className="bi bi-lightning-fill me-1" />Free
        </span>
        {instructorLedFee > 0 && (
          <div className="pd-price-type">+ ₦{instructorLedFee.toLocaleString()} for instructor-led</div>
        )}
      </div>
    );
  }

  // Billing period suffix for compact display
  const periodSuffix = selectedPayment.payment_type === 'subscription'
    ? `/${selectedPayment.subscription_interval ?? 'month'}`
    : selectedPayment.payment_type === 'pay_as_you_go'
    ? `/${selectedPayment.access_period_days ?? 30} days`
    : '';

  return (
    <div className="pd-price-block">
      <span className="pd-price-main">
        ₦{total.toLocaleString()}
        <span className="pd-price-period">{periodSuffix}</span>
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
  isEnrolled, isReady, enrolling, isFree, totalPrice, onEnroll, progress, slug,
}: {
  isEnrolled: boolean;
  isReady:    boolean;
  enrolling:  boolean;
  isFree:     boolean;
  totalPrice: number;
  onEnroll:   () => void;
  progress:   number;
  slug?:      string;
}) {
  if (isEnrolled) {
    return (
      <Link to={slug ? `/learn/${slug}` : '/my-courses'} className="pd-cta-btn success">
        <i className="bi bi-play-fill" />
        Continue Learning
        {progress > 0 && <span className="pd-progress-badge">{progress}%</span>}
      </Link>
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
      {enrolling ? (
        <>
          <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
          {' '}Processing…
        </>
      ) : (
        <>
          <i className={`bi ${isFree ? 'bi-lightning-fill' : 'bi-lock-fill'}`} />
          {isFree ? 'Enroll for Free' : `Enroll · ₦${totalPrice.toLocaleString()}`}
        </>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PathDetailView — rendered only once path is loaded
   ═══════════════════════════════════════════════════════════════════════ */

function PathDetailView({ path, pathId }: { path: LearningPath; pathId: number }) {
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const paymentOptions      = useMemo(() => derivePaymentOptions(path), [path]);
  const instructorLedFee    = useMemo(() => Number((path as any).instructor_led_fee ?? 0), [path]);
  const hasInstructorOption = instructorLedFee > 0;
  const pathSlug            = (path as any).slug as string | undefined;

  const {
    enrolling,
    selectedPayment,
    setSelectedPayment,
    instructorLed,
    setInstructorLed,
    discountCode,
    setDiscountCode,
    discountInfo,
    setDiscountInfo,
    checkingDiscount,
    checkDiscount,
    handleEnroll,
    totalPrice,
  } = useEnrollmentPayment({
    itemId:          pathId,
    itemType:        'path',
    slug:            pathSlug,
    paymentOptions,
    instructorLedFee,
    user,
    navigate,
  });

  /* Redirect-callback safety net (Paystack appends ?reference= on mobile) */
  useEffect(() => {
    const ref = searchParams.get('reference') || searchParams.get('trxref');
    if (!ref) return;
    handleEnroll();
    if (pathSlug) navigate(`/paths/${pathSlug}`, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedPayment) return <Spinner />;

  /**
   * isFree — ONLY when payment_type is explicitly 'free'.
   * Do NOT use `fee === 0` here; subscription/PAYG courses whose fee
   * column is 0 (base price not set, billing via subscription_fee /
   * pay_as_you_go_fee) must go through the paid Paystack flow.
   */
  const isFree     = selectedPayment.payment_type === 'free';
  const isEnrolled = !!path.is_enrolled;
  const isReady    = (path.courses_count ?? 0) > 0;
  const progress   = (path as any).progress_pct ?? 0;
  const thumbSrc   = mediaUrl(path.thumbnail);

  const includes = [
    { icon: 'bi-collection', label: `${path.courses_count ?? 0} courses` },
    { icon: 'bi-award',      label: 'Certificate on completion' },
    { icon: 'bi-phone',      label: 'Mobile & desktop access' },
    ...(path.duration_weeks ? [{ icon: 'bi-clock', label: `${path.duration_weeks} weeks` }] : []),
    ...(selectedPayment.payment_type === 'one_time'
      ? [{ icon: 'bi-infinity', label: 'Lifetime access' }]
      : []),
    ...(selectedPayment.payment_type === 'pay_as_you_go'
      ? [{ icon: 'bi-arrow-repeat', label: `${selectedPayment.access_period_days ?? 30}-day access windows` }]
      : []),
  ];

  return (
    <div className="pd-root fade-in">

      {/* Breadcrumb */}
      <nav className="pd-breadcrumb" aria-label="Breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/paths">Paths</Link></li>
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
                <Avatar
                  image={(path as any).creator.image}
                  name={(path as any).creator.name}
                  size={36}
                />
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
                <i className="bi bi-inbox" />No courses added yet.
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
        {/* ── end col-lg-8 ── */}

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

              {/* Payment type selector — multi-option pill switcher */}
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
                  isFree={isFree}
                  totalPrice={totalPrice}
                  onEnroll={handleEnroll}
                  progress={progress}
                  slug={pathSlug}
                />
              </div>

              {/* Instructor-led toggle */}
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
                        Additional fee per{' '}
                        {selectedPayment.payment_type === 'one_time' ? 'enrollment' : 'billing period'}.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Not-ready notice */}
              {!isReady && !isEnrolled && (
                <div className="pd-not-ready">
                  <i className="bi bi-hourglass-split" />
                  <div>
                    <strong>Content coming soon</strong>
                    <span>The creator is still preparing this path.</span>
                  </div>
                </div>
              )}

              {/* Discount code — only for paid types */}
              {!isFree && !isEnrolled && isReady && (
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
                    {checkingDiscount
                      ? <span className="spinner-border spinner-border-sm" />
                      : 'Apply'}
                  </button>
                </div>
              )}

              {/* Includes */}
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
        {/* ── end col-lg-4 ── */}

      </div>

      {/* ══ Mobile sticky CTA ══ */}
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
          isFree={isFree}
          totalPrice={totalPrice}
          onEnroll={handleEnroll}
          progress={progress}
          slug={pathSlug}
        />
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Outer loader
   ═══════════════════════════════════════════════════════════════════════ */

export default function PathDetail() {
  const { slug }  = useParams<{ slug: string }>();
  const navigate  = useNavigate();

  const [path,    setPath]    = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    pathsApi
      .getBySlug(slug)
      .then(r  => setPath(r.data))
      .catch(() => { setError(true); navigate('/paths'); })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading)        return <Spinner />;
  if (error || !path) return null;

  return <PathDetailView key={path.id} path={path} pathId={path.id} />;
}

