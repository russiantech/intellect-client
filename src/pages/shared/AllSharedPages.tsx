import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { pathsApi, paymentsApi, enrollmentsApi, usersApi } from '@/services/api';
import { LearningPath, User } from '@/types';
import { Spinner, Empty, PageTitle, SearchInput, CourseCard, Avatar, StatCard } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';

export function PathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => {
    setLoading(true);
    pathsApi.list({ search: search || undefined }).then(r => setPaths(r.data.items || [])).finally(() => setLoading(false));
  }, [search]);
  return (
    <div className="fade-in">
      <PageTitle title="Learning Paths" subtitle="Structured programs to master a skill end-to-end" />
      <div className="mb-4" style={{ maxWidth: 400 }}><SearchInput value={search} onChange={setSearch} placeholder="Search learning paths…" /></div>
      {loading ? <Spinner /> : paths.length === 0 ? <Empty icon="bi-signpost-split" title="No learning paths yet" /> : (
        <div className="row g-4">
          {paths.map(p => (
            <div className="col-sm-6 col-lg-4" key={p.id}>
              <div className="card h-100" style={{ display: 'flex', flexDirection: 'column' }}>
                {p.thumbnail ? <img src={`/uploads/courses/thumbnails/${p.thumbnail}`} alt="" style={{ height: 160, objectFit: 'cover', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', width: '100%' }} />
                  : <div style={{ height: 120, background: 'linear-gradient(135deg,var(--primary-light),#e8f4fd)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="bi bi-signpost-split text-primary" style={{ fontSize: '2.5rem' }} /></div>}
                <div className="p-4 flex-1 d-flex flex-column">
                  <h5 className="fw-bold mb-1">{p.title}</h5>
                  {p.description && <p className="text-muted truncate-3 mb-3" style={{ fontSize: '0.875rem', flex: 1 }}>{p.description}</p>}
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}><i className="bi bi-collection me-1" />{p.courses_count} courses</span>
                    {p.fee > 0 ? <span className="fw-700 text-primary">₦{p.fee.toLocaleString()}</span> : <span className="badge bg-success">Free</span>}
                  </div>
                  {p.is_enrolled && (<div className="mb-3"><div className="progress" style={{ height: 4 }}><div className="progress-bar" style={{ width: `${p.progress_pct || 0}%` }} /></div></div>)}
                  <Link to={`/paths/${p.id}`} className="btn btn-outline-primary w-100 mt-auto">{p.is_enrolled ? 'Continue Path' : 'View Path'}</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PathDetail() {
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

export function PartnerDashboard() {
  const { user } = useAuth();
  return (
    <div className="fade-in">
      <PageTitle title="Partner Dashboard" subtitle={`Welcome, ${user?.name || user?.username}`} />
      <div className="row g-3 mb-4">
        {[{ icon: 'bi-people', label: 'Active Students', value: 0, color: 'blue' as const },
          { icon: 'bi-book', label: 'Courses Offered', value: 0, color: 'green' as const },
          { icon: 'bi-currency-naira', label: 'Total Spend', value: '0', color: 'yellow' as const }].map((s, i) => (
          <div key={i} className="col-md-4"><StatCard icon={s.icon} label={s.label} value={s.value} color={s.color} /></div>
        ))}
      </div>
      <div className="card p-4">
        <h6 className="fw-700 mb-2">Getting Started</h6>
        <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>Browse and offer Intellect courses to your organization's students. Contact your account manager to configure your catalog.</p>
        <div className="d-flex gap-3 flex-wrap">
          <Link to="/explore" className="btn btn-primary btn-icon-start"><i className="bi bi-compass" /> Browse Courses</Link>
          <Link to="/paths" className="btn btn-outline-primary btn-icon-start"><i className="bi bi-signpost-split" /> Learning Paths</Link>
        </div>
      </div>
    </div>
  );
}

export function PaymentCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('reference') || params.get('trxref');
    if (!txRef) { setStatus('failed'); setMessage('No transaction reference found.'); return; }
    paymentsApi.verify(txRef)
      .then(r => {
        if (r.data.status === 'success' || r.data.status === 'already_verified') {
          setStatus('success'); setMessage(r.data.message || 'Payment confirmed!');
          setTimeout(() => navigate('/my-courses'), 3000);
        } else { setStatus('failed'); setMessage(r.data.message || 'Payment could not be confirmed.'); }
      })
      .catch(() => { setStatus('failed'); setMessage('Verification failed. Contact support if you were charged.'); });
  }, []);
  return (
    <div className="fade-in text-center py-5" style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {status === 'verifying' && (<><div className="spinner-border text-primary mb-4" style={{ width: 64, height: 64 }} /><h4 className="fw-bold mb-2">Verifying Payment…</h4><p className="text-muted">Please wait while we confirm your payment.</p></>)}
      {status === 'success' && (
        <>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#d1fae5', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="bi bi-check-circle-fill text-success" style={{ fontSize: '2.5rem' }} /></div>
          <h4 className="fw-bold mb-2">Payment Successful! 🎉</h4>
          <p className="text-muted mb-4">{message} Redirecting…</p>
          <Link to="/my-courses" className="btn btn-success btn-icon-start"><i className="bi bi-book" /> My Courses</Link>
        </>
      )}
      {status === 'failed' && (
        <>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#fee2e2', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '2.5rem' }} /></div>
          <h4 className="fw-bold mb-2">Payment Failed</h4>
          <p className="text-muted mb-4">{message}</p>
          <div className="d-flex gap-3 justify-content-center"><Link to="/explore" className="btn btn-outline-secondary">Browse Courses</Link><Link to="/my-courses" className="btn btn-primary">My Courses</Link></div>
        </>
      )}
    </div>
  );
}
/*
export function About() {
  const features = [
    { icon: 'bi-play-circle', title: 'Rich Content Types', desc: 'Video, PDF, PPT, audio, and interactive lessons — all in one platform.', color: 'blue' as const },
    { icon: 'bi-robot', title: 'AI Learning Assistant', desc: 'Get instant answers and personalized explanations right inside the player.', color: 'purple' as const },
    { icon: 'bi-award', title: 'Auto Certificates', desc: 'Earn a verified certificate automatically upon course completion.', color: 'yellow' as const },
    { icon: 'bi-people', title: 'Live Sessions', desc: 'Join scheduled classes with expert tutors and track attendance.', color: 'green' as const },
    { icon: 'bi-pencil-square', title: 'Creator Studio', desc: 'Build and sell courses. Set your pricing and earn while you teach.', color: 'teal' as const },
    { icon: 'bi-building', title: 'Organization Partnerships', desc: 'Offer Intellect courses to your team under a flexible partnership model.', color: 'red' as const },
  ];
  return (
    <div className="fade-in">
      <div className="rounded-3 mb-5 p-5 text-white" style={{ background: 'linear-gradient(135deg,#1a3a5c 0%,#2c6fad 100%)', minHeight: 260 }}>
        <h1 className="fw-bold mb-3" style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>Intellect — Your Digital Learning Companion</h1>
        <p className="opacity-75 mb-4" style={{ maxWidth: 520, fontSize: '1rem', lineHeight: 1.7 }}>Building a future where learning fits seamlessly into everyday life — empowering individuals to acquire skills on their own terms.</p>
        <div className="d-flex gap-3 flex-wrap"><Link to="/explore" className="btn btn-light fw-600"><i className="bi bi-compass me-1" />Explore Courses</Link><Link to="/auth/signup" className="btn btn-outline-light fw-600"><i className="bi bi-person-plus me-1" />Get Started Free</Link></div>
      </div>
      <h2 className="small-title mb-4">What makes Intellect special</h2>
      <div className="row g-4 mb-5">
        {features.map(f => (
          <div key={f.title} className="col-sm-6 col-lg-4">
            <div className="card p-4 h-100">
              <div className={`stat-icon ${f.color} mb-3`} style={{ width: 52, height: 52, fontSize: '1.3rem' }}><i className={`bi ${f.icon}`} /></div>
              <h6 className="fw-700 mb-2">{f.title}</h6>
              <p className="text-muted mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-5 text-center" style={{ background: 'linear-gradient(135deg,var(--primary-light),#e8f4fd)' }}>
        <i className="bi bi-mortarboard-fill text-primary mb-3" style={{ fontSize: '2.5rem' }} />
        <h3 className="fw-bold mb-2">Ready to start learning?</h3>
        <p className="text-muted mb-4" style={{ maxWidth: 400, margin: '0 auto 1.5rem' }}>Join thousands of learners and educators. Free to get started.</p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <Link to="/auth/signup" className="btn btn-primary fw-600"><i className="bi bi-person-plus me-1" />Create Free Account</Link>
          <Link to="/explore" className="btn btn-outline-primary fw-600"><i className="bi bi-compass me-1" />Explore Courses</Link>
        </div>
      </div>
    </div>
  );
}
*/

export function Instructors() {
  const [tutors, setTutors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { usersApi.listUsers({ role: 'tutor', per_page: 24 }).then(r => setTutors(r.data.items || [])).finally(() => setLoading(false)); }, []);
  return (
    <div className="fade-in">
      <PageTitle title="Our Instructors" subtitle="Expert educators guiding your learning journey" crumbs={[{ label: 'Home', href: '/' }, { label: 'Instructors' }]} />
      {loading ? <Spinner /> : tutors.length === 0 ? <Empty icon="bi-people" title="No instructors listed yet" subtitle="Our tutor team is growing — check back soon." /> : (
        <div className="row g-4">
          {tutors.map(t => (
            <div className="col-sm-6 col-md-4 col-lg-3" key={t.id}>
              <div className="card p-4 text-center h-100">
                <div className="mb-3"><Avatar image={t.image} name={t.name || t.username} size={88} /></div>
                <h6 className="fw-700 mb-0">{t.name || t.username}</h6>
                {t.title && <p className="text-primary fw-600 mb-1" style={{ fontSize: '0.8rem' }}>{t.title}</p>}
                {t.city && <p className="text-muted mb-1" style={{ fontSize: '0.75rem' }}><i className="bi bi-geo-alt me-1" />{t.city}</p>}
                {t.expertise && <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>{t.expertise.slice(0, 80)}{t.expertise.length > 80 ? '…' : ''}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

