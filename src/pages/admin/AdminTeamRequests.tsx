import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/services/api';
import { TeamRequest } from '@/types';
import { Spinner, Empty, PageTitle, StatusBadge, Avatar } from '@/components/shared/index';

export default function AdminTeamRequests() {
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState<number | null>(null);
  const load = () => { setLoading(true); adminApi.listTeamRequests(filter || undefined).then(r => setRequests(r.data || [])).finally(() => setLoading(false)); };
  useEffect(load, [filter]);
  const handle = async (id: number, approved: boolean) => { setProcessing(id); try { await adminApi.reviewTeamRequest(id, { approved, rejection_reason: approved ? undefined : 'Not approved at this time.' }); toast.success(`Request ${approved ? 'approved' : 'rejected'}`); load(); } catch { toast.error('Action failed'); } finally { setProcessing(null); } };
  return (
    <div className="fade-in">
      <PageTitle title="Team Requests" crumbs={[{ label: 'Admin' }, { label: 'Team Requests' }]} />
      <div className="d-flex gap-2 mb-4">{['pending','approved','rejected'].map(f => <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`} style={{ borderRadius: 999, textTransform: 'capitalize' }} onClick={() => setFilter(f)}>{f}</button>)}</div>
      {loading ? <Spinner /> : requests.length === 0 ? <Empty icon="bi-person-badge" title={`No ${filter} requests`} /> : (
        <div className="row g-3">
          {requests.map(r => (
            <div key={r.id} className="col-md-6 col-lg-4">
              <div className="card p-4 h-100">
                <div className="d-flex align-items-center gap-3 mb-3"><Avatar image={r.user?.image} name={r.user?.name} size={48} /><div><div className="fw-700">{r.user?.name}</div><div className="text-muted" style={{ fontSize: '0.72rem' }}>{r.user?.email}</div></div></div>
                <div className="d-flex gap-2 mb-2"><span className="badge bg-primary-light text-primary" style={{ textTransform: 'capitalize' }}>{r.requested_role}</span><StatusBadge status={r.status} /></div>
                {r.motivation && <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>{r.motivation.slice(0, 100)}</p>}
                {r.portfolio_url && <a href={r.portfolio_url} target="_blank" rel="noreferrer" className="text-primary mb-2 d-block" style={{ fontSize: '0.78rem' }}><i className="bi bi-link-45deg" /> Portfolio</a>}
                {r.status === 'pending' && <div className="d-flex gap-2 mt-auto"><button className="btn btn-sm btn-danger flex-1" disabled={processing === r.id} onClick={() => handle(r.id, false)}>Reject</button><button className="btn btn-sm btn-success flex-1" disabled={processing === r.id} onClick={() => handle(r.id, true)}>{processing === r.id ? <span className="spinner-border spinner-border-sm" /> : 'Approve'}</button></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
