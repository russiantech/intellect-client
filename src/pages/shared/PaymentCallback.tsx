import { Link } from 'react-router-dom';
import { PageTitle, StatCard } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';

export default function PartnerDashboard() {
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
