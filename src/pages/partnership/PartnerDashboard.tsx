import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { partnershipsApi } from '@/services/api';
import { Partnership } from '@/types';
import { Spinner, Empty, PageTitle, StatCard, Modal } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollModal, setEnrollModal] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [tab, setTab] = useState<'overview'|'students'|'courses'>('overview');

  useEffect(() => {
    partnershipsApi.list({ status: 'active' })
      .then(async r => {
        const items = r.data.items || [];
        const mine = items[0];
        if (mine) {
          setPartnership(mine);
          const s = await partnershipsApi.listStudents(mine.id);
          setStudents(s.data || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const enroll = async () => {
    if (!partnership || !enrollEmail) return;
    setEnrolling(true);
    try {
      await partnershipsApi.enrollStudent(partnership.id, enrollEmail);
      toast.success('Student enrolled!');
      setEnrollEmail(''); setEnrollModal(false);
      const s = await partnershipsApi.listStudents(partnership.id);
      setStudents(s.data || []);
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Enrollment failed'); }
    finally { setEnrolling(false); }
  };

  if (loading) return <Spinner />;

  if (!partnership) return (
    <div className="fade-in">
      <PageTitle title="Partner Dashboard" />
      <div className="card p-5 text-center">
        <i className="bi bi-building text-muted d-block mb-3" style={{ fontSize: '3.5rem' }} />
        <h5 className="fw-bold mb-2">No active partnership found</h5>
        <p className="text-muted mb-4" style={{ maxWidth: 420, margin: '0 auto 1.5rem', fontSize: '0.875rem' }}>
          Your organization's partnership is pending or not yet configured. Contact the Intellect team.
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <Link to="/explore" className="btn btn-primary btn-icon-start"><i className="bi bi-compass" /> Browse Courses</Link>
          <a href="mailto:hello@intellect.ng" className="btn btn-outline-secondary btn-icon-start"><i className="bi bi-envelope" /> Contact Us</a>
        </div>
      </div>
    </div>
  );

  const usagePct = partnership.max_students ? Math.round((partnership.active_students / partnership.max_students) * 100) : 0;

  return (
    <div className="fade-in">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <PageTitle title={partnership.org_name} subtitle="Partner Dashboard" crumbs={[{ label: 'Partner' }, { label: 'Dashboard' }]} />
        <button className="btn btn-primary btn-icon-start" onClick={() => setEnrollModal(true)}>
          <i className="bi bi-person-plus" /> Enroll Student
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3"><StatCard icon="bi-people" label="Active Students" value={partnership.active_students} color="blue" /></div>
        <div className="col-6 col-md-3"><StatCard icon="bi-book" label="Courses" value={partnership.courses.length} color="green" /></div>
        <div className="col-6 col-md-3"><StatCard icon="bi-currency-naira" label="Per Student" value={`₦${partnership.price_per_student.toLocaleString()}`} color="yellow" /></div>
        <div className="col-6 col-md-3"><StatCard icon="bi-shield-check" label="Status" value={partnership.status} color="teal" /></div>
      </div>

      {partnership.max_students && (
        <div className="card p-3 mb-4">
          <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.875rem' }}>
            <span className="fw-600">Capacity</span>
            <span className="text-muted">{partnership.active_students} / {partnership.max_students}</span>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <div className={`progress-bar ${usagePct > 90 ? 'bg-danger' : usagePct > 70 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${usagePct}%`, borderRadius: 999 }} />
          </div>
        </div>
      )}

      <div className="d-flex gap-2 mb-4">
        {(['overview','students','courses'] as const).map(t => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline-secondary'}`} style={{ borderRadius: 999, textTransform: 'capitalize' }} onClick={() => setTab(t)}>
            {t} {t === 'students' ? `(${students.length})` : t === 'courses' ? `(${partnership.courses.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="row g-4">
          <div className="col-lg-6">
            <h2 className="small-title">Recent Students</h2>
            {students.length === 0 ? <div className="card p-4 text-center text-muted" style={{ fontSize: '0.875rem' }}>No students yet — enroll your first student above.</div> : (
              <div className="d-flex flex-column gap-2">
                {students.slice(0, 6).map((s: any) => (
                  <div key={s.id} className="card p-3 d-flex align-items-center gap-3">
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className="bi bi-person text-primary" /></div>
                    <div className="flex-1"><div className="fw-600" style={{ fontSize: '0.875rem' }}>{s.name || s.username}</div><div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.email}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="col-lg-6">
            <h2 className="small-title">Courses Included</h2>
            <div className="d-flex flex-column gap-2">
              {partnership.courses.slice(0, 6).map((c: any) => (
                <Link key={c.id} to={`/courses/${c.slug}`} className="card p-3 d-flex align-items-center gap-3 text-decoration-none">
                  {c.thumbnail ? <img src={`/uploads/courses/thumbnails/${c.thumbnail}`} alt="" style={{ width: 48, height: 34, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 48, height: 34, background: 'var(--primary-light)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className="bi bi-book text-primary" style={{ fontSize: '0.75rem' }} /></div>}
                  <div className="flex-1 min-w-0"><div className="fw-600 truncate-2" style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{c.title}</div><div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.level}</div></div>
                  <i className="bi bi-arrow-right text-muted" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'students' && (
        students.length === 0 ? <Empty icon="bi-people" title="No students enrolled yet" /> : (
          <div className="card overflow-hidden">
            <table className="table mb-0">
              <thead><tr><th>Student</th><th>Email</th><th>Enrolled</th></tr></thead>
              <tbody>
                {students.map((s: any) => (
                  <tr key={s.id}>
                    <td className="fw-600" style={{ fontSize: '0.875rem' }}>{s.name || s.username}</td>
                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>{s.email}</td>
                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>{s.joined_at ? new Date(s.joined_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'courses' && (
        <div className="row g-3">
          {partnership.courses.map((c: any) => (
            <div key={c.id} className="col-sm-6 col-lg-4">
              <div className="card p-3 h-100">
                {c.thumbnail && <img src={`/uploads/courses/thumbnails/${c.thumbnail}`} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: '0.75rem' }} />}
                <h6 className="fw-700 mb-1">{c.title}</h6>
                <div className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>{c.level}</div>
                <Link to={`/courses/${c.slug}`} className="btn btn-sm btn-outline-primary mt-auto">View Course</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal show={enrollModal} onClose={() => { setEnrollModal(false); setEnrollEmail(''); }} title="Enroll a Student"
        footer={<div className="d-flex gap-2 ms-auto"><button className="btn btn-outline-secondary" onClick={() => setEnrollModal(false)}>Cancel</button><button className="btn btn-primary fw-600" onClick={enroll} disabled={enrolling || !enrollEmail}>{enrolling ? <><span className="spinner-border spinner-border-sm me-2" />Enrolling…</> : 'Enroll'}</button></div>}>
        <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>Enter the student's email. An account will be created if they don't have one yet.</p>
        <div>
          <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Student Email</label>
          <div className="position-relative">
            <i className="bi bi-envelope position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
            <input type="email" className="form-control" placeholder="student@company.com" style={{ paddingLeft: '2.5rem' }} value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && enroll()} autoFocus />
          </div>
          <p className="text-muted mt-2" style={{ fontSize: '0.78rem' }}><i className="bi bi-info-circle me-1" />Enrolls them in all {partnership.courses.length} course{partnership.courses.length !== 1 ? 's' : ''} in this partnership.</p>
        </div>
      </Modal>
    </div>
  );
}
