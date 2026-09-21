import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { coursesApi } from '@/services/api';
import { Course, Category } from '@/types';
import { CourseCard, Spinner } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<Course[]>([]);
  const [recent, setRecent] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      coursesApi.list({ featured: true, per_page: 4, status: 'published' }),
      coursesApi.list({ per_page: 8, status: 'published', sort: 'newest' }),
      coursesApi.getCategories(),
    ]).then(([f, r, c]) => {
      setFeatured(f.data.items || []);
      setRecent(r.data.items || []);
      setCategories(c.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      {/* Hero */}
      {!user && (
        <div className="rounded-3 mb-5 p-5 text-white position-relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--primary-dark) 0%, #1a3a5c 100%)', minHeight: 280 }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="position-relative">
            <h1 className="fw-bold mb-3" style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>
              Learn anything.<br />Teach everything.
            </h1>
            <p className="opacity-75 mb-4" style={{ maxWidth: 500, fontSize: '1rem' }}>
              Intellect is your digital learning companion — explore hundreds of courses, earn certificates, and grow at your own pace.
            </p>
            <div className="d-flex gap-3 flex-wrap">
              <Link to="/explore" className="btn btn-light btn-icon-start fw-600">
                <i className="bi bi-compass" /> Explore Courses
              </Link>
              <Link to="/auth/signup" className="btn btn-outline-light btn-icon-start fw-600">
                <i className="bi bi-person-plus" /> Get Started Free
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <>
          {/* {console.log(categories)} */}
        <div className="mb-5">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="small-title mb-0">Browse by Category</h2>
          </div>
          <div className="row g-2">
            {categories.slice(0, 8).map(cat => (
              <div className="col-6 col-sm-4 col-md-3 col-lg-2" key={cat.id}>
                <Link to={`/explore?category=${cat.slug}`} className="card text-center p-3 h-100 text-decoration-none" style={{ transition: 'var(--transition)' }}>
                  <div className="text-primary mb-2" style={{ fontSize: '1.75rem' }}>
                    {cat.icon ? <i className={`bi ${cat.icon}`} /> : <i className="bi bi-folder" />}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{cat.title}</div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        </>
      )}

      {/* Featured Courses */}
      {featured.length > 0 && (
        <div className="mb-5">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="small-title mb-0">Featured Courses</h2>
            <Link to="/explore?featured=true" className="text-primary" style={{ fontSize: '0.8rem' }}>View all <i className="bi bi-arrow-right" /></Link>
          </div>
          {loading ? <Spinner /> : (
            <div className="row g-3">
              {featured.map(c => (
                <div className="col-12 col-sm-6 col-lg-3" key={c.id}>
                  <CourseCard course={c} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Latest Courses */}
      <div className="mb-5">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="small-title mb-0">Latest Courses</h2>
          <Link to="/explore" className="text-primary" style={{ fontSize: '0.8rem' }}>View all <i className="bi bi-arrow-right" /></Link>
        </div>
        {loading ? <Spinner /> : (
          <div className="row g-3">
            {recent.map(c => (
              <div className="col-12 col-sm-6 col-lg-3" key={c.id}>
                <CourseCard course={c} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      {!user && (
        <div className="card p-5 text-center mb-4" style={{ background: 'linear-gradient(135deg, var(--primary-light), #e8f4fd)' }}>
          <div className="text-primary mb-3" style={{ fontSize: '2.5rem' }}>
            <i className="bi bi-mortarboard-fill" />
          </div>
          <h3 className="fw-bold mb-2">Ready to start learning?</h3>
          <p className="text-muted mb-4">Join our community of learners and creators. Free to get started.</p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link to="/auth/signup" className="btn btn-primary btn-icon-start">
              <i className="bi bi-person-plus" /> Create Free Account
            </Link>
            <Link to="/explore" className="btn btn-outline-primary btn-icon-start">
              <i className="bi bi-compass" /> Browse Courses
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
