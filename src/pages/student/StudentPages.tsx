import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { enrollmentsApi, assessmentsApi } from '@/services/api';
import { Enrollment, Certificate, AssessmentSubmission } from '@/types';
import { Spinner, Empty, CertCard, PageTitle, StatusBadge } from '@/components/shared/index';

// ── MY COURSES ───────────────────────────────────
export function MyCourses() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => { enrollmentsApi.myCourses().then(r => setEnrollments(r.data || [])).finally(() => setLoading(false)); }, []);

  const filtered = filter === 'all' ? enrollments : enrollments.filter(e => filter === 'completed' ? e.status === 'completed' || e.progress_pct >= 100 : e.status === 'active' && e.progress_pct < 100);

  return (
    <div className="fade-in">
      <PageTitle title="My Courses" subtitle="All your enrolled courses" crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Courses' }]} />
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilter(f)} style={{ borderRadius: 999, textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon="bi-book" title={filter === 'all' ? "You haven't enrolled in any courses yet" : `No ${filter} courses`}
          subtitle="Explore our course catalog to get started." action={{ label: 'Explore Courses', href: '/explore' }} />
      ) : (
        <div className="row g-3">
          {filtered.map(e => (
            <div className="col-12 col-md-6 col-lg-4" key={e.enrollment_id}>
              <div className="card h-100">
                <div style={{ height: 160, overflow: 'hidden', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                  {e.course?.thumbnail
                    ? <img src={`/uploads/courses/thumbnails/${e.course.thumbnail}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary-light), #e8f4fd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-play-circle text-primary" style={{ fontSize: '2.5rem' }} />
                      </div>
                  }
                </div>
                <div className="p-3 flex-1">
                  <h6 className="fw-700 mb-1 truncate-2">{e.course?.title}</h6>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="progress flex-1" style={{ height: 6 }}>
                      <div className="progress-bar" style={{ width: `${e.progress_pct}%` }} />
                    </div>
                    <span className="text-primary fw-600" style={{ fontSize: '0.75rem' }}>{e.progress_pct}%</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <StatusBadge status={e.status} />
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{e.completed_topics} topics done</span>
                  </div>
                </div>
                <div className="p-3 border-top">
                  {e.progress_pct >= 100 || e.status === 'completed'
                    ? <Link to={`/learn/${e.course?.slug}`} className="btn btn-success btn-sm w-100 btn-icon-start"><i className="bi bi-check-circle" /> Review Course</Link>
                    : <Link to={`/learn/${e.course?.slug}`} className="btn btn-primary btn-sm w-100 btn-icon-start"><i className="bi bi-play-fill" /> Continue</Link>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MY CERTIFICATES ──────────────────────────────
export function MyCertificates() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { enrollmentsApi.myCertificates().then(r => setCerts(r.data || [])).finally(() => setLoading(false)); }, []);

  return (
    <div className="fade-in">
      <PageTitle title="My Certificates" subtitle={`${certs.length} certificate${certs.length !== 1 ? 's' : ''} earned`} crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Certificates' }]} />
      {loading ? <Spinner /> : certs.length === 0 ? (
        <Empty icon="bi-award" title="No certificates yet" subtitle="Complete a course to earn your first certificate!" action={{ label: 'My Courses', href: '/my-courses' }} />
      ) : (
        <div className="row g-4">
          {certs.map(c => (
            <div className="col-sm-6 col-lg-4" key={c.id}>
              <CertCard cert={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MY ASSESSMENTS ───────────────────────────────
export function MyAssessments() {
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { assessmentsApi.mySubmissions().then(r => setSubmissions(r.data || [])).finally(() => setLoading(false)); }, []);

  return (
    <div className="fade-in">
      <PageTitle title="My Assessments" subtitle="Your quiz and assessment history" crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Assessments' }]} />
      {loading ? <Spinner /> : submissions.length === 0 ? (
        <Empty icon="bi-clipboard-check" title="No assessments yet" subtitle="Assessments will appear here once you start a course." />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr><th>Assessment</th><th>Type</th><th>Score</th><th>Status</th><th>Submitted</th><th></th></tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id}>
                    <td><span className="fw-600" style={{ fontSize: '0.875rem' }}>{s.assessment?.title}</span><br /><span className="text-muted" style={{ fontSize: '0.72rem' }}>Attempt {s.attempt_number}</span></td>
                    <td><span className="badge bg-primary-light text-primary" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{s.assessment?.assessment_type}</span></td>
                    <td>
                      {s.score !== undefined && s.score !== null ? (
                        <div>
                          <span className={`fw-700 ${(s.passed) ? 'text-success' : 'text-danger'}`}>{s.percentage?.toFixed(0)}%</span>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}> ({s.score}/{s.assessment?.total_marks})</span>
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'graded' || s.status === 'reviewed' ? s.passed ? 'bg-success' : 'bg-danger' : 'bg-warning text-dark'}`} style={{ fontSize: '0.7rem' }}>
                        {s.status === 'graded' && s.passed ? 'Passed' : s.status === 'graded' && !s.passed ? 'Failed' : s.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}</td>
                    <td>
                      {s.id && <Link to={`/my-assessments/${s.id}`} className="btn btn-sm btn-outline-primary">View</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyCourses;
