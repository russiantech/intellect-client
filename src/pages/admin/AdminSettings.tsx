import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/services/api';
import { Spinner, Empty, PageTitle } from '@/components/shared/index';

export default function AdminBroadcast() {
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
