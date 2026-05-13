import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/services/api';
import { Spinner, Empty, PageTitle, Modal } from '@/components/shared/index';

export default function AdminDiscounts() {
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
