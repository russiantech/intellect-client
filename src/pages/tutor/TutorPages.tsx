import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi, assessmentsApi, coursesApi } from '@/services/api';
import { Schedule, AssessmentSubmission } from '@/types';
import { Spinner, Empty, PageTitle, Avatar, StatusBadge, Modal } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';

// ── TUTOR DASHBOARD ───────────────────────────────
export function TutorDashboard() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.listSchedules().then(r => setSchedules(r.data || [])).finally(() => setLoading(false)); }, []);

  const upcoming = schedules.filter(s => new Date(s.start_time) >= new Date()).slice(0, 5);

  return (
    <div className="fade-in">
      <PageTitle title={`Tutor Dashboard`} subtitle={`Welcome, ${user?.name || user?.username}`} />
      <div className="row g-4">
        <div className="col-lg-8">
          <h2 className="small-title">Upcoming Sessions</h2>
          {loading ? <Spinner /> : upcoming.length === 0 ? (
            <Empty icon="bi-calendar-x" title="No upcoming sessions" subtitle="Schedules assigned to you will appear here." />
          ) : (
            <div className="d-flex flex-column gap-3">
              {upcoming.map(s => (
                <div key={s.id} className="card p-3 d-flex flex-row align-items-center gap-3">
                  <div className="stat-icon blue" style={{ width: 48, height: 48, flexShrink: 0 }}>
                    <i className="bi bi-camera-video" />
                  </div>
                  <div className="flex-1">
                    <div className="fw-700" style={{ fontSize: '0.9rem' }}>{s.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {new Date(s.start_time).toLocaleDateString('en-NG', { weekday: 'long', month: 'short', day: 'numeric' })} at{' '}
                      {new Date(s.start_time).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {s.meeting_link && <a href={s.meeting_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary btn-icon-start flex-shrink-0"><i className="bi bi-camera-video" /> Join</a>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col-lg-4">
          <h2 className="small-title">Quick Links</h2>
          <div className="d-flex flex-column gap-2">
            {[
              { to: '/tutor/courses', icon: 'bi-journal-text', label: 'My Assigned Courses' },
              { to: '/tutor/students', icon: 'bi-people', label: 'My Students' },
              { to: '/tutor/assessments', icon: 'bi-clipboard-check', label: 'Grade Assessments' },
              { to: '/tutor/schedules', icon: 'bi-calendar3', label: 'My Schedules' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="card p-3 d-flex flex-row align-items-center gap-3 text-decoration-none">
                <i className={`bi ${l.icon} text-primary`} style={{ fontSize: '1.2rem', width: 24 }} />
                <span className="fw-600" style={{ fontSize: '0.875rem' }}>{l.label}</span>
                <i className="bi bi-chevron-right text-muted ms-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TUTOR SCHEDULES ───────────────────────────────
export function TutorSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.listSchedules().then(r => setSchedules(r.data || [])).finally(() => setLoading(false)); }, []);

  return (
    <div className="fade-in">
      <PageTitle title="My Schedules" subtitle="Live sessions and class timetable" />
      {loading ? <Spinner /> : schedules.length === 0 ? <Empty icon="bi-calendar3" title="No schedules assigned" /> : (
        <div className="row g-3">
          {schedules.map(s => (
            <div key={s.id} className="col-md-6 col-lg-4">
              <div className="card p-4 h-100">
                <div className="d-flex align-items-start justify-content-between mb-2">
                  <div className="stat-icon blue" style={{ width: 40, height: 40 }}><i className="bi bi-calendar3" /></div>
                  {new Date(s.start_time) >= new Date() ? <span className="badge bg-success" style={{ fontSize: '0.65rem' }}>Upcoming</span> : <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>Past</span>}
                </div>
                <h6 className="fw-700 mb-1">{s.title}</h6>
                {s.description && <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>{s.description}</p>}
                <div className="text-muted mb-1" style={{ fontSize: '0.78rem' }}>
                  <i className="bi bi-clock me-1" />{new Date(s.start_time).toLocaleString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>
                  <i className="bi bi-hourglass me-1" />{Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000)}min
                </div>
                <div className="d-flex gap-2 flex-wrap mt-auto">
                  {s.meeting_link && <a href={s.meeting_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary btn-icon-start"><i className="bi bi-camera-video" /> Join</a>}
                  <a href={`/tutor/schedules/${s.id}/attendance`} className="btn btn-sm btn-outline-secondary btn-icon-start"><i className="bi bi-person-check" /> Attendance</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TUTOR ASSESSMENTS (grade submissions) ─────────
export function TutorAssessments() {
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<{ sub: AssessmentSubmission | null; show: boolean }>({ sub: null, show: false });
  const [gradeForm, setGradeForm] = useState({ score: 0, tutor_feedback: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Get all ungraded submissions for tutor's courses
    // For now fetch from all
    assessmentsApi.mySubmissions().then(r => setSubmissions(r.data || [])).finally(() => setLoading(false));
  }, []);

  const handleGrade = async () => {
    if (!grading.sub) return;
    setSaving(true);
    try {
      await assessmentsApi.grade({ submission_id: grading.sub.id, ...gradeForm });
      toast.success('Submission graded!');
      setGrading({ sub: null, show: false });
      setSubmissions(prev => prev.map(s => s.id === grading.sub!.id ? { ...s, status: 'reviewed', score: gradeForm.score, tutor_feedback: gradeForm.tutor_feedback } : s));
    } catch { toast.error('Grading failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in">
      <PageTitle title="Assessments" subtitle="Review and grade student submissions" />
      {loading ? <Spinner /> : submissions.length === 0 ? <Empty icon="bi-clipboard-check" title="No submissions to grade" /> : (
        <>
          <div className="card overflow-hidden">
            <table className="table mb-0">
              <thead><tr><th>Assessment</th><th>Student</th><th>Attempt</th><th>Score</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id}>
                    <td><span className="fw-600" style={{ fontSize: '0.875rem' }}>{s.assessment?.title}</span></td>
                    <td><span style={{ fontSize: '0.8rem' }}>ID #{s.id}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{s.attempt_number}</td>
                    <td>{s.score !== null && s.score !== undefined ? <span className={`fw-700 ${s.passed ? 'text-success' : 'text-danger'}`}>{s.percentage?.toFixed(0)}%</span> : <span className="text-muted">—</span>}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => { setGrading({ sub: s, show: true }); setGradeForm({ score: s.score || 0, tutor_feedback: s.tutor_feedback || '' }); }}>
                        {s.status === 'reviewed' ? 'Edit Grade' : 'Grade'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal show={grading.show} onClose={() => setGrading({ sub: null, show: false })} title="Grade Submission"
            footer={<div className="d-flex gap-2 ms-auto"><button className="btn btn-outline-secondary" onClick={() => setGrading({ sub: null, show: false })}>Cancel</button><button className="btn btn-primary" onClick={handleGrade} disabled={saving}>{saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}Save Grade</button></div>}>
            <div className="mb-3">
              <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Score (out of {grading.sub?.assessment?.total_marks || 100})</label>
              <input type="number" className="form-control" min={0} max={grading.sub?.assessment?.total_marks || 100} value={gradeForm.score} onChange={e => setGradeForm(p => ({ ...p, score: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Feedback for Student</label>
              <textarea className="form-control" rows={4} placeholder="Provide constructive feedback…" value={gradeForm.tutor_feedback} onChange={e => setGradeForm(p => ({ ...p, tutor_feedback: e.target.value }))} />
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

// ── TUTOR STUDENTS ────────────────────────────────
export function TutorStudents() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) adminApi.listTutorAssignments({ tutor_id: user.id }).then(r => setAssignments(r.data || [])).finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="fade-in">
      <PageTitle title="My Students" subtitle="Students assigned to your courses" />
      {loading ? <Spinner /> : assignments.length === 0 ? <Empty icon="bi-people" title="No student assignments yet" /> : (
        <div className="row g-3">
          {assignments.map(a => (
            <div key={a.id} className="col-md-6 col-lg-4">
              <div className="card p-3">
                <div className="fw-700 mb-1" style={{ fontSize: '0.875rem' }}>{a.course?.title}</div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                  {a.student_id ? `Student ID: ${a.student_id}` : 'All students in course'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TutorCourses() {
  const { user } = useAuth();
  return (
    <div className="fade-in">
      <PageTitle title="My Assigned Courses" />
      <div className="text-center py-5 text-muted">
        <i className="bi bi-journal-text d-block mb-3" style={{ fontSize: '3rem' }} />
        <p>Courses assigned to you as a tutor will appear here. Contact your admin to get course assignments.</p>
        <Link to="/explore" className="btn btn-primary btn-icon-start"><i className="bi bi-compass" /> Explore Courses</Link>
      </div>
    </div>
  );
}

export default TutorDashboard;
