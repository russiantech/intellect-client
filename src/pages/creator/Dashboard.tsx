import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { creatorApi } from '@/services/api';
import { CreatorAnalytics } from '@/types';
import { StatCard, Spinner, PageTitle } from '@/components/shared/index';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import { useAuth } from '@/context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    creatorApi.analytics().then(r => setAnalytics(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  if (!user?.is_creator && !user?.is_admin()) {
    return (
      <div className="fade-in">
        <div className="text-center py-5">
          <div className="stat-icon purple mx-auto mb-3" style={{ width: 72, height: 72, fontSize: '2rem' }}><i className="bi bi-pencil-square" /></div>
          <h4 className="fw-bold mb-2">Become a Creator</h4>
          <p className="text-muted mb-4" style={{ maxWidth: 400, margin: '0 auto 1.5rem' }}>
            Share your knowledge, build courses, and earn while helping others learn.
          </p>
          <Link to="/creator/request-creator" className="btn btn-primary btn-icon-start">
            <i className="bi bi-send" /> Apply to be a Creator
          </Link>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const chartData = {
    labels: analytics.enrollment_trend.map(d => new Date(d.date).toLocaleDateString('en-NG', { weekday: 'short' })),
    datasets: [{
      label: 'New Enrollments',
      data: analytics.enrollment_trend.map(d => d.enrollments),
      fill: true,
      backgroundColor: 'rgba(74, 144, 217, 0.1)',
      borderColor: '#4A90D9',
      tension: 0.4,
      pointRadius: 4,
    }],
  };

  return (
    <div className="fade-in">
      <PageTitle
        title="Creator Dashboard"
        subtitle={`Welcome back, ${user?.name || user?.username}!`}
        crumbs={[{ label: 'Creator' }, { label: 'Dashboard' }]}
      />
      <div className="d-flex gap-2 mb-4 flex-wrap">
        <Link to="/creator/courses/new" className="btn btn-primary btn-icon-start">
          <i className="bi bi-plus-circle" /> Create Course
        </Link>
        <Link to="/creator/courses" className="btn btn-outline-secondary btn-icon-start">
          <i className="bi bi-journal-text" /> My Courses
        </Link>
        <Link to="/creator/earnings" className="btn btn-outline-secondary btn-icon-start">
          <i className="bi bi-currency-dollar" /> Earnings
        </Link>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3"><StatCard icon="bi-journal-richtext" label="Total Courses" value={analytics.total_courses} color="blue" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-people" label="Total Enrollments" value={analytics.total_enrollments} color="green" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-currency-naira" label="Total Earnings" value={`₦${analytics.total_earnings.toLocaleString()}`} color="yellow" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-calendar-month" label="This Month" value={`₦${analytics.this_month_earnings.toLocaleString()}`} color="purple" /></div>
      </div>

      <div className="row g-4">
        {/* Chart */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header-custom">
              <h6 className="fw-700 mb-0"><i className="bi bi-graph-up me-2 text-primary" />Enrollment Trend (7 Days)</h6>
            </div>
            <div className="p-3">
              <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }} />
            </div>
          </div>
        </div>

        {/* Top courses */}
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header-custom">
              <h6 className="fw-700 mb-0"><i className="bi bi-trophy me-2 text-warning" />Top Performing Courses</h6>
            </div>
            <div className="p-3">
              {analytics.top_courses.length === 0 ? (
                <div className="text-center text-muted py-3" style={{ fontSize: '0.875rem' }}>
                  <i className="bi bi-journal-plus d-block mb-2" style={{ fontSize: '1.5rem' }} />
                  Create your first course to see performance
                </div>
              ) : analytics.top_courses.map((c, i) => (
                <div key={c.id} className="d-flex align-items-center gap-3 mb-3">
                  <div className="fw-700 text-muted" style={{ width: 24, textAlign: 'center', fontSize: '0.8rem' }}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/creator/courses/${c.id}/edit`} className="fw-600 text-decoration-none d-block truncate-2" style={{ fontSize: '0.8rem' }}>{c.title}</Link>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{c.enrollments} enrolled · ₦{(c.earnings || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {analytics.top_courses.length > 0 && (
                <Link to="/creator/courses" className="btn btn-sm btn-outline-primary w-100 mt-2">View All Courses</Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {analytics.total_courses === 0 && (
        <div className="card mt-4 p-5 text-center" style={{ background: 'linear-gradient(135deg, var(--primary-light), #e8f4fd)' }}>
          <i className="bi bi-pencil-square text-primary" style={{ fontSize: '3rem' }} />
          <h5 className="fw-bold mt-3 mb-2">Create your first course</h5>
          <p className="text-muted mb-4" style={{ maxWidth: 400, margin: '0 auto 1.5rem' }}>
            Share your expertise and start earning. Add videos, PDFs, quizzes, and more.
          </p>
          <Link to="/creator/courses/new" className="btn btn-primary btn-icon-start">
            <i className="bi bi-plus-circle" /> Create a Course
          </Link>
        </div>
      )}
    </div>
  );
}
