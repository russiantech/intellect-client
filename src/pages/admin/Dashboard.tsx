import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/services/api';
import { AdminDashboardStats } from '@/types';
import { StatCard, Spinner, PageTitle } from '@/components/shared/index';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return null;

  const chartData = {
    labels: stats.enrollment_trend.map(d => new Date(d.date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Enrollments',
      data: stats.enrollment_trend.map(d => d.enrollments),
      fill: true,
      backgroundColor: 'rgba(74, 144, 217, 0.1)',
      borderColor: 'rgba(74, 144, 217, 1)',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#4A90D9',
    }],
  };

  const quickLinks = [
    { to: '/admin/courses', icon: 'bi-journal-text', label: 'Manage Courses', desc: `${stats.pending_approval} pending approval`, color: 'warning' },
    { to: '/admin/users', icon: 'bi-people', label: 'Manage Users', desc: `${stats.total_users} total users`, color: 'primary' },
    { to: '/admin/team-requests', icon: 'bi-person-badge', label: 'Team Requests', desc: `${stats.pending_team_requests} pending`, color: 'info' },
    { to: '/admin/partnerships', icon: 'bi-building', label: 'Partnerships', desc: `${stats.active_partnerships} active`, color: 'success' },
    { to: '/admin/broadcast', icon: 'bi-broadcast', label: 'Send Broadcast', desc: 'Email all users', color: 'purple' },
    { to: '/admin/discounts', icon: 'bi-tag', label: 'Discounts', desc: 'Manage promo codes', color: 'teal' },
  ];

  return (
    <div className="fade-in">
      <PageTitle
        title="Admin Dashboard"
        subtitle="Overview of Intellect LMS"
        crumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}
      />

      {/* Stats row 1 */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3"><StatCard icon="bi-people" label="Total Users" value={stats.total_users} color="blue" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-book" label="Total Courses" value={stats.total_courses} color="purple" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-person-check" label="Total Enrollments" value={stats.total_enrollments} color="green" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-currency-naira" label="Total Revenue" value={`₦${(stats.total_revenue / 1000).toFixed(0)}k`} color="yellow" /></div>
      </div>

      {/* Stats row 2 */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3"><StatCard icon="bi-person-video3" label="Tutors" value={stats.total_tutors} color="teal" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-brush" label="Creators" value={stats.total_creators} color="purple" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-clock-history" label="Pending Approval" value={stats.pending_approval} color="yellow" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-calendar-month" label="This Month Revenue" value={`₦${(stats.this_month_revenue / 1000).toFixed(0)}k`} color="green" /></div>
      </div>

      <div className="row g-4">
        {/* Chart */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header-custom">
              <h6 className="fw-700 mb-0"><i className="bi bi-graph-up me-2 text-primary" />Enrollment Trend (Last 7 Days)</h6>
            </div>
            <div className="p-3">
              <Line data={chartData} options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } },
              }} />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header-custom">
              <h6 className="fw-700 mb-0"><i className="bi bi-lightning me-2 text-primary" />Quick Actions</h6>
            </div>
            <div className="p-2">
              {quickLinks.map(ql => (
                <Link key={ql.to} to={ql.to} className="d-flex align-items-center gap-3 p-3 rounded-2 text-decoration-none" style={{ transition: 'var(--transition)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <div className={`stat-icon ${ql.color}`} style={{ width: 40, height: 40, borderRadius: 'var(--radius)' }}>
                    <i className={`bi ${ql.icon}`} />
                  </div>
                  <div>
                    <div className="fw-600" style={{ fontSize: '0.875rem' }}>{ql.label}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{ql.desc}</div>
                  </div>
                  <i className="bi bi-chevron-right text-muted ms-auto" style={{ fontSize: '0.75rem' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Role breakdown */}
      <div className="row g-3 mt-1">
        <div className="col-md-4">
          <div className="card p-3 text-center">
            <div className="stat-icon blue mx-auto mb-2" style={{ width: 48, height: 48 }}>
              <i className="bi bi-mortarboard" />
            </div>
            <div className="fw-700 fs-4">{stats.total_students}</div>
            <div className="text-muted small">Students</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3 text-center">
            <div className="stat-icon teal mx-auto mb-2" style={{ width: 48, height: 48 }}>
              <i className="bi bi-person-video3" />
            </div>
            <div className="fw-700 fs-4">{stats.total_tutors}</div>
            <div className="text-muted small">Tutors</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3 text-center">
            <div className="stat-icon purple mx-auto mb-2" style={{ width: 48, height: 48 }}>
              <i className="bi bi-building" />
            </div>
            <div className="fw-700 fs-4">{stats.active_partnerships}</div>
            <div className="text-muted small">Active Partners</div>
          </div>
        </div>
      </div>
    </div>
  );
}
