import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { enrollmentsApi, coursesApi } from '@/services/api';
import { Enrollment, Certificate } from '@/types';
import { Spinner, Empty, CertCard, PageTitle } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';
import { CourseThumbnail } from '@/components/shared/CourseThumbnail';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      enrollmentsApi.myCourses(),
      enrollmentsApi.myCertificates(),
    ]).then(([e, c]) => {
      setEnrollments(e.data || []);
      setCerts(c.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const inProgress = enrollments.filter(e => e.status === 'active' && e.progress_pct < 100);
  const completed = enrollments.filter(e => e.status === 'completed' || e.progress_pct >= 100);
  const avgProgress = inProgress.length > 0
    ? Math.round(inProgress.reduce((s, e) => s + e.progress_pct, 0) / inProgress.length)
    : 0;

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <PageTitle title={`Welcome back, ${user?.name?.split(' ')[0] || user?.username}!`} subtitle="Track your learning progress" />

      {/* Quick stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card p-3 text-center">
            <div className="fw-700 fs-3 text-primary">{enrollments.length}</div>
            <div className="text-muted small">Enrolled</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-3 text-center">
            <div className="fw-700 fs-3 text-success">{completed.length}</div>
            <div className="text-muted small">Completed</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-3 text-center">
            <div className="fw-700 fs-3 text-warning">{avgProgress}%</div>
            <div className="text-muted small">Avg Progress</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-3 text-center">
            <div className="fw-700 fs-3 text-purple" style={{ color: 'var(--primary)' }}>{certs.length}</div>
            <div className="text-muted small">Certificates</div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Continue learning */}
        <div className="col-lg-8">
          <h2 className="small-title">Continue Learning</h2>
          {inProgress.length === 0 ? (
            <Empty icon="bi-book" title="No courses in progress" subtitle="Explore and enroll in courses to get started."
              action={{ label: 'Explore Courses', href: '/explore' }} />
          ) : (
            <div className="d-flex flex-column gap-3">
  {inProgress.slice(0, 5).map(e => (
    <div key={e.enrollment_id} className="card">
      <div className="p-3 d-flex align-items-center gap-3">
        <CourseThumbnail 
          thumbnail={e.course?.thumbnail} 
          size={72} 
          aspectRatio={0.72}
          borderRadius={8} 
        />
        <div className="flex-1 min-w-0">
          <Link to={`/learn/${e.course?.slug}`} className="fw-600 text-decoration-none d-block truncate-2" style={{ fontSize: '0.875rem' }}>
            {e.course?.title}
          </Link>
          <div className="d-flex align-items-center gap-2 mt-1">
            <div className="progress flex-1" style={{ height: 6 }}>
              <div className="progress-bar" style={{ width: `${e.progress_pct}%` }} />
            </div>
            <span className="text-primary fw-600" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              {e.progress_pct}%
            </span>
          </div>
          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
            {e.completed_topics} topics completed
          </div>
        </div>
        <Link to={`/learn/${e.course?.slug}`} className="btn btn-sm btn-primary btn-icon-start" style={{ whiteSpace: 'nowrap' }}>
          <i className="bi bi-play-fill" /> Continue
        </Link>
      </div>
    </div>
  ))}
</div>

          )}
        </div>

        {/* Right column */}
        <div className="col-lg-4">
          {/* Certificates */}
          <h2 className="small-title">Recent Certificates</h2>
          {certs.length === 0 ? (
            <div className="card p-3 text-center text-muted" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-award d-block mb-2" style={{ fontSize: '1.5rem' }} />
              Complete a course to earn your first certificate!
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-4">
              {certs.slice(0, 2).map(c => <CertCard key={c.id} cert={c} />)}
              {certs.length > 2 && <Link to="/my-certificates" className="btn btn-outline-primary btn-sm">View all {certs.length} certificates</Link>}
            </div>
          )}

          {/* Completed courses */}
          {completed.length > 0 && (
            <>
              <h2 className="small-title mt-3">Completed Courses</h2>
              <div className="d-flex flex-column gap-2">
                {completed.slice(0, 3).map(e => (
                  <div key={e.enrollment_id} className="card p-3 d-flex flex-row align-items-center gap-3">
                    <i className="bi bi-check-circle-fill text-success fs-5" />
                    <div className="flex-1 min-w-0">
                      <div className="fw-600 truncate-2" style={{ fontSize: '0.8rem' }}>{e.course?.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>100% Complete</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Explore CTA */}
      <div className="card mt-4 p-4 d-flex flex-row align-items-center gap-4" style={{ background: 'linear-gradient(135deg, var(--primary-light), #e8f4fd)' }}>
        <i className="bi bi-compass text-primary d-none d-sm-block" style={{ fontSize: '2.5rem' }} />
        <div className="flex-1">
          <h6 className="fw-bold mb-1">Discover more courses</h6>
          <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>Expand your skills with hundreds of courses across all categories.</p>
        </div>
        <Link to="/explore" className="btn btn-primary btn-icon-start flex-shrink-0">
          <i className="bi bi-compass" /> Explore
        </Link>
      </div>
    </div>
  );
}
