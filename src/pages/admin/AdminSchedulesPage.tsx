import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { adminApi, coursesApi, usersApi } from '@/services/api';
import { Spinner, Empty, PageTitle, Modal, Avatar } from '@/components/shared/index';

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    meeting_link: '',
    course_id: '',
    tutor_id: '',
    is_recurring: false,
  });

  const load = () => {
    setLoading(true);
    adminApi.listSchedules()
      .then(r => setSchedules(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    coursesApi.list({ per_page: 100, status: 'published' }).then(r => setCourses(r.data.items || []));
    usersApi.listUsers({ role: 'tutor', per_page: 50 }).then(r => setTutors(r.data.items || []));
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.start_time || !form.end_time) {
      return toast.error('Title, start time and end time are required');
    }
    setSaving(true);
    try {
      await adminApi.createSchedule({
        title: form.title,
        description: form.description || undefined,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        meeting_link: form.meeting_link || undefined,
        course_id: form.course_id ? Number(form.course_id) : undefined,
        is_recurring: form.is_recurring,
      });
      toast.success('Schedule created!');
      setShowCreate(false);
      setForm({ title: '', description: '', start_time: '', end_time: '', meeting_link: '', course_id: '', tutor_id: '', is_recurring: false });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Create failed');
    } finally { setSaving(false); }
  };

  const upcoming = schedules.filter(s => new Date(s.start_time) >= new Date());
  const past = schedules.filter(s => new Date(s.start_time) < new Date());

  return (
    <div className="fade-in">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <PageTitle
          title="Schedules"
          subtitle="Manage live sessions and class timetables"
          crumbs={[{ label: 'Admin' }, { label: 'Schedules' }]}
        />
        <button className="btn btn-primary btn-icon-start" onClick={() => setShowCreate(true)}>
          <i className="bi bi-plus-circle" /> Create Schedule
        </button>
      </div>

      {loading ? <Spinner /> : schedules.length === 0 ? (
        <Empty icon="bi-calendar3" title="No schedules yet" subtitle="Create your first live session or class." />
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h2 className="small-title">Upcoming Sessions ({upcoming.length})</h2>
              <div className="row g-3 mb-4">
                {upcoming.map(s => <ScheduleCard key={s.id} schedule={s} />)}
              </div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h2 className="small-title mt-2">Past Sessions ({past.length})</h2>
              <div className="row g-3">
                {past.slice(0, 6).map(s => <ScheduleCard key={s.id} schedule={s} past />)}
              </div>
            </>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal
        show={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Live Session"
        size="lg"
        footer={
          <div className="d-flex gap-2 ms-auto">
            <button className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary fw-600 btn-icon-start" onClick={handleCreate} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" />Creating…</> : <><i className="bi bi-plus-circle" /> Create Schedule</>}
            </button>
          </div>
        }
      >
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Session Title *</label>
            <input className="form-control" placeholder="e.g. Week 3 Live Class — Python Functions" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="col-12">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Description</label>
            <textarea className="form-control" rows={2} placeholder="What will be covered in this session…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Start Time *</label>
            <input type="datetime-local" className="form-control" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>End Time *</label>
            <input type="datetime-local" className="form-control" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
          </div>
          <div className="col-12">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Meeting Link (Zoom, Google Meet, etc.)</label>
            <div className="position-relative">
              <i className="bi bi-camera-video position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
              <input type="url" className="form-control" placeholder="https://meet.google.com/…" style={{ paddingLeft: '2.5rem' }} value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))} />
            </div>
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Related Course</label>
            <select className="form-select" value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}>
              <option value="">No specific course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="col-sm-6">
            <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Assign Tutor</label>
            <select className="form-select" value={form.tutor_id} onChange={e => setForm(p => ({ ...p, tutor_id: e.target.value }))}>
              <option value="">No specific tutor</option>
              {tutors.map(t => <option key={t.id} value={t.id}>{t.name || t.username}</option>)}
            </select>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="recurring" checked={form.is_recurring} onChange={e => setForm(p => ({ ...p, is_recurring: e.target.checked }))} />
              <label className="form-check-label fw-600" htmlFor="recurring" style={{ fontSize: '0.8rem' }}>Recurring session</label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ScheduleCard({ schedule, past = false }: { schedule: any; past?: boolean }) {
  const startDate = new Date(schedule.start_time);
  const endDate = new Date(schedule.end_time);
  const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  return (
    <div className="col-md-6 col-lg-4">
      <div className={`card p-4 h-100 ${past ? 'opacity-75' : ''}`}>
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div className={`stat-icon ${past ? 'teal' : 'blue'}`} style={{ width: 42, height: 42, fontSize: '1.1rem' }}>
            <i className={`bi ${past ? 'bi-calendar-check' : 'bi-camera-video'}`} />
          </div>
          {!past && <span className="badge bg-success" style={{ fontSize: '0.65rem' }}>Upcoming</span>}
          {past && <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>Completed</span>}
        </div>
        <h6 className="fw-700 mb-2">{schedule.title}</h6>
        {schedule.description && (
          <p className="text-muted mb-2" style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>{schedule.description}</p>
        )}
        <div className="d-flex flex-column gap-1 text-muted mb-3" style={{ fontSize: '0.78rem' }}>
          <div><i className="bi bi-calendar3 me-2 text-primary" />{startDate.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <div><i className="bi bi-clock me-2 text-primary" />{startDate.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} — {endDate.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} ({durationMins}min)</div>
          {schedule.course_id && <div><i className="bi bi-book me-2 text-primary" />Course #{schedule.course_id}</div>}
        </div>
        <div className="d-flex gap-2 mt-auto flex-wrap">
          {schedule.meeting_link && !past && (
            <a href={schedule.meeting_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary btn-icon-start">
              <i className="bi bi-camera-video" /> Join
            </a>
          )}
          {schedule.meeting_link && past && (
            <a href={schedule.meeting_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary btn-icon-start">
              <i className="bi bi-link-45deg" /> Recording
            </a>
          )}
          <a href={`/tutor/schedules/${schedule.id}/attendance`} className="btn btn-sm btn-outline-secondary btn-icon-start">
            <i className="bi bi-person-check" /> Attendance
          </a>
        </div>
      </div>
    </div>
  );
}
