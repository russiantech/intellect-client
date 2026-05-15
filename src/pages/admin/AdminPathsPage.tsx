// pages/admin/AdminPathsPage.tsx
/**
 * AdminPathsPage — v4
 * + Searchable course selector with selected-first ordering
 * + Sleek 3px custom scrollbar
 * + Fixed payment validation (subscription/PAYG don't require base price)
 * + Instructor-led only mode
 */
import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { pathsApi, coursesApi } from '@/services/api';
import { LearningPath, Course, PathCreatePayload } from '@/types';
import { Spinner, Empty, PageTitle, Modal, StatusBadge } from '@/components/shared/index';

/* ── Types ──────────────────────────────────────────────────────────── */
interface FormState {
  title: string;
  description: string;
  fee: number;
  payment_type: string;
  course_ids: number[];
  issues_certificate: boolean;
  duration_weeks: number | undefined;
  instructor_led_fee: number;
  instructor_led_only: boolean;
  subscription_interval: string;
  subscription_fee: number | undefined;
  pay_as_you_go_fee: number | undefined;
  access_period_days: number;
  what_you_achieve: string;
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  fee: 0,
  payment_type: 'one_time',
  course_ids: [],
  issues_certificate: true,
  duration_weeks: undefined,
  instructor_led_fee: 0,
  instructor_led_only: false,
  subscription_interval: 'monthly',
  subscription_fee: undefined,
  pay_as_you_go_fee: undefined,
  access_period_days: 30,
  what_you_achieve: '',
};

/* ── Injected CSS ───────────────────────────────────────────────────── */
const SCROLLBAR_CSS = `
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

/* ══════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════ */
export default function AdminPathsPage() {
  const [paths, setPaths]             = useState<LearningPath[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editPath, setEditPath]       = useState<LearningPath | null>(null);
  const [allCourses, setAllCourses]   = useState<Course[]>([]);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState<FormState>(DEFAULT_FORM);
  const [courseSearch, setCourseSearch] = useState('');

  /* inject scrollbar CSS once */
  useEffect(() => {
    if (document.getElementById('path-page-css')) return;
    const el = document.createElement('style');
    el.id = 'path-page-css';
    el.textContent = SCROLLBAR_CSS;
    document.head.appendChild(el);
  }, []);

  /* ── Data ─────────────────────────────────────────────────────────── */
  const load = () => {
    setLoading(true);
    pathsApi.list({ per_page: 50 })
      .then(r => setPaths(r.data.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    coursesApi.list({ per_page: 100, status: 'published' })
      .then(r => setAllCourses(r.data.items || []));
  }, []);

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
      p.course_ids ?? (Array.isArray(p.courses) ? p.courses.map(c => c.id) : []);
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
      subscription_interval: p.subscription_interval || 'monthly',
      subscription_fee:      p.subscription_fee,
      pay_as_you_go_fee:     p.pay_as_you_go_fee,
      access_period_days:    p.access_period_days ?? 30,
      what_you_achieve:      p.what_you_achieve || '',
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

  /* ── Validation ───────────────────────────────────────────────────── */
  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required';
    if (form.fee < 0)       return 'Base fee cannot be negative';
    if (form.instructor_led_fee < 0) return 'Instructor-led fee cannot be negative';

    if (form.payment_type === 'one_time' && !form.instructor_led_only && form.fee === 0)
      return 'Enter a base price, or switch the payment model to Free';

    if (form.payment_type === 'subscription'
        && !form.subscription_fee
        && form.fee === 0)
      return 'Enter either a subscription fee or a base price';

    if (form.payment_type === 'pay_as_you_go'
        && !form.pay_as_you_go_fee
        && form.fee === 0)
      return 'Enter either a per-period fee or a base price';

    if (form.instructor_led_only && form.instructor_led_fee === 0)
      return 'Set an instructor-led fee before enabling instructor-led only mode';

    return null;
  };

  /* ── Save ─────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    const err = validate();
    if (err) return toast.error(err);

    setSaving(true);
    try {
      const payload: PathCreatePayload = {
        title:               form.title.trim(),
        description:         form.description || undefined,
        fee:                 form.payment_type === 'free' ? 0 : form.fee,
        payment_type:        form.payment_type,
        course_ids:          form.course_ids,
        issues_certificate:  form.issues_certificate,
        duration_weeks:      form.duration_weeks || undefined,
        instructor_led_fee:  form.instructor_led_fee || 0,
        instructor_led_only: form.instructor_led_only,
        what_you_achieve:    form.what_you_achieve || undefined,
        subscription_interval:
          form.payment_type === 'subscription' ? form.subscription_interval : undefined,
        subscription_fee:
          form.payment_type === 'subscription' ? form.subscription_fee : undefined,
        pay_as_you_go_fee:
          form.payment_type === 'pay_as_you_go' ? form.pay_as_you_go_fee : undefined,
        access_period_days:
          form.payment_type === 'pay_as_you_go' ? form.access_period_days : undefined,
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
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await pathsApi.delete(p.id);
      toast.success('Path deleted');
      load();
    } catch { toast.error('Delete failed'); }
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
          subtitle="Create and manage structured learning programs"
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
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Courses</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paths.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="fw-600" style={{ fontSize: '0.875rem' }}>{p.title}</div>
                      {p.description && (
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {p.description.slice(0, 60)}{p.description.length > 60 ? '…' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-primary-light text-primary fw-700">
                        {courseCount(p)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDuration(p)}</td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {(p.fee ?? 0) > 0
                        ? `₦${p.fee.toLocaleString()}`
                        : <span className="text-success fw-600">Free</span>}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openEdit(p)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(p)}
                          title="Delete"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Modal ══ */}
      <Modal
        show={showModal}
        onClose={closeModal}
        title={editPath ? 'Edit Learning Path' : 'Create Learning Path'}
        size="xl"
        footer={
          <div className="d-flex gap-2 ms-auto">
            <button className="btn btn-outline-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary fw-600" onClick={handleSave} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" />{editPath ? 'Saving…' : 'Creating…'}</>
                : editPath ? 'Save Changes' : 'Create Path'}
            </button>
          </div>
        }
      >
        <div className="row g-3">

          {/* ─── Basic Info ─── */}
          <div className="col-12">
            <h6 className="text-primary mb-0">
              <i className="bi bi-info-circle me-1" />Basic Information
            </h6>
            <hr className="mt-2 mb-0" />
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

          {/* ─── Payment ─── */}
          <div className="col-12 mt-1">
            <h6 className="text-primary mb-0">
              <i className="bi bi-credit-card me-1" />Payment Configuration
            </h6>
            <hr className="mt-2 mb-0" />
          </div>

          <div className="col-md-4">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Payment Model</label>
            <select
              className="form-select"
              value={form.payment_type}
              onChange={e => set('payment_type', e.target.value)}
            >
              <option value="free">Free</option>
              <option value="one_time">One-time Payment</option>
              <option value="subscription">Subscription</option>
              <option value="pay_as_you_go">Pay-as-you-go</option>
            </select>
          </div>

          {form.payment_type !== 'free' && (
            <div className="col-md-4">
              <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
                Base Price (₦)
                {(form.payment_type === 'subscription' || form.payment_type === 'pay_as_you_go') && (
                  <span className="text-muted fw-400 ms-1">(optional)</span>
                )}
              </label>
              <input
                type="number" className="form-control" min={0}
                value={form.fee}
                onChange={e => set('fee', Number(e.target.value))}
              />
              {(form.payment_type === 'subscription' || form.payment_type === 'pay_as_you_go') && (
                <div className="form-text">Used as fallback if specific fee not set below</div>
              )}
            </div>
          )}

          <div className="col-md-4">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
              Instructor-led Fee (₦)
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

          {/* Instructor-led only — only visible when fee > 0 */}
          {form.instructor_led_fee > 0 && (
            <div className="col-12">
              <div
                className="d-flex align-items-start gap-2 p-3 rounded"
                style={{ background: 'var(--primary-light, #eff6ff)', border: '1px solid var(--primary-border, #bfdbfe)' }}
              >
                <input
                  className="form-check-input mt-0 flex-shrink-0"
                  type="checkbox"
                  id="ilOnly"
                  checked={form.instructor_led_only}
                  onChange={e => set('instructor_led_only', e.target.checked)}
                />
                <label htmlFor="ilOnly" className="mb-0" style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
                  <span className="fw-600">Instructor-led only</span>
                  <span className="text-muted d-block" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                    Students must select the instructor-led option to enroll. Self-paced enrollment will not be available.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Subscription extras */}
          {form.payment_type === 'subscription' && (
            <>
              <div className="col-md-4">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Billing Interval</label>
                <select
                  className="form-select"
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
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
                  Subscription Fee (₦)
                  <span className="text-muted fw-400 ms-1">(optional)</span>
                </label>
                <input
                  type="number" className="form-control" min={0}
                  placeholder={form.fee > 0 ? String(Math.round(form.fee * 0.9)) : 'e.g. 4500'}
                  value={form.subscription_fee ?? ''}
                  onChange={e => set('subscription_fee', e.target.value ? Number(e.target.value) : undefined)}
                />
                <div className="form-text">Overrides base price for recurring billing</div>
              </div>
            </>
          )}

          {/* Pay-as-you-go extras */}
          {form.payment_type === 'pay_as_you_go' && (
            <>
              <div className="col-md-4">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Access Period (days)</label>
                <input
                  type="number" className="form-control" min={1}
                  value={form.access_period_days}
                  onChange={e => set('access_period_days', Number(e.target.value))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>
                  Per-period Fee (₦)
                  <span className="text-muted fw-400 ms-1">(optional)</span>
                </label>
                <input
                  type="number" className="form-control" min={0}
                  placeholder={form.fee > 0 ? String(form.fee) : 'e.g. 2000'}
                  value={form.pay_as_you_go_fee ?? ''}
                  onChange={e => set('pay_as_you_go_fee', e.target.value ? Number(e.target.value) : undefined)}
                />
                <div className="form-text">Overrides base price per access window</div>
              </div>
            </>
          )}

          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="issuesCertificate"
                checked={form.issues_certificate}
                onChange={e => set('issues_certificate', e.target.checked)}
              />
              <label className="form-check-label fw-600" htmlFor="issuesCertificate"
                style={{ fontSize: '0.8rem' }}>
                Issue certificate on completion
              </label>
            </div>
          </div>

          {/* ─── Course Selector ─── */}
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
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}>
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
                ) : visibleCourses.map(c => {
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
                })}
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
