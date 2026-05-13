import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { pathsApi, coursesApi } from '@/services/api';
import { LearningPath, Course } from '@/types';
import { Spinner, Empty, PageTitle, Modal, StatusBadge } from '@/components/shared/index';

export default function AdminPathsPage() {
  const [paths, setPaths]         = useState<LearningPath[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editPath, setEditPath]   = useState<LearningPath | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', fee: '0', payment_type: 'one_time',
    course_ids: [] as number[],
  });

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

  const openCreate = () => {
    setEditPath(null);
    setForm({ title: '', description: '', fee: '0', payment_type: 'one_time', course_ids: [] });
    setShowCreate(true);
  };

  const openEdit = (p: LearningPath) => {
    setEditPath(p);

    /*
     * FIX: p.courses may be undefined (e.g. the list endpoint returns only
     * courses_count, not the full course objects).  We fall back safely:
     *   - p.courses is a populated array  → map to IDs as before
     *   - p.courses is undefined/null     → start with an empty selection
     *     (the admin can re-select; this beats a TypeError crash)
     *
     * If your list endpoint CAN return course IDs, add a
     * `course_ids?: number[]` field to the LearningPath type and use that:
     *   course_ids: p.course_ids ?? (p.courses ?? []).map((c: any) => c.id),
     */
    const existingIds: number[] = Array.isArray(p.courses)
      ? (p.courses as any[]).map((c: any) => c.id)
      : [];

    setForm({
      title:        p.title,
      description:  p.description || '',
      fee:          String(p.fee ?? 0),
      payment_type: p.payment_type || 'one_time',
      course_ids:   existingIds,
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.title) return toast.error('Title is required');
    setSaving(true);
    try {
      const payload = {
        title:        form.title,
        description:  form.description || undefined,
        fee:          Number(form.fee),
        payment_type: form.payment_type,
        course_ids:   form.course_ids,
      };
      if (editPath) {
        await pathsApi.update(editPath.id, payload);
        toast.success('Path updated!');
      } else {
        await pathsApi.create(payload);
        toast.success('Learning path created!');
      }
      setShowCreate(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: LearningPath) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try {
      await pathsApi.delete(p.id);
      toast.success('Path deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const toggleCourse = (courseId: number) => {
    setForm(prev => ({
      ...prev,
      course_ids: prev.course_ids.includes(courseId)
        ? prev.course_ids.filter(id => id !== courseId)
        : [...prev.course_ids, courseId],
    }));
  };

  /* ── Derive course count safely ── */
  const courseCount = (p: LearningPath): number => {
    if (typeof p.courses_count === 'number') return p.courses_count;
    if (Array.isArray(p.courses)) return p.courses.length;
    return 0;
  };

  return (
    <div className="fade-in">
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
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(p)}
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

      {/* ── Create / Edit Modal ── */}
      <Modal
        show={showCreate}
        onClose={() => setShowCreate(false)}
        title={editPath ? 'Edit Learning Path' : 'Create Learning Path'}
        size="lg"
        footer={
          <div className="d-flex gap-2 ms-auto">
            <button className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary fw-600"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" />{editPath ? 'Saving…' : 'Creating…'}</>
                : editPath ? 'Save Changes' : 'Create Path'}
            </button>
          </div>
        }
      >
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Path Title *</label>
            <input
              className="form-control"
              placeholder="e.g. Full Stack Development Bootcamp"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Description</label>
            <textarea
              className="form-control" rows={3}
              placeholder="What will students achieve by completing this path…"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="col-sm-6">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Payment Model</label>
            <select
              className="form-select"
              value={form.payment_type}
              onChange={e => setForm(p => ({ ...p, payment_type: e.target.value }))}
            >
              <option value="free">Free</option>
              <option value="one_time">One-time Payment</option>
              <option value="subscription">Subscription</option>
            </select>
          </div>

          {form.payment_type !== 'free' && (
            <div className="col-sm-6">
              <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Price (₦)</label>
              <input
                type="number" className="form-control" min={0}
                value={form.fee}
                onChange={e => setForm(p => ({ ...p, fee: e.target.value }))}
              />
            </div>
          )}

          <div className="col-12">
            <label className="form-label fw-600 d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
              Select Courses
              <span className="badge bg-primary" style={{ fontSize: '0.65rem' }}>
                {form.course_ids.length} selected
              </span>
            </label>
            {editPath && !Array.isArray(editPath.courses) && (
              <div className="alert alert-warning py-2 mb-2" style={{ fontSize: '0.75rem' }}>
                <i className="bi bi-info-circle me-1" />
                Previously assigned courses are not shown in edit mode because
                the list API doesn't return full course objects. Re-select all
                courses that should be part of this path.
              </div>
            )}
            <div style={{
              maxHeight: 220, overflowY: 'auto',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            }}>
              {allCourses.length === 0 ? (
                <div className="text-center text-muted py-3" style={{ fontSize: '0.8rem' }}>
                  No published courses available
                </div>
              ) : allCourses.map(c => (
                <label
                  key={c.id}
                  className={`d-flex align-items-center gap-3 p-2 cursor-pointer ${form.course_ids.includes(c.id) ? 'bg-primary-light' : ''}`}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    transition: 'var(--transition)',
                    marginBottom: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    checked={form.course_ids.includes(c.id)}
                    onChange={() => toggleCourse(c.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="fw-600 text-truncate" style={{ fontSize: '0.8rem' }}>{c.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {c.level} · {c.lessons_count} lessons · {(c.fee ?? 0) > 0 ? `₦${c.fee.toLocaleString()}` : 'Free'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
