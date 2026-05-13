import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { pathsApi, paymentsApi, enrollmentsApi } from '@/services/api';
import { LearningPath } from '@/types';
import { Spinner, PageTitle, CourseCard } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';

export default function PathDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  useEffect(() => {
    if (!id) return;
    pathsApi.get(Number(id)).then(r => setPath(r.data)).catch(() => navigate('/paths')).finally(() => setLoading(false));
  }, [id]);
  const enroll = async () => {
    if (!user) { navigate('/auth/signin'); return; }
    if (!path) return;
    setEnrolling(true);
    try {
      if (path.fee > 0) { const res = await paymentsApi.initiate({ path_id: path.id, payment_type: 'one_time' }); window.location.href = res.data.payment_url; }
      else { await enrollmentsApi.enrollPath(path.id); toast.success('Enrolled in learning path!'); navigate('/my-courses'); }
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Enrollment failed'); }
    finally { setEnrolling(false); }
  };
  if (loading) return <Spinner />;
  if (!path) return null;
  return (
    <div className="fade-in">
      <PageTitle title={path.title} subtitle={path.description || ''} crumbs={[{ label: 'Paths', href: '/paths' }, { label: path.title }]} />
      <div className="row g-4">
        <div className="col-lg-8">
          <h2 className="small-title">Courses in this Path ({path.courses_count})</h2>
          <div className="row g-3">{(path.courses as any[]).map((c: any) => <div key={c.id} className="col-sm-6"><CourseCard course={c} /></div>)}</div>
        </div>
        <div className="col-lg-4">
          <div className="card p-4 sticky-top" style={{ top: 'calc(var(--nav-height) + 1rem)' }}>
            <div className="mb-3">{path.fee > 0 ? <div className="fw-bold text-primary" style={{ fontSize: '1.75rem' }}>₦{path.fee.toLocaleString()}</div> : <span className="badge bg-success px-3 py-2">Free</span>}</div>
            <div className="d-flex flex-column gap-2 mb-4 text-muted" style={{ fontSize: '0.8rem' }}>
              <div><i className="bi bi-collection me-2 text-primary" />{path.courses_count} courses</div>
              <div><i className="bi bi-award me-2 text-primary" />Certificate on completion</div>
              <div><i className="bi bi-infinity me-2 text-primary" />Lifetime access</div>
            </div>
            {path.is_enrolled ? <div className="btn btn-success w-100 py-2 fw-600"><i className="bi bi-check-circle me-1" />Enrolled</div>
              : <button className="btn btn-primary w-100 py-2 fw-600" onClick={enroll} disabled={enrolling}>{enrolling ? <><span className="spinner-border spinner-border-sm me-2" />Processing…</> : path.fee > 0 ? `Enroll · ₦${path.fee.toLocaleString()}` : 'Enroll Free'}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}