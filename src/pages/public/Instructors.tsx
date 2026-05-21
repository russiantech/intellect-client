// pages/public/Instructors.tsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usersApi } from '@/services/api';
import { PageTitle } from '@/components/shared';
import '@/styles/pages/instructors/Instructors.css';
import { Instructor } from '@/types';
import { InstructorCard } from '@/components/shared/InstructorCard';

const ROLE_TABS = [
  { key: '', label: 'All', icon: 'bi-people' },
  { key: 'tutor', label: 'Tutors', icon: 'bi-person-video3' },
  { key: 'creator', label: 'Creators', icon: 'bi-pencil-square' },
];


export default function Instructors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);

  const roleParam = searchParams.get('role') || '';
  const searchParam = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInstructors = (role: string, search: string, pg: number) => {
    setLoading(true);
    // console.log('Fetching from:', usersApi.listInstructors); // Check what this resolves to
    
    usersApi
      .listInstructors({ role: role || undefined, search: search || undefined, page: pg, per_page: 24 })
      .then(r => {
        console.log('Response:', r.config?.baseURL, r.config?.url); // See actual URL used
        setInstructors(r.data.items || []);
        setTotal(r.data.total || 0);
      })
      .catch(err => {
        console.error('Fetch error:', err.config?.baseURL, err.config?.url);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    fetchInstructors(roleParam, searchParam, 1);
  }, [roleParam, searchParam]);

  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (val) p.set('q', val); else p.delete('q');
      setSearchParams(p);
    }, 350);
  };

  const handleRole = (role: string) => {
    const p = new URLSearchParams(searchParams);
    if (role) p.set('role', role); else p.delete('role');
    p.delete('q');
    setSearchInput('');
    setSearchOpen(false);
    setSearchParams(p);
  };

  const clearAll = () => {
    setSearchInput('');
    setSearchOpen(false);
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="instructors-page fade-in">
      <PageTitle
        title="Meet The Creators"
        subtitle="Expert educators guiding your learning journey.
        Learn from industry practitioners, certified educators and domain experts who bring real-world experience into every lesson."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Instructors' }]}
      />

      {/* ── Toolbar: inline search + tabs ── */}
      <div className="instructors-toolbar rounded">
        <div className="toolbar-inner">
          <div className={`toolbar-search ${searchOpen ? 'is-open' : ''}`}>
            {!searchOpen ? (
              <button
                className="search-toggle"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
              >
                <i className="bi bi-search" />
              </button>
            ) : (
              <div className="search-field">
                <i className="bi bi-search search-icon-inside" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by name, title, skill…"
                  value={searchInput}
                  onChange={e => handleSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setSearchOpen(false);
                      if (searchInput) handleSearch('');
                    }
                  }}
                />
                <button
                  className="search-close"
                  onClick={() => { setSearchOpen(false); handleSearch(''); }}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x" />
                </button>
              </div>
            )}
          </div>

          <div className="role-tabs">
            {ROLE_TABS.map(tab => (
              <button
                key={tab.key}
                className={`role-tab ${roleParam === tab.key ? 'active' : ''}`}
                onClick={() => handleRole(tab.key)}
              >
                <i className={`bi ${tab.icon} me-2`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="instructors-body">
        {!loading && (
          <p className="result-count">
            {total === 0
              ? 'No instructors found'
              : `${total} instructor${total !== 1 ? 's' : ''}${searchParam ? ` matching "${searchParam}"` : ''}`}
          </p>
        )}

        {loading ? (
          <div className="instructors-loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="instructor-skeleton" />
            ))}
          </div>
        ) : instructors.length === 0 ? (
          <div className="instructors-empty">
            <i className="bi bi-people empty-icon" />
            <h5>No instructors found</h5>
            <p className="text-muted">Try a different search or check back soon.</p>
            <button className="btn btn-outline-primary mt-2" onClick={clearAll}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="instructors-grid">
            {instructors.map(t => (
              <InstructorCard key={t.id} instructor={t} />
            ))}
          </div>
        )}

        {!loading && total > 24 && (
          <div className="instructors-pagination">
            <button
              className="btn btn-outline-primary btn-sm"
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); fetchInstructors(roleParam, searchParam, p); }}
            >
              <i className="bi bi-chevron-left me-1" />Previous
            </button>
            <span className="page-info">Page {page} of {Math.ceil(total / 24)}</span>
            <button
              className="btn btn-outline-primary btn-sm"
              disabled={page >= Math.ceil(total / 24)}
              onClick={() => { const p = page + 1; setPage(p); fetchInstructors(roleParam, searchParam, p); }}
            >
              Next<i className="bi bi-chevron-right ms-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

