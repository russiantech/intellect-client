// pages/public/Instructors.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usersApi } from '@/services/api';
import { Avatar, PageTitle } from '@/components/shared';
import '@/styles/pages/instructors/Instructors.css';

interface Instructor {
  id: number;
  username: string;
  name: string;
  image?: string;
  title?: string;
  city?: string;
  country?: string;
  about?: string;
  creator_bio?: string;
  expertise?: string;
  primary_role: string;
  is_creator: boolean;
  creator_approved: boolean;
  is_online: boolean;
  education?: any;
  socials?: any;
}

const ROLE_TABS = [
  { key: '', label: 'All', icon: 'bi-people' },
  { key: 'tutor', label: 'Tutors', icon: 'bi-person-video3' },
  { key: 'creator', label: 'Creators', icon: 'bi-pencil-square' },
];

function ExpertisePills({ raw }: { raw?: string }) {
  if (!raw) return null;
  const tags = raw.split(/[,;|]+/).map(t => t.trim()).filter(Boolean).slice(0, 4);
  return (
    <div className="instructor-tags">
      {tags.map((t, i) => (
        <span key={i} className="instructor-tag" title={t}>{t}</span>
      ))}
    </div>
  );
}

function InstructorCard({ instructor: t }: { instructor: Instructor }) {
  const bio = t.creator_bio || t.about || '';
  return (
    <Link to={`/instructors/${t.username}`} className="instructor-card-link">
      <div className="instructor-card">
        <div className="instructor-avatar-wrap">
          <Avatar image={t.image} name={t.name || t.username} size={76} />
          {t.is_online && <span className="online-dot" title="Online now" />}
        </div>

        <span className={`role-badge role-badge--${t.primary_role}`}>
          {t.primary_role === 'creator' ? (
            <><i className="bi bi-patch-check-fill me-1" />Creator</>
          ) : (
            <><i className="bi bi-mortarboard-fill me-1" />Tutor</>
          )}
        </span>

        <h6 className="instructor-name">{t.name || t.username}</h6>

        {t.title && <p className="instructor-title">{t.title}</p>}

        {(t.city || t.country) && (
          <p className="instructor-location">
            <i className="bi bi-geo-alt" />
            {[t.city, t.country].filter(Boolean).join(', ')}
          </p>
        )}

        {bio && (
          <p className="instructor-bio">
            {bio.length > 80 ? bio.slice(0, 80) + '…' : bio}
          </p>
        )}

        <ExpertisePills raw={t.expertise} />

        <div className="instructor-card-footer">
          <span className="view-profile-link">
            View Profile <i className="bi bi-arrow-right" />
          </span>
        </div>
      </div>
    </Link>
  );
}

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
//   const debounceRef = useRef<<ReturnType<<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInstructors = (role: string, search: string, pg: number) => {
    setLoading(true);
    usersApi
      .listInstructors({ role: role || undefined, search: search || undefined, page: pg, per_page: 24 })
      .then(r => {
        setInstructors(r.data.items || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => {})
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

