// src/pages/admin/AdminPathsPage.tsx
/**
 * AdminPathsPage — v6
 *
 * Changes vs v5
 * ─────────────────────────────────────────────────────────────────────────
 * 1. THUMBNAIL UPLOAD — Integrated ImageUpload component for path
 *    thumbnail upload with drag-and-drop, preview, and full URL.
 *    Uses the reusable ImageUpload component (DRY with CourseEditor).
 *
 * 2. TABLE PREVIEW — Thumbnail shown in table rows with hover zoom.
 *
 * 3. FULL URL RESOLUTION — All images use resolveImage() with
 *    'paths/thumbnails' folder for consistent URL generation.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { pathsApi, coursesApi } from '@/services/api';
import { LearningPath, Course, PathCreatePayload } from '@/types';
import {
  Spinner,
  Empty,
  PageTitle,
  Modal,
  StatusBadge,
} from '@/components/shared/index';
import ImageUpload from '@/components/shared/ImageUpload';
import { usePathThumbnail } from '@/hooks/usePathThumbnail';
import { resolveImage } from '@/utils/resolveImage';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface FormState {
  title:                 string;
  description:           string;
  fee:                   number;
  payment_type:          string;
  course_ids:            number[];
  issues_certificate:    boolean;
  duration_weeks:        number | undefined;
  instructor_led_fee:    number;
  instructor_led_only:   boolean;
  what_you_achieve:      string;
  thumbnail:             string | null;  // filename only

  // Subscription
  subscription_enabled:  boolean;
  subscription_interval: string;
  subscription_fee:      number | undefined;

  // Pay-as-you-go
  payg_enabled:          boolean;
  pay_as_you_go_fee:     number | undefined;
  access_period_days:    number;

  // Installment
  installment_enabled:   boolean;
  installment_count:     number | undefined;
  installment_fee:       number | undefined;
}

const DEFAULT_FORM: FormState = {
  title:                 '',
  description:           '',
  fee:                   0,
  payment_type:          'one_time',
  course_ids:            [],
  issues_certificate:    true,
  duration_weeks:        undefined,
  instructor_led_fee:    0,
  instructor_led_only:   false,
  what_you_achieve:      '',
  thumbnail:             null,

  subscription_enabled:  false,
  subscription_interval: 'monthly',
  subscription_fee:      undefined,

  payg_enabled:          false,
  pay_as_you_go_fee:     undefined,
  access_period_days:    30,

  installment_enabled:   false,
  installment_count:     undefined,
  installment_fee:       undefined,
};

/* ── Injected CSS ───────────────────────────────────────────────────── */

const PAGE_CSS = `
.path-course-list::-webkit-scrollbar { width: 3px; }
.path-course-list::-webkit-scrollbar-track { background: transparent; }
.path-course-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 99px;
}
.path-course-list::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
.path-course-list { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }

.path-course-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 0;
  user-select: none;
}
.path-course-item:last-child { border-bottom: none; }
.path-course-item:hover { background: var(--hover, rgba(0,0,0,0.04)); }
.path-course-item.is-selected { background: var(--primary-light, #eff6ff); }
.path-course-item.is-selected:hover { filter: brightness(0.97); }

.path-course-search { position: relative; }
.path-course-search .search-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 1;
}
.path-course-search input {
  padding-left: 2rem !important;
  border-radius: 0 !important;
  border-left: none !important;
  border-right: none !important;
  border-top: none !important;
  font-size: 0.8rem;
  box-shadow: none !important;
}

/* Payment model badge */
.payment-model-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 99px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.payment-model-badge.free        { background: #dcfce7; color: #166534; }
.payment-model-badge.one-time    { background: #eff6ff; color: #1d4ed8; }
.payment-model-badge.subscription{ background: #faf5ff; color: #7e22ce; }
.payment-model-badge.payg        { background: #fff7ed; color: #c2410c; }
.payment-model-badge.il-only     { background: #fff1f2; color: #be123c; }

/* Thumbnail in table */
.path-table-thumb {
  width: 48px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  transition: transform 0.2s;
}
.path-table-thumb:hover {
  transform: scale(2.5);
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
`;

/* ── Helpers ────────────────────────────────────────────────────────── */

function courseCount(p: LearningPath): number {
  if (typeof p.courses_count === 'number') return p.courses_count;
  if (Array.isArray(p.courses)) return p.courses.length;
  return 0;
}

function formatDuration(p: LearningPath): string {
  return p.duration_weeks ? `${p.duration_weeks}w` : 'Self-paced';
}

function effectiveFee(p: LearningPath): number {
  switch (p.payment_type) {
    case 'subscription':
      return (p.subscription_fee != null ? p.subscription_fee : p.fee) ?? 0;
    case 'pay_as_you_go':
      return (p.pay_as_you_go_fee != null ? p.pay_as_you_go_fee : p.fee) ?? 0;
    case 'free':
      return 0;
    default:
      return p.fee ?? 0;
  }
}

function PaymentModelBadge({ p }: { p: LearningPath }) {
  const ilOnly = (p as any).instructor_led_only;

  if (ilOnly) {
    return (
      <span className="payment-model-badge il-only">
        <i className="bi bi-person-video3" />IL Only
      </span>
    );
  }

  switch (p.payment_type) {
    case 'free':
      return <span className="payment-model-badge free"><i className="bi bi-lightning-fill" />Free</span>;
    case 'one_time':
      return <span className="payment-model-badge one-time"><i className="bi bi-credit-card" />One-time</span>;
    case 'subscription':
      return (
        <span className="payment-model-badge subscription">
          <i className="bi bi-arrow-repeat" />
          {(p.subscription_interval ?? 'monthly').charAt(0).toUpperCase() + (p.subscription_interval ?? 'monthly').slice(1)}
        </span>
      );
    case 'pay_as_you_go':
      return (
        <span className="payment-model-badge payg">
          <i className="bi bi-calendar-check" />PAYG · {p.access_period_days ?? 30}d
        </span>
      );
    default:
      return <span className="payment-model-badge one-time">{p.payment_type}</span>;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   PaymentConfigSection — Extracted for readability
   ══════════════════════════════════════════════════════════════════════ */

const PaymentConfigSection = ({ form, set }: { form: FormState; set: Function }) => (
  <>
    <div className="col-12 mt-1">
      <h6 className="text-primary mb-0">
        <i className="bi bi-credit-card me-1" />Payment Configuration
      </h6>
      <hr className="mt-2 mb-0" />
    </div>

    <div className="col-md-4">
      <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
        Primary / Default Model
      </label>
      <select
        className="form-select"
        value={form.payment_type}
        onChange={e => {
          set('payment_type', e.target.value);
          if (e.target.value === 'free') {
            set('subscription_enabled', false);
            set('payg_enabled', false);
            set('installment_enabled', false);
          }
        }}
      >
        <option value="free">Free</option>
        <option value="one_time">One-time</option>
        <option value="subscription">Subscription</option>
        <option value="pay_as_you_go">Pay-as-you-go</option>
        <option value="installment">Instalment Plan</option>
      </select>
      <div className="form-text">Shown first on the detail page</div>
    </div>

    {form.payment_type !== 'free' && (
      <div className="col-md-4">
        <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
          Base / One-time Price (₦)
        </label>
        <input
          type="number" className="form-control" min={0}
          value={form.fee}
          onChange={e => set('fee', Number(e.target.value))}
        />
        <div className="form-text">Fallback when model fee not set</div>
      </div>
    )}

    {form.payment_type !== 'free' && (
      <div className="col-md-4">
        <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
          Instructor-led Add-on (₦)
        </label>
        <input
          type="number" className="form-control" min={0}
          value={form.instructor_led_fee}
          onChange={e => {
            const val = Number(e.target.value);
            set('instructor_led_fee', val);
            if (val === 0) set('instructor_led_only', false);
          }}
        />
        <div className="form-text">0 = option not offered</div>
      </div>
    )}

    {form.instructor_led_fee > 0 && (
      <div className="col-12">
        <div
          className="d-flex align-items-start gap-2 p-3 rounded"
          style={{ background: 'var(--primary-light,#eff6ff)', border: '1px solid var(--primary-border,#bfdbfe)' }}
        >
          <input
            className="form-check-input mt-0 flex-shrink-0" type="checkbox"
            id="ilOnly" checked={form.instructor_led_only}
            onChange={e => set('instructor_led_only', e.target.checked)}
          />
          <label htmlFor="ilOnly" className="mb-0" style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
            <span className="fw-600">Instructor-led only</span>
            <span className="text-muted d-block" style={{ fontSize: '0.75rem', marginTop: 2 }}>
              Self-paced enrolment is disabled — students must choose instructor-led.
            </span>
          </label>
        </div>
      </div>
    )}

    {form.payment_type !== 'free' && (
      <div className="col-12 mt-2">
        <label className="form-label fw-600 d-block mb-2" style={{ fontSize: '0.8rem' }}>
          Additional Billing Options
          <span className="text-muted fw-400 ms-1">— students may choose any enabled option</span>
        </label>
        <div className="d-flex flex-column gap-3">

          {/* Subscription */}
          <div className="border rounded p-3">
            <div className="form-check mb-0">
              <input
                className="form-check-input" type="checkbox"
                id="subEnabled" checked={form.subscription_enabled}
                onChange={e => set('subscription_enabled', e.target.checked)}
              />
              <label className="form-check-label fw-600" htmlFor="subEnabled" style={{ fontSize: '0.82rem' }}>
                Subscription (recurring)
              </label>
            </div>
            {form.subscription_enabled && (
              <div className="row g-2 mt-2">
                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Billing Interval</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.subscription_interval}
                    onChange={e => set('subscription_interval', e.target.value)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Subscription Fee (₦)
                    <span className="text-muted ms-1">(optional)</span>
                  </label>
                  <input
                    type="number" className="form-control form-control-sm" min={0}
                    placeholder={form.fee > 0 ? `e.g. ${Math.round(form.fee * 0.9)}` : 'e.g. 4500'}
                    value={form.subscription_fee ?? ''}
                    onChange={e =>
                      set('subscription_fee', e.target.value !== '' ? Number(e.target.value) : undefined)
                    }
                  />
                  <div className="form-text" style={{ fontSize: '0.7rem' }}>Leave blank to use base price</div>
                </div>
              </div>
            )}
          </div>

          {/* Pay-as-you-go */}
          <div className="border rounded p-3">
            <div className="form-check mb-0">
              <input
                className="form-check-input" type="checkbox"
                id="paygEnabled" checked={form.payg_enabled}
                onChange={e => set('payg_enabled', e.target.checked)}
              />
              <label className="form-check-label fw-600" htmlFor="paygEnabled" style={{ fontSize: '0.82rem' }}>
                Pay-as-you-go (per period)
              </label>
            </div>
            {form.payg_enabled && (
              <div className="row g-2 mt-2">
                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Access Period (days)</label>
                  <input
                    type="number" className="form-control form-control-sm" min={1}
                    value={form.access_period_days}
                    onChange={e => set('access_period_days', Number(e.target.value))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Per-period Fee (₦)
                    <span className="text-muted ms-1">(optional)</span>
                  </label>
                  <input
                    type="number" className="form-control form-control-sm" min={0}
                    placeholder={form.fee > 0 ? String(form.fee) : 'e.g. 2000'}
                    value={form.pay_as_you_go_fee ?? ''}
                    onChange={e =>
                      set('pay_as_you_go_fee', e.target.value !== '' ? Number(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Instalment */}
          <div className="border rounded p-3">
            <div className="form-check mb-0">
              <input
                className="form-check-input" type="checkbox"
                id="instEnabled" checked={form.installment_enabled}
                onChange={e => set('installment_enabled', e.target.checked)}
              />
              <label className="form-check-label fw-600" htmlFor="instEnabled" style={{ fontSize: '0.82rem' }}>
                Instalment / Payment Plan
              </label>
            </div>
            {form.installment_enabled && (
              <div className="row g-2 mt-2">
                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Number of Instalments</label>
                  <input
                    type="number" className="form-control form-control-sm" min={2}
                    placeholder="e.g. 3"
                    value={form.installment_count ?? ''}
                    onChange={e =>
                      set('installment_count', e.target.value !== '' ? Number(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Per-instalment Fee (₦)</label>
                  <input
                    type="number" className="form-control form-control-sm" min={0}
                    placeholder="e.g. 5000"
                    value={form.installment_fee ?? ''}
                    onChange={e =>
                      set('installment_fee', e.target.value !== '' ? Number(e.target.value) : undefined)
                    }
                  />
                  {form.installment_count && form.installment_fee && (
                    <div className="form-text" style={{ fontSize: '0.7rem' }}>
                      Total: ₦{(form.installment_count * form.installment_fee).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    )}
  </>
);

/* ══════════════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════════════ */

export default function AdminPathsPage() {
  const [paths,       setPaths]       = useState<LearningPath[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editPath,    setEditPath]    = useState<LearningPath | null>(null);
  const [allCourses,  setAllCourses]  = useState<Course[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState<FormState>(DEFAULT_FORM);
  const [courseSearch,setCourseSearch]= useState('');

  const { uploading: uploadingThumbnail, uploadThumbnail } = usePathThumbnail();

  /* Inject page CSS once */
  useEffect(() => {
    if (document.getElementById('admin-paths-css')) return;
    const el = document.createElement('style');
    el.id    = 'admin-paths-css';
    el.textContent = PAGE_CSS;
    document.head.appendChild(el);
  }, []);

  /* ── Data ─────────────────────────────────────────────────────────── */
  const load = useCallback(() => {
    setLoading(true);
    pathsApi.list({ per_page: 50 })
      .then(r => setPaths(r.data.items || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    coursesApi.list({ per_page: 100, status: 'published' })
      .then(r => setAllCourses(r.data.items || []));
  }, [load]);

  /* ── Filtered + sorted course list ───────────────────────────────── */
  const visibleCourses = useMemo(() => {
    const q = courseSearch.toLowerCase().trim();
    const filtered = q
      ? allCourses.filter(c =>
          c.title.toLowerCase().includes(q) ||
          (c.level ?? '').toLowerCase().includes(q)
        )
      : allCourses;

    return [...filtered].sort((a, b) => {
      const aOn = form.course_ids.includes(a.id) ? 0 : 1;
      const bOn = form.course_ids.includes(b.id) ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return a.title.localeCompare(b.title);
    });
  }, [allCourses, courseSearch, form.course_ids]);

  /* ── Modal helpers ────────────────────────────────────────────────── */
  const openCreate = () => {
    setEditPath(null);
    setForm(DEFAULT_FORM);
    setCourseSearch('');
    setShowModal(true);
  };

  const openEdit = (p: LearningPath) => {
    setEditPath(p);
    const existingIds: number[] =
      p.course_ids ?? (Array.isArray(p.courses) ? p.courses.map((c: any) => c.id) : []);

    const subFee  = (p as any).subscription_fee  ?? undefined;
    const paygFee = (p as any).pay_as_you_go_fee ?? undefined;
    const instFee = (p as any).installment_fee   ?? undefined;

    setForm({
      title:                 p.title,
      description:           p.description || '',
      fee:                   p.fee ?? 0,
      payment_type:          p.payment_type || 'one_time',
      course_ids:            existingIds,
      issues_certificate:    p.issues_certificate ?? true,
      duration_weeks:        p.duration_weeks,
      instructor_led_fee:    p.instructor_led_fee ?? 0,
      instructor_led_only:   (p as any).instructor_led_only ?? false,
      what_you_achieve:      p.what_you_achieve || '',
      thumbnail:             p.thumbnail || null,

      subscription_enabled:  Boolean(subFee != null && subFee > 0),
      subscription_interval: p.subscription_interval || 'monthly',
      subscription_fee:      subFee,

      payg_enabled:          Boolean(paygFee != null && paygFee > 0),
      pay_as_you_go_fee:     paygFee,
      access_period_days:    p.access_period_days ?? 30,

      installment_enabled:   Boolean(instFee != null && instFee > 0),
      installment_count:     (p as any).installment_count ?? undefined,
      installment_fee:       instFee,
    });
    setCourseSearch('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPath(null);
    setForm(DEFAULT_FORM);
    setCourseSearch('');
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  /* ── Thumbnail upload callback ────────────────────────────────────── */
  const handleThumbnailUpload = useCallback(async (file: File) => {
    if (!editPath) {
      // For new paths, we need to create first then upload
      // Or we can store the file temporarily and upload after creation
      toast.error('Save the path first, then upload thumbnail');
      return null;
    }
    return await uploadThumbnail(editPath.id, file);
  }, [editPath, uploadThumbnail]);

  const handleThumbnailChange = useCallback((filename: string | null, url: string | null) => {
    set('thumbnail', filename);
  }, [set]);

  /* ── Validation ───────────────────────────────────────────────────── */
  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required';
    if (form.fee < 0)       return 'Base fee cannot be negative';
    if (form.instructor_led_fee < 0) return 'Instructor-led fee cannot be negative';

    const isFree    = form.payment_type === 'free';
    const ilOnly    = form.instructor_led_only;

    const hasOneTime = !isFree && form.fee > 0;
    const hasSub     = form.subscription_enabled && form.subscription_fee != null;
    const hasPayg    = form.payg_enabled && form.pay_as_you_go_fee != null;
    const hasInst    = form.installment_enabled &&
                       form.installment_fee != null && form.installment_count != null;

    if (!isFree && !ilOnly && !hasOneTime && !hasSub && !hasPayg && !hasInst) {
      return 'Configure at least one billing option with a price, or set the path to Free';
    }

    if (form.subscription_enabled && form.subscription_fee == null && form.fee === 0) {
      return 'Enter a subscription fee (or a base price as fallback)';
    }
    if (form.payg_enabled && form.pay_as_you_go_fee == null && form.fee === 0) {
      return 'Enter a per-period fee (or a base price as fallback)';
    }
    if (form.installment_enabled) {
      if (!form.installment_fee)  return 'Enter an instalment fee';
      if (!form.installment_count || form.installment_count < 2)
        return 'Instalment plan requires at least 2 payments';
    }
    if (ilOnly && form.instructor_led_fee === 0) {
      return 'Set an instructor-led fee before enabling instructor-led only mode';
    }

    return null;
  };

  /* ── Save ─────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setSaving(true);
    try {
      const isFree = form.payment_type === 'free';

      const payload: PathCreatePayload = {
        title:               form.title.trim(),
        description:         form.description || undefined,
        fee:                 isFree ? 0 : form.fee,
        payment_type:        form.payment_type,
        course_ids:          form.course_ids,
        issues_certificate:  form.issues_certificate,
        duration_weeks:      form.duration_weeks || undefined,
        instructor_led_fee:  form.instructor_led_fee || 0,
        instructor_led_only: form.instructor_led_only,
        what_you_achieve:    form.what_you_achieve || undefined,
        thumbnail:           form.thumbnail || undefined,

        subscription_interval: form.subscription_enabled
          ? form.subscription_interval
          : undefined,
        subscription_fee: isFree || !form.subscription_enabled
          ? undefined
          : form.subscription_fee,

        pay_as_you_go_fee: isFree || !form.payg_enabled
          ? undefined
          : form.pay_as_you_go_fee,
        access_period_days: form.payg_enabled ? form.access_period_days : undefined,

        installment_count: isFree || !form.installment_enabled
          ? undefined
          : form.installment_count,
        installment_fee: isFree || !form.installment_enabled
          ? undefined
          : form.installment_fee,
      };

      if (editPath) {
        await pathsApi.update(editPath.id, payload);
        toast.success('Path updated!');
      } else {
        await pathsApi.create(payload);
        toast.success('Learning path created!');
      }
      closeModal();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ───────────────────────────────────────────────────────── */
  const handleDelete = async (p: LearningPath) => {
    const confirmed = window.confirm(
      `Delete "${p.title}"?\n\n` +
      `This will remove the path and un-link its ${courseCount(p)} course(s). ` +
      `Student enrollments in individual courses are not affected.\n\n` +
      `This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await pathsApi.delete(p.id);
      toast.success('Path deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleCourse = (courseId: number) =>
    setForm(prev => ({
      ...prev,
      course_ids: prev.course_ids.includes(courseId)
        ? prev.course_ids.filter(id => id !== courseId)
        : [...prev.course_ids, courseId],
    }));

  /* ══════════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <PageTitle
          title="Learning Paths"
          subtitle="Create and manage structured multi-course programs"
          crumbs={[{ label: 'Admin' }, { label: 'Paths' }]}
        />
        <button className="btn btn-primary btn-icon-start" onClick={openCreate}>
          <i className="bi bi-plus-circle" /> Create Path
        </button>
      </div>

      {/* ── Table ── */}
      {loading ? <Spinner /> : paths.length === 0 ? (
        <Empty
          icon="bi-signpost-split"
          title="No learning paths yet"
          subtitle="Create structured multi-course programs for your students."
          action={{ label: 'Create Path', onClick: openCreate }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th style={{ width: 1 }}>Thumb</th>
                  <th>Path</th>
                  <th>Courses</th>
                  <th>Duration</th>
                  <th>Pricing</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paths.map(p => {
                  const fee = effectiveFee(p);
                  const thumbUrl = resolveImage(p.thumbnail, undefined, 'paths/thumbnails');
                  return (
                    <tr key={p.id}>
                      {/* Thumbnail */}
                      <td>
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={p.title}
                            className="path-table-thumb"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="path-table-thumb"
                            style={{
                              background: 'var(--surface-alt)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className="bi bi-signpost-split text-muted" style={{ fontSize: '0.75rem' }} />
                          </div>
                        )}
                      </td>

                      {/* Path title + description */}
                      <td>
                        <div className="d-flex align-items-start gap-2">
                          <div>
                            <div className="fw-600" style={{ fontSize: '0.875rem' }}>
                              <Link
                                to={`/paths/${(p as any).slug ?? p.id}`}
                                className="text-decoration-none text-inherit"
                                style={{ color: 'inherit' }}
                              >
                                {p.title}
                              </Link>
                            </div>
                            {p.description && (
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {p.description.slice(0, 70)}{p.description.length > 70 ? '…' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Course count */}
                      <td>
                        <span className="badge bg-primary-light text-primary fw-700">
                          {courseCount(p)}
                        </span>
                      </td>

                      {/* Duration */}
                      <td style={{ fontSize: '0.8rem' }}>{formatDuration(p)}</td>

                      {/* Pricing */}
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <PaymentModelBadge p={p} />
                          {p.payment_type !== 'free' && fee > 0 && (
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              ₦{fee.toLocaleString()}
                              {p.payment_type === 'subscription' && (
                                <span className="text-muted fw-400">
                                  /{(p.subscription_interval ?? 'mo').slice(0, 2)}
                                </span>
                              )}
                              {p.payment_type === 'pay_as_you_go' && (
                                <span className="text-muted fw-400">
                                  /{p.access_period_days ?? 30}d
                                </span>
                              )}
                            </div>
                          )}
                          {p.instructor_led_fee != null && p.instructor_led_fee > 0 && (
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              +₦{p.instructor_led_fee.toLocaleString()} IL
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td><StatusBadge status={p.status} /></td>

                      {/* Actions */}
                      <td>
                        <div className="d-flex gap-1">
                          <Link
                            to={`/paths/${(p as any).slug ?? p.id}`}
                            className="btn btn-sm btn-outline-secondary"
                            title="View path page"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <i className="bi bi-box-arrow-up-right" />
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEdit(p)}
                            title="Edit path"
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(p)}
                            title="Delete path"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Create / Edit Modal ══ */}
      <Modal
        show={showModal}
        onClose={closeModal}
        title={editPath ? `Edit: ${editPath.title}` : 'Create Learning Path'}
        size="xl"
        footer={
          <div className="d-flex gap-2 ms-auto">
            <button className="btn btn-outline-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary fw-600"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  {editPath ? 'Saving…' : 'Creating…'}
                </>
              ) : editPath ? 'Save Changes' : 'Create Path'}
            </button>
          </div>
        }
      >
        <div className="row g-3">

          {/* ── Basic Info ── */}
          <div className="col-12">
            <h6 className="text-primary mb-0">
              <i className="bi bi-info-circle me-1" />Basic Information
            </h6>
            <hr className="mt-2 mb-0" />
          </div>

          {/* Thumbnail Upload */}
          <div className="col-12">
            <ImageUpload
              value={form.thumbnail}
              onChange={handleThumbnailChange}
              onUpload={handleThumbnailUpload}
              uploading={uploadingThumbnail}
              label="Path Thumbnail"
              helpText="JPG, PNG, GIF, WebP, SVG. Max 5MB. 16:9 recommended."
              folder="paths/thumbnails"
              aspectRatio="16 / 9"
            />
          </div>

          <div className="col-md-8">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
              Path Title <span className="text-danger">*</span>
            </label>
            <input
              className="form-control"
              placeholder="e.g. Full Stack Development Bootcamp"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
              Duration (weeks)
            </label>
            <input
              type="number" className="form-control" min={0}
              placeholder="Auto from courses"
              value={form.duration_weeks ?? ''}
              onChange={e => set('duration_weeks', e.target.value ? Number(e.target.value) : undefined)}
            />
            <div className="form-text">Leave empty to auto-calculate</div>
          </div>

          <div className="col-12">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Description</label>
            <textarea
              className="form-control" rows={2}
              placeholder="What will students achieve by completing this path…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
              What You'll Achieve
              <span className="text-muted fw-400 ms-1">(one item per line)</span>
            </label>
            <textarea
              className="form-control" rows={3}
              placeholder={`Master React and Node.js\nBuild a full portfolio project\nDeploy to production`}
              value={form.what_you_achieve}
              onChange={e => set('what_you_achieve', e.target.value)}
            />
          </div>

          {/* ── Payment Configuration ── */}
          <PaymentConfigSection form={form} set={set} />

          {/* Certificate toggle */}
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="issuesCertificate"
                checked={form.issues_certificate}
                onChange={e => set('issues_certificate', e.target.checked)}
              />
              <label
                className="form-check-label fw-600"
                htmlFor="issuesCertificate"
                style={{ fontSize: '0.8rem' }}
              >
                Issue certificate on completion
              </label>
            </div>
          </div>

          {/* ── Course Selector ── */}
          <div className="col-12 mt-1">
            <h6 className="text-primary mb-0">
              <i className="bi bi-collection me-1" />Select Courses
              {form.course_ids.length > 0 && (
                <span className="badge bg-primary ms-2" style={{ fontSize: '0.65rem' }}>
                  {form.course_ids.length} selected
                </span>
              )}
            </h6>
            <hr className="mt-2 mb-0" />
          </div>

          <div className="col-12">
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>

              {/* Search */}
              <div className="path-course-search">
                <i className="bi bi-search search-icon" />
                <input
                  type="text"
                  className="form-control"
                  placeholder={`Search ${allCourses.length} course${allCourses.length !== 1 ? 's' : ''}…`}
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                />
              </div>

              {/* List */}
              <div className="path-course-list" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {allCourses.length === 0 ? (
                  <div className="text-center text-muted py-4" style={{ fontSize: '0.8rem' }}>
                    No published courses available
                  </div>
                ) : visibleCourses.length === 0 ? (
                  <div className="text-center text-muted py-4" style={{ fontSize: '0.8rem' }}>
                    No courses match "<strong>{courseSearch}</strong>"
                  </div>
                ) : (
                  visibleCourses.map(c => {
                    const isSelected = form.course_ids.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`path-course-item${isSelected ? ' is-selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input mt-0 flex-shrink-0"
                          checked={isSelected}
                          onChange={() => toggleCourse(c.id)}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="fw-600 text-truncate" style={{ fontSize: '0.8rem' }}>
                            {c.title}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {[
                              c.level,
                              `${c.lessons_count ?? 0} lessons`,
                              `${c.topics_count ?? 0} topics`,
                              (c.fee ?? 0) > 0 ? `₦${c.fee.toLocaleString()}` : 'Free',
                            ].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        {isSelected && (
                          <i
                            className="bi bi-check-circle-fill text-primary flex-shrink-0"
                            style={{ fontSize: '0.85rem' }}
                          />
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {allCourses.length > 0 && (
                <div
                  className="d-flex align-items-center justify-content-between px-3 py-2"
                  style={{
                    borderTop: '1px solid var(--border)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    background: 'var(--surface-alt, var(--surface))',
                  }}
                >
                  <span>
                    {courseSearch
                      ? `${visibleCourses.length} of ${allCourses.length} shown`
                      : `${allCourses.length} course${allCourses.length !== 1 ? 's' : ''}`}
                  </span>
                  {form.course_ids.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-link p-0 text-danger"
                      style={{ fontSize: '0.72rem', textDecoration: 'none' }}
                      onClick={() => set('course_ids', [])}
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </Modal>
    </div>
  );
}
