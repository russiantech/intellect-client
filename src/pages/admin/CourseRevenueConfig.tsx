import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { coursesApi } from '@/services/api';
import { Course } from '@/types';
import { Spinner, PageTitle } from '@/components/shared/index';

export default function CourseRevenueConfig() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatorPct, setCreatorPct] = useState(70);

  useEffect(() => {
    if (!courseId) return;
    coursesApi.get(courseId).then(r => {
      setCourse(r.data);
      setCreatorPct(r.data.creator_pct ?? 70);
    }).finally(() => setLoading(false));
  }, [courseId]);

  const save = async () => {
    if (!course) return;
    setSaving(true);
    try {
      await coursesApi.update(course.id, {
        creator_pct: creatorPct,
        platform_pct: 100 - creatorPct,
      });
      toast.success('Revenue split updated!');
      navigate('/admin/courses');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (!course) return null;

  const platformPct = 100 - creatorPct;
  const sampleRevenue = course.fee || 10000;

  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <PageTitle
        title="Revenue Split Configuration"
        subtitle={`Configure earnings for: ${course.title}`}
        crumbs={[{ label: 'Admin' }, { label: 'Courses', href: '/admin/courses' }, { label: 'Revenue Split' }]}
      />

      <div className="card p-4 mb-4">
        <h6 className="fw-700 mb-3">Creator Earnings Percentage</h6>
        <div className="mb-4">
          <div className="d-flex justify-content-between mb-2">
            <label className="fw-600" style={{ fontSize: '0.875rem' }}>Creator earns: <span className="text-primary">{creatorPct}%</span></label>
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>Platform earns: <span className="text-primary">{platformPct}%</span></span>
          </div>
          <input
            type="range"
            className="form-range"
            min={0} max={100} step={5}
            value={creatorPct}
            onChange={e => setCreatorPct(Number(e.target.value))}
          />
          <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.72rem' }}>
            <span>0% (all to platform)</span>
            <span>100% (all to creator)</span>
          </div>
        </div>

        {/* Visual breakdown */}
        <div className="mb-4">
          <div className="progress mb-2" style={{ height: 20, borderRadius: 8 }}>
            <div className="progress-bar bg-primary" style={{ width: `${creatorPct}%`, borderRadius: '8px 0 0 8px' }}>
              {creatorPct > 10 && <span style={{ fontSize: '0.7rem' }}>Creator {creatorPct}%</span>}
            </div>
            <div className="progress-bar bg-secondary" style={{ width: `${platformPct}%`, borderRadius: '0 8px 8px 0' }}>
              {platformPct > 10 && <span style={{ fontSize: '0.7rem' }}>Platform {platformPct}%</span>}
            </div>
          </div>
        </div>

        {/* Sample calculation */}
        <div className="card p-3" style={{ background: 'var(--bg)' }}>
          <h6 className="fw-700 mb-2" style={{ fontSize: '0.85rem' }}>
            <i className="bi bi-calculator me-2 text-primary" />Sample Calculation (at ₦{sampleRevenue.toLocaleString()} per enrollment)
          </h6>
          <div className="row g-2">
            <div className="col-6">
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <div className="fw-700 text-primary" style={{ fontSize: '1.25rem' }}>
                  ₦{Math.round(sampleRevenue * creatorPct / 100).toLocaleString()}
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Creator earns</div>
              </div>
            </div>
            <div className="col-6">
              <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                <div className="fw-700 text-secondary" style={{ fontSize: '1.25rem' }}>
                  ₦{Math.round(sampleRevenue * platformPct / 100).toLocaleString()}
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Platform earns</div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        {(creatorPct > 90 || creatorPct < 30) && (
          <div className={`alert ${creatorPct > 90 ? 'alert-warning' : 'alert-info'} mt-3`} style={{ fontSize: '0.8rem' }}>
            <i className="bi bi-exclamation-triangle me-1" />
            {creatorPct > 90
              ? 'Very high creator percentage leaves minimal platform revenue.'
              : 'Very low creator percentage may discourage course creation.'}
          </div>
        )}
      </div>

      <div className="d-flex gap-3">
        <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/courses')}>Cancel</button>
        <button className="btn btn-primary fw-600 btn-icon-start" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : <><i className="bi bi-check-circle" />Save Split</>}
        </button>
      </div>
    </div>
  );
}
