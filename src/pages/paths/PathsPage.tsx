import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pathsApi } from '@/services/api';
import { LearningPath } from '@/types';
import { Spinner, Empty, PageTitle, SearchInput } from '@/components/shared/index';
import { resolveImage } from '@/utils/resolveImage';

export default function PathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    pathsApi.list({ search: search || undefined })
      .then(r => setPaths(r.data.items || []))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="fade-in">
      <PageTitle title="Learning Paths" subtitle="Structured programs to master a skill end-to-end" />
      <div className="mb-4" style={{ maxWidth: 400 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search learning paths…" />
      </div>
      {loading ? <Spinner /> : paths.length === 0 ? (
        <Empty icon="bi-signpost-split" title="No learning paths yet" />
      ) : (
        <div className="row g-4">
          {paths.map(p => {
            const thumbUrl = resolveImage(p.thumbnail, undefined, 'paths/thumbnails');
            return (
              <div className="col-sm-6 col-lg-4" key={p.id}>
                <div className="card h-100" style={{ display: 'flex', flexDirection: 'column' }}>
                  {thumbUrl ? (
                    <img 
                      src={thumbUrl} 
                      alt={p.title}
                      style={{ 
                        height: 160, 
                        objectFit: 'cover', 
                        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', 
                        width: '100%' 
                      }} 
                    />
                  ) : (
                    <div style={{ 
                      height: 160, 
                      background: 'linear-gradient(135deg,var(--primary-light),#e8f4fd)', 
                      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <i className="bi bi-signpost-split text-primary" style={{ fontSize: '2.5rem' }} />
                    </div>
                  )}
                  <div className="p-4 flex-1 d-flex flex-column">
                    <h5 className="fw-bold mb-1">{p.title}</h5>
                    {p.description && (
                      <p className="text-muted truncate-3 mb-3" style={{ fontSize: '0.875rem', flex: 1 }}>
                        {p.description}
                      </p>
                    )}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                        <i className="bi bi-collection me-1" />{p.courses_count} courses
                      </span>
                      {p.fee > 0 ? (
                        <span className="fw-700 text-primary">₦{p.fee.toLocaleString()}</span>
                      ) : (
                        <span className="badge bg-success">Free</span>
                      )}
                    </div>
                    {p.is_enrolled && (
                      <div className="mb-3">
                        <div className="progress" style={{ height: 4 }}>
                          <div className="progress-bar" style={{ width: `${p.progress_pct || 0}%` }} />
                        </div>
                      </div>
                    )}
                    <Link to={`/paths/${p.slug}`} className="btn btn-outline-primary w-100 mt-auto">
                      {p.is_enrolled ? 'Continue Path' : 'View Path'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}