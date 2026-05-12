import { projectsApi } from "@/services/api";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

/* ═══════════════════════════════════════════════════════════
   ProjectBriefPanel  (unchanged — self-contained)
   ═══════════════════════════════════════════════════════════ */
export function ProjectBriefPanel({ courseId }: { courseId: number }) {
  const [open,     setOpen]     = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [editId,   setEditId]   = useState<number | null>(null);

  const emptyForm = { title: '', description: '', rubric: '', due_date: '', allowed_formats: '' };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    projectsApi.listForCourse(courseId)
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open) load(); }, [open]);

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description required');
      return;
    }
    setSaving(true);
    try {
      editId
        ? await projectsApi.update(editId, {
            title: form.title, description: form.description,
            rubric: form.rubric || undefined, due_date: form.due_date || undefined,
          })
        : await projectsApi.create(
            courseId,
            {
            ...form,
            course_id:       courseId,
            due_date:        form.due_date        || undefined,
            rubric:          form.rubric          || undefined,
            allowed_formats: form.allowed_formats || undefined,
          });
      toast.success(editId ? 'Project updated!' : 'Project created!');
      setForm(emptyForm);
      setEditId(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!window.confirm('Delete this project brief?')) return;
    try {
      await projectsApi.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      title: p.title, description: p.description,
      rubric: p.rubric || '',
      due_date: p.due_date ? p.due_date.split('T')[0] : '',
      allowed_formats: p.allowed_formats || '',
    });
    setOpen(true);
  };

  return (
    <div className="project-brief-section mt-4 mb-2">
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className="bi bi-folder2-open text-primary" />
        <span className="fw-700" style={{ fontSize: '0.875rem' }}>Course Project Briefs</span>
        <button
          className="btn btn-sm btn-outline-primary ms-auto"
          style={{ fontSize: '0.75rem' }}
          onClick={() => { setOpen(p => !p); setForm(emptyForm); setEditId(null); }}
        >
          <i className={`bi ${open ? 'bi-chevron-up' : 'bi-plus-circle'} me-1`} />
          {open ? 'Close' : 'Add Project'}
        </button>
      </div>

      {loading && (
        <div className="text-muted small">
          <span className="spinner-border spinner-border-sm me-2" />Loading…
        </div>
      )}
      {projects.map(p => (
        <div key={p.id} className="d-flex align-items-center gap-2 p-2 border rounded mb-1" style={{ fontSize: '0.82rem' }}>
          <i className="bi bi-folder-fill text-warning" />
          <span className="flex-1 fw-600">{p.title}</span>
          {p.due_date && <span className="text-muted">{new Date(p.due_date).toLocaleDateString()}</span>}
          <button className="btn btn-sm btn-outline-secondary p-0 px-2" onClick={() => startEdit(p)}>
            <i className="bi bi-pencil" />
          </button>
          <button className="btn btn-sm btn-outline-danger p-0 px-2" onClick={() => del(p.id)}>
            <i className="bi bi-trash" />
          </button>
        </div>
      ))}

      {open && (
        <div className="project-brief-form p-3 border rounded-3 mt-2" style={{ background: 'var(--bg)' }}>
          <div className="row g-2 mb-2">
            <div className="col-12 col-sm-8">
              <label className="form-label fw-600 small mb-1">Project Title *</label>
              <input
                className="form-control form-control-sm"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Build a Personal Portfolio Website"
              />
            </div>
            <div className="col-12 col-sm-4">
              <label className="form-label fw-600 small mb-1">Due Date</label>
              <input
                type="date" className="form-control form-control-sm"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="mb-2">
            <label className="form-label fw-600 small mb-1">Description *</label>
            <textarea
              className="form-control form-control-sm" rows={4}
              placeholder="Describe what the student must build or submit…"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="mb-2">
            <label className="form-label fw-600 small mb-1">
              Grading Rubric <span className="text-muted">(optional markdown)</span>
            </label>
            <textarea
              className="form-control form-control-sm" rows={3}
              placeholder={'- Functionality: 40pts\n- Design: 30pts\n- Code quality: 30pts'}
              value={form.rubric}
              onChange={e => setForm(p => ({ ...p, rubric: e.target.value }))}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-600 small mb-1">
              Allowed Formats <span className="text-muted">(comma-separated, blank = any)</span>
            </label>
            <input
              className="form-control form-control-sm"
              value={form.allowed_formats}
              onChange={e => setForm(p => ({ ...p, allowed_formats: e.target.value }))}
              placeholder="pdf,zip,docx"
            />
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => { setOpen(false); setForm(emptyForm); setEditId(null); }}>
              Cancel
            </button>
            <button className="btn btn-sm btn-primary fw-600" onClick={save} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                : <><i className="bi bi-check me-1" />{editId ? 'Update' : 'Create'} Project</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

