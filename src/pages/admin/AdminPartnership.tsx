import { useState, useEffect } from 'react';
import { partnershipsApi } from '@/services/api';
import { Partnership } from '@/types';
import { Spinner, Empty, PageTitle, StatusBadge } from '@/components/shared/index';

export default function AdminPartnership() {
  const [data, setData] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { partnershipsApi.list().then(r => setData(r.data.items || [])).finally(() => setLoading(false)); }, []);
  return <div className="fade-in">
    <PageTitle title="Partnerships" crumbs={[{ label: 'Admin' }, { label: 'Partnerships' }]} />
    {loading ? <Spinner /> : data.length === 0 ? <Empty icon="bi-building" title="No partnerships" /> : <div className="card overflow-hidden">
        <table className="table mb-0">
        <thead>
            <tr><th>Organization</th><th>Students</th><th>Status</th>
        </tr>
        </thead>
        <tbody>{data.map(p => 
        <tr key={p.id}>
            <td>
            <div className="fw-600">{p.org_name}</div>
            <div className="text-muted small">{p.org_email}</div>
            </td>
            <td>{p.active_students}</td><td>
                <StatusBadge status={p.status} />
            </td>
        </tr>
    )}
    </tbody>
    </table>
    </div>
    }
</div>;
}
