import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi, usersApi, partnershipsApi, paymentsApi, pathsApi } from '@/services/api';
import { User, TeamRequest, Partnership } from '@/types';
import { Spinner, Empty, PageTitle, Modal, StatusBadge, Avatar, SearchInput } from '@/components/shared/index';

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const load = () => { setLoading(true); usersApi.listUsers({ page, per_page: 20, search: search || undefined, role: roleFilter || undefined }).then(r => { setUsers(r.data.items || []); setTotal(r.data.total || 0); }).finally(() => setLoading(false)); };
  useEffect(load, [page, search, roleFilter]);
  const handleToggle = async (u: User) => { await usersApi.toggleActive(u.id); toast.success('User status updated'); load(); };
  return (
    <div className="fade-in">
      <PageTitle title="Manage Users" subtitle={`${total} total users`} crumbs={[{ label: 'Admin' }, { label: 'Users' }]} />
      
      {/* Filters */}
      <div className="card mb-4">
        <div className="p-3 d-flex flex-wrap gap-3 align-items-center">
          <div style={{ flex: '1 1 260px' }}>
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search users" />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            {['student','tutor','creator','partner','admin'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="text-muted rounded-pill border px-3" style={{ fontSize: '0.8rem' }}>{total} user{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead><tr><th>User</th><th>Roles</th><th>Status</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><div className="d-flex align-items-center gap-2"><Avatar image={u.image} name={u.name || u.username} size={36} /><div><div className="fw-600" style={{ fontSize: '0.875rem' }}>{u.name || u.username}</div><div className="text-muted" style={{ fontSize: '0.72rem' }}>{u.email}</div></div></div></td>
                    <td><div className="d-flex gap-1 flex-wrap">{u.roles.map(r => <span key={r} className="badge bg-primary-light text-primary" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{r}</span>)}</div></td>
                    <td><span className={`badge ${u.active ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>{u.active ? 'Active' : 'Inactive'}</span>{' '}{u.email_verified && <span className="badge bg-info" style={{ fontSize: '0.65rem' }}>Verified</span>}</td>
                    <td style={{ fontSize: '0.8rem' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td><button className={`btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => handleToggle(u)}><i className={`bi ${u.active ? 'bi-person-x' : 'bi-person-check'}`} /></button></td>
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

export function AdminTeamRequests() {
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

export function AdminBroadcast() {
  const [form, setForm] = useState({ subject: '', body: '', broadcast_type: 'all', sent_via_email: true, sent_via_notification: true });
  const [sending, setSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [tab, setTab] = useState<'compose'|'history'>('compose');
  useEffect(() => { adminApi.listBroadcasts().then(r => setBroadcasts(r.data || [])); }, []);
  const send = async () => { if (!form.subject || !form.body) return toast.error('Subject and body required'); setSending(true); try { const res = await adminApi.sendBroadcast(form); toast.success(res.data.message); setTab('history'); adminApi.listBroadcasts().then(r => setBroadcasts(r.data || [])); } catch { toast.error('Failed'); } finally { setSending(false); } };
  return (
    <div className="fade-in">
      <PageTitle title="Broadcast Messages" crumbs={[{ label: 'Admin' }, { label: 'Broadcasts' }]} />
      <div className="d-flex gap-2 mb-4">{(['compose','history'] as const).map(t => <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline-secondary'}`} style={{ borderRadius: 999, textTransform: 'capitalize' }} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'compose' ? (
        <div className="card p-4" style={{ maxWidth: 720 }}>
          <div className="row g-3">
            <div className="col-sm-6"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Recipients</label><select className="form-select" value={form.broadcast_type} onChange={e => setForm(p => ({ ...p, broadcast_type: e.target.value }))}>{[['all','All Users'],['students','Students'],['tutors','Tutors'],['creators','Creators']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="col-12"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Subject</label><input className="form-control" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>
            <div className="col-12"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Message</label><textarea className="form-control" rows={6} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} /></div>
            <div className="col-12 d-flex gap-3">
              <div className="form-check"><input type="checkbox" className="form-check-input" checked={form.sent_via_email} onChange={e => setForm(p => ({ ...p, sent_via_email: e.target.checked }))} /><label className="form-check-label" style={{ fontSize: '0.8rem' }}>Email</label></div>
              <div className="form-check"><input type="checkbox" className="form-check-input" checked={form.sent_via_notification} onChange={e => setForm(p => ({ ...p, sent_via_notification: e.target.checked }))} /><label className="form-check-label" style={{ fontSize: '0.8rem' }}>Notification</label></div>
            </div>
            <div className="col-12"><button className="btn btn-primary btn-icon-start" onClick={send} disabled={sending}>{sending ? <><span className="spinner-border spinner-border-sm me-1" />Sending…</> : <><i className="bi bi-send" /> Send</>}</button></div>
          </div>
        </div>
      ) : broadcasts.length === 0 ? <Empty icon="bi-broadcast" title="No broadcasts yet" /> : (
        <div className="card overflow-hidden"><table className="table mb-0"><thead><tr><th>Subject</th><th>Recipients</th><th>Sent</th></tr></thead><tbody>{broadcasts.map(b => <tr key={b.id}><td className="fw-600" style={{ fontSize: '0.875rem' }}>{b.subject}</td><td style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{b.broadcast_type}</td><td style={{ fontSize: '0.8rem' }}>{b.sent_at ? new Date(b.sent_at).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

export function AdminSettings() {
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [inviting, setInviting] = useState(false);
  useEffect(() => { adminApi.getBrand().then(r => setBrand(r.data)).finally(() => setLoading(false)); }, []);
  const save = async () => { setSaving(true); try { await adminApi.updateBrand(brand); toast.success('Settings saved!'); } catch { toast.error('Save failed'); } finally { setSaving(false); } };
  const sendInvite = async () => { if (!inviteEmail) return; setInviting(true); try { await adminApi.sendInvite({ email: inviteEmail, role: inviteRole }); toast.success(`Invite sent!`); setInviteEmail(''); } catch { toast.error('Could not send invite'); } finally { setInviting(false); } };
  if (loading) return <Spinner />;
  return (
    <div className="fade-in">
      <PageTitle title="Platform Settings" crumbs={[{ label: 'Admin' }, { label: 'Settings' }]} />
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card p-4 mb-4">
            <h6 className="fw-700 mb-3">Brand Configuration</h6>
            <div className="row g-3">
              {[['site_name','Platform Name'],['tagline','Tagline'],['email','Contact Email'],['phone','Phone'],['whatsapp_link','WhatsApp Community Link']].map(([k,l]) => <div key={k} className="col-sm-6"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>{l}</label><input className="form-control" value={brand?.[k] || ''} onChange={e => setBrand((p: any) => ({ ...p, [k]: e.target.value }))} /></div>)}
            </div>
          </div>
          <div className="card p-4 mb-4">
            <h6 className="fw-700 mb-3">Default Revenue Split</h6>
            <div className="row g-3">
              <div className="col-sm-6"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Creator Earns (%)</label><input type="number" className="form-control" min={0} max={100} value={brand?.default_creator_pct ?? 70} onChange={e => setBrand((p: any) => ({ ...p, default_creator_pct: Number(e.target.value), default_platform_pct: 100 - Number(e.target.value) }))} /></div>
              <div className="col-sm-6"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Platform Earns (%)</label><input type="number" className="form-control" readOnly value={brand?.default_platform_pct ?? 30} /></div>
            </div>
          </div>
          <button className="btn btn-primary btn-icon-start" onClick={save} disabled={saving}>{saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : <><i className="bi bi-check-circle" /> Save Settings</>}</button>
        </div>
        <div className="col-lg-4">
          <div className="card p-4">
            <h6 className="fw-700 mb-3">Invite Users</h6>
            <div className="d-flex flex-column gap-2">
              <input type="email" className="form-control" placeholder="user@email.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <select className="form-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>{['student','tutor','creator','admin'].map(r => <option key={r} value={r}>{r}</option>)}</select>
              <button className="btn btn-primary btn-icon-start" onClick={sendInvite} disabled={inviting || !inviteEmail}>{inviting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-send" />} Send Invite</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminEnrollments() { return <div className="fade-in"><PageTitle title="Enrollments" crumbs={[{ label: 'Admin' }, { label: 'Enrollments' }]} /><div className="alert alert-info">Use the admin API to manage enrollments. Per-user enrollment management available on the Users page.</div></div>; }

export function AdminPaths() {
  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { pathsApi.list().then(r => setPaths(r.data.items || [])).finally(() => setLoading(false)); }, []);
  return <div className="fade-in"><PageTitle title="Learning Paths" crumbs={[{ label: 'Admin' }, { label: 'Paths' }]} />{loading ? <Spinner /> : paths.length === 0 ? <Empty icon="bi-signpost-split" title="No learning paths" /> : <div className="row g-3">{paths.map((p: any) => <div key={p.id} className="col-md-4"><div className="card p-3"><h6 className="fw-700">{p.title}</h6><div className="text-muted small">{p.courses_count} courses</div></div></div>)}</div>}</div>;
}

export function AdminSchedules() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminApi.listSchedules().then(r => setSchedules(r.data || [])).finally(() => setLoading(false)); }, []);
  return <div className="fade-in"><PageTitle title="Schedules" crumbs={[{ label: 'Admin' }, { label: 'Schedules' }]} />{loading ? <Spinner /> : schedules.length === 0 ? <Empty icon="bi-calendar3" title="No schedules" /> : <div className="row g-3">{schedules.map((s: any) => <div key={s.id} className="col-md-4"><div className="card p-3"><h6 className="fw-700">{s.title}</h6><div className="text-muted small">{new Date(s.start_time).toLocaleString()}</div>{s.meeting_link && <a href={s.meeting_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary mt-2">Join</a>}</div></div>)}</div>}</div>;
}

export function AdminPartnership() {
  const [data, setData] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { partnershipsApi.list().then(r => setData(r.data.items || [])).finally(() => setLoading(false)); }, []);
  return <div className="fade-in"><PageTitle title="Partnerships" crumbs={[{ label: 'Admin' }, { label: 'Partnerships' }]} />{loading ? <Spinner /> : data.length === 0 ? <Empty icon="bi-building" title="No partnerships" /> : <div className="card overflow-hidden"><table className="table mb-0"><thead><tr><th>Organization</th><th>Students</th><th>Status</th></tr></thead><tbody>{data.map(p => <tr key={p.id}><td><div className="fw-600">{p.org_name}</div><div className="text-muted small">{p.org_email}</div></td><td>{p.active_students}</td><td><StatusBadge status={p.status} /></td></tr>)}</tbody></table></div>}</div>;
}

export function AdminDiscounts() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', value: '10', max_uses: '', valid_until: '' });
  const [saving, setSaving] = useState(false);
  /*const load = () => { 
    paymentsApi.listDiscounts().then(r => setDiscounts(r.data?.items || r.data || [])).finally(() => setLoading(false)); 
  };*/
  const load = () => { 
      setLoading(true); 
      paymentsApi.listDiscounts().then(r => {
          // r = AxiosResponse { data: { success: true, data: { items: [...] } } }
          // r.data = { success: true, data: { items: [...] } }
          // r.data.data = { items: [...], total: 1, ... }
          // r.data.data.items = [...]
          
          const items = r.data?.data?.items || [];
          // console.log("Items extracted:", items);
          setDiscounts(items);
      }).finally(() => setLoading(false)); 
  };

  useEffect(load, []);
  const create = async () => { setSaving(true); try { await paymentsApi.createDiscount({ ...form, value: Number(form.value), max_uses: form.max_uses ? Number(form.max_uses) : undefined, valid_until: form.valid_until || undefined }); toast.success('Created!'); setShowModal(false); load(); } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setSaving(false); } };
  return (
    <div className="fade-in">
      <PageTitle title="Discount Codes" crumbs={[{ label: 'Admin' }, { label: 'Discounts' }]} />
      <div className="d-flex justify-content-end mb-4"><button className="btn btn-primary btn-icon-start" onClick={() => setShowModal(true)}><i className="bi bi-plus-circle" /> Create Code</button></div>
      {loading ? <Spinner /> : discounts.length === 0 ? <Empty icon="bi-tag" title="No discount codes" /> : (
        <div className="card overflow-hidden"><table className="table mb-0"><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Uses</th><th></th></tr></thead><tbody>{discounts?.map((d: any) => <tr key={d.id}><td><code className="bg-light px-2 py-1 rounded">{d.code}</code></td><td style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{d.discount_type}</td><td className="fw-600" style={{ fontSize: '0.875rem' }}>{d.discount_type === 'percentage' ? `${d.value}%` : `₦${d.value}`}</td><td style={{ fontSize: '0.8rem' }}>{d.used_count}{d.max_uses ? `/${d.max_uses}` : ''}</td><td><button className="btn btn-sm btn-outline-danger" onClick={async () => { await paymentsApi.deleteDiscount(d.id); load(); }}><i className="bi bi-trash" /></button></td></tr>)}</tbody></table></div>
      )}
      <Modal show={showModal} onClose={() => setShowModal(false)} title="Create Discount Code" footer={<div className="d-flex gap-2 ms-auto"><button className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={create} disabled={saving}>{saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}Create</button></div>}>
        <div className="row g-3">
          <div className="col-12"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Code</label><input className="form-control" placeholder="e.g. SAVE20" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} /></div>
          <div className="col-sm-6"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Type</label><select className="form-select" value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))}><option value="percentage">Percentage</option><option value="fixed">Fixed (₦)</option></select></div>
          <div className="col-sm-6"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Value</label><input type="number" className="form-control" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} /></div>
          <div className="col-sm-6"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Max Uses</label><input type="number" className="form-control" placeholder="Unlimited" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} /></div>
          <div className="col-sm-6"><label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Expiry Date</label><input type="date" className="form-control" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}

export function AdminCertificates() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminApi.listCertificates().then(r => setCerts(r.data || [])).finally(() => setLoading(false)); }, []);
  return <div className="fade-in"><PageTitle title="Certificates" crumbs={[{ label: 'Admin' }, { label: 'Certificates' }]} />{loading ? <Spinner /> : certs.length === 0 ? <Empty icon="bi-award" title="No certificates issued yet" /> : <div className="card overflow-hidden"><table className="table mb-0"><thead><tr><th>Student</th><th>Course</th><th>Cert #</th><th>Issued</th><th>Status</th></tr></thead><tbody>{certs.map((c: any) => <tr key={c.id}><td><div className="fw-600" style={{ fontSize: '0.875rem' }}>{c.user?.name}</div><div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.user?.email}</div></td><td style={{ fontSize: '0.875rem' }}>{c.course?.title}</td><td><code style={{ fontSize: '0.75rem' }}>{c.cert_number}</code></td><td style={{ fontSize: '0.8rem' }}>{c.issued_at ? new Date(c.issued_at).toLocaleDateString() : '—'}</td><td><StatusBadge status={c.status} /></td></tr>)}</tbody></table></div>}</div>;
}

export default AdminUsers;
