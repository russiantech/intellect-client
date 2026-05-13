import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { Spinner, Empty, PageTitle, StatusBadge } from '@/components/shared/index';

export default function AdminCertificates() {
	const [certs, setCerts] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => { adminApi.listCertificates().then(r => setCerts(r.data || [])).finally(() => setLoading(false)); }, []);
	return <div className="fade-in"><PageTitle title="Certificates" crumbs={[{ label: 'Admin' }, { label: 'Certificates' }]} />
    {loading ? <Spinner /> : certs.length === 0 ? <Empty icon="bi-award" title="No certificates issued yet" /> : <div className="card overflow-hidden">
        <table className="table mb-0"><thead><tr><th>Student</th><th>Course</th><th>Cert #</th><th>Issued</th><th>Status</th></tr></thead>
        <tbody>
        {certs.map((c: any) => <tr key={c.id}><td><div className="fw-600" style={{ fontSize: '0.875rem' }}>{c.user?.name}
            </div><div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.user?.email}</div></td><td style={{ fontSize: '0.875rem' }}>
                {c.course?.title}</td><td><code style={{ fontSize: '0.75rem' }}>{c.cert_number}</code></td><td style={{ fontSize: '0.8rem' }}>
                    {c.issued_at ? new Date(c.issued_at).toLocaleDateString() : '—'}</td><td><StatusBadge status={c.status} /></td></tr>)}
        </tbody></table>
    </div>}
    </div>;
}
