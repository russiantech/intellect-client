import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coursesApi } from '@/services/api';
import { Course } from '@/types';
import { Spinner, Empty, CourseCard, PageTitle, SearchInput } from '@/components/shared/index';

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = params.get('q') || '';
    setQuery(q);
    if (!q) return;
    setLoading(true);
    coursesApi.list({ search: q, status: 'published', per_page: 20 })
      .then(r => { setCourses(r.data.items || []); setTotal(r.data.total || 0); })
      .finally(() => setLoading(false));
  }, [params]);

  const handleSearch = (v: string) => {
    setQuery(v);
    if (v.trim()) setParams({ q: v.trim() });
  };

  return (
    <div className="fade-in">
      <PageTitle
        title={query ? `Results for "${query}"` : 'Search Courses'}
        subtitle={query && !loading ? `${total} result${total !== 1 ? 's' : ''} found` : ''}
      />
      <div className="mb-4" style={{ maxWidth: 480 }}>
        <SearchInput value={query} onChange={handleSearch} placeholder="Search courses, topics…" />
      </div>

      {!query && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-search d-block mb-3" style={{ fontSize: '3rem' }} />
          <h5>Search for anything</h5>
          <p style={{ fontSize: '0.875rem' }}>Find courses, topics, and instructors across Intellect</p>
        </div>
      )}

      {query && loading && <Spinner />}

      {query && !loading && courses.length === 0 && (
        <Empty
          icon="bi-search"
          title={`No results for "${query}"`}
          subtitle="Try different keywords or browse our course catalog."
          action={{ label: 'Browse All Courses', href: '/explore' }}
        />
      )}

      {!loading && courses.length > 0 && (
        <div className="row g-3">
          {courses.map(c => (
            <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={c.id}>
              <CourseCard course={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
