import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { coursesApi } from '@/services/api';
import { Course, Category } from '@/types';
import { CourseCard, Spinner, Empty } from '@/components/shared/index';
import '@/styles/pages/courses/Explore.css';
import Pagination from '@/components/shared/Pagination';

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const DEFAULT_COURSE_THUMB = '/static/images/0.png';

const LEVELS = [
  'novice',
  'beginner',
  'intermediate',
  'professional',
  'expert',
  'advanced',
];

const PAYMENT_TYPES = [
  { value: 'free',          label: 'Free' },
  { value: 'one_time',      label: 'One-time Payment' },
  { value: 'subscription',  label: 'Subscription' },
  { value: 'pay_as_you_go', label: 'Pay as You Go' },
];

const SORTS = [
  { value: 'newest',  label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating',  label: 'Top Rated' },
];

const PER_PAGE = 12;

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface Filters {
  categories:   string[];
  levels:       string[];
  paymentTypes: string[];
  featured:     boolean;
  sort:         string;
}

const DEFAULT_FILTERS: Filters = {
  categories:   [],
  levels:       [],
  paymentTypes: [],
  featured:     false,
  sort:         'newest',
};

/* ═══════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════ */

/**
 * Returns a stable, non-empty key for a category used in filter state.
 *
 * The previous code used `cat.slug || ''`. When the API returns categories
 * without a slug field (or with slug: null / slug: ''), every category
 * collapses to the same key ''. The first click adds '' to the array;
 * every subsequent `includes('')` check then returns true for all items,
 * making them all appear checked simultaneously.
 *
 * Fix: fall back to the numeric id (as a string) which is always unique.
 */
function categoryKey(cat: Category): string {
  const slug = cat.slug?.trim();
  return slug || String(cat.id);
}

function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.categories.length   > 0 ||
    filters.levels.length       > 0 ||
    filters.paymentTypes.length > 0 ||
    filters.featured
  );
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    new RegExp(escaped, 'i').test(part)
      ? <mark key={i} className="search-highlight">{part}</mark>
      : part,
  );
}

function buildPageNumbers(total: number, current: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | null)[] = [];

  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, null, total);
  } else if (current >= total - 3) {
    pages.push(1, null, total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, null, current - 1, current, current + 1, null, total);
  }

  return pages;
}

/* ═══════════════════════════════════════════
   SearchModal
   ═══════════════════════════════════════════ */
interface SearchModalProps {
  onClose: () => void;
}

function SearchModal({ onClose }: SearchModalProps) {
  const navigate = useNavigate();

  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<Course[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    timerRef.current = setTimeout(() => {
      coursesApi
        .list({ search: query.trim(), per_page: 8, status: 'published' })
        .then(r => {
          setResults(r.data?.items || []);
          setActiveIdx(0);
        })
        .finally(() => setSearching(false));
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const goToCourse = useCallback((course: Course) => {
    navigate(`/courses/${course.slug || course.id}`);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        if (results[activeIdx]) goToCourse(results[activeIdx]);
        break;
    }
  };

  return (
    <div
      className="search-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search courses"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Input row ── */}
        <div className="search-modal-input-row">
          {searching
            ? <div className="search-modal-spinner" aria-hidden="true" />
            : (
              <svg className="search-modal-input-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11"/>
              </svg>
            )
          }
          <input
            ref={inputRef}
            className="search-modal-input"
            placeholder="Search courses…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              className="search-modal-clear-btn"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Results ── */}
        {results.length > 0 && (
          <div className="search-modal-results" role="listbox">
            {results.map((course, idx) => (
              <div
                key={course.id}
                className={`search-result-item${idx === activeIdx ? ' active' : ''}`}
                role="option"
                aria-selected={idx === activeIdx}
                onClick={() => goToCourse(course)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <div className="search-result-title">
                  {highlight(course.title, query)}
                </div>
                <div className="search-result-slug">
                  /courses/{course.slug || course.id}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {query.trim() && !searching && results.length === 0 && (
          <div className="search-modal-empty" role="status">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ opacity: 0.45 }}>
              <path d="M4.98 4a.5.5 0 0 0-.39.188L1.54 8H6a.5.5 0 0 1 .5.5 1.5 1.5 0 1 0 3 0A.5.5 0 0 1 10 8h4.46l-3.05-3.812A.5.5 0 0 0 11.02 4zm-1.17-.437A1.5 1.5 0 0 1 4.98 3h6.04a1.5 1.5 0 0 1 1.17.563l3.7 4.625a.5.5 0 0 1 .106.374l-.39 3.124A1.5 1.5 0 0 1 14.117 13H1.883a1.5 1.5 0 0 1-1.489-1.314L.004 8.562a.5.5 0 0 1 .106-.374z"/>
            </svg>
            <p>No courses found for <strong>"{query}"</strong></p>
          </div>
        )}

        {/* ── Keyboard hint footer ── */}
        <div className="search-modal-footer" aria-hidden="true">
          <span>
            <kbd>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
              </svg>
            </kbd>
            <kbd>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
              </svg>
            </kbd>
            Navigate
          </span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SidebarContent
   Defined at module scope — never recreated
   on parent re-render, preserving scroll
   position and preventing remount flushes.
   ═══════════════════════════════════════════ */
interface SidebarContentProps {
  filters:          Filters;
  categories:       Category[];
  active:           boolean;
  onClearAll:       () => void;
  onClose:          () => void;
  onToggleMulti:    (key: 'categories' | 'levels' | 'paymentTypes', value: string) => void;
  onToggleFeatured: () => void;
}

function SidebarContent({
  filters,
  categories,
  active,
  onClearAll,
  onClose,
  onToggleMulti,
  onToggleFeatured,
}: SidebarContentProps) {
  return (
    <>
      {/* ── Header ── */}
      <div className="filter-sidebar-header">
        <h6 className="filter-sidebar-title">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/>
          </svg>
          Course Filters
        </h6>

        <div className="filter-sidebar-header-actions">
          {active && (
            <button
              className="btn btn-sm btn-outline-secondary filter-clear-btn"
              onClick={onClearAll}
            >
              Clear all
            </button>
          )}
          <button
            className="filter-sidebar-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Category ── */}
      <div className="filter-section">
        <div className="filter-section-title">Category</div>
        <div className="filter-checkbox-list">
          {categories.map(cat => {
            /*
             * categoryKey() guarantees a unique, non-empty string per category
             * even when the API omits or nulls the slug field.
             */
            const key     = categoryKey(cat);
            const checked = filters.categories.includes(key);
            return (
              <div
                key={cat.id}
                className={`filter-checkbox-item${checked ? ' checked' : ''}`}
                onClick={() => onToggleMulti('categories', key)}
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                onKeyDown={e => e.key === ' ' && onToggleMulti('categories', key)}
              >
                <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
                <label>{cat.title}</label>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Level ── */}
      <div className="filter-section">
        <div className="filter-section-title">Level</div>
        <div className="filter-checkbox-list">
          {LEVELS.map(level => {
            const checked = filters.levels.includes(level);
            return (
              <div
                key={level}
                className={`filter-checkbox-item${checked ? ' checked' : ''}`}
                onClick={() => onToggleMulti('levels', level)}
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                onKeyDown={e => e.key === ' ' && onToggleMulti('levels', level)}
              >
                <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
                <label>{level}</label>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Price / Access ── */}
      <div className="filter-section">
        <div className="filter-section-title">Price / Access</div>
        <div className="filter-checkbox-list">
          {PAYMENT_TYPES.map(pt => {
            const checked = filters.paymentTypes.includes(pt.value);
            return (
              <div
                key={pt.value}
                className={`filter-checkbox-item${checked ? ' checked' : ''}`}
                onClick={() => onToggleMulti('paymentTypes', pt.value)}
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                onKeyDown={e => e.key === ' ' && onToggleMulti('paymentTypes', pt.value)}
              >
                <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
                <label>{pt.label}</label>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Featured ── */}
      <div className="filter-section">
        <div className="filter-checkbox-list">
          <div
            className={`filter-checkbox-item${filters.featured ? ' checked' : ''}`}
            onClick={onToggleFeatured}
            role="checkbox"
            aria-checked={filters.featured}
            tabIndex={0}
            onKeyDown={e => e.key === ' ' && onToggleFeatured()}
          >
            <input type="checkbox" checked={filters.featured} readOnly tabIndex={-1} />
            <label>
              <svg
                width="11" height="11" viewBox="0 0 16 16" fill="currentColor"
                style={{ color: 'var(--accent)', marginRight: '0.25rem' }}
                aria-hidden="true"
              >
                <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
              </svg>
              Featured only
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   Explore (main page)
   ═══════════════════════════════════════════ */
export default function Explore() {
  const [params] = useSearchParams();

  /* ── State ── */
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);

  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    categories: params.get('category') ? [params.get('category')!] : [],
    levels:     params.get('level')    ? [params.get('level')!]    : [],
    sort:       params.get('sort')     || 'newest',
  });

  /* ── Load categories once ── */
  useEffect(() => {
    coursesApi.getCategories().then(r => setCategories(r.data || []));
  }, []);

  /* ── Fetch courses whenever filters or page change ── */
  useEffect(() => {
    setLoading(true);

    const query: Record<string, unknown> = {
      page,
      per_page: PER_PAGE,
      status:   'published',
      sort:     filters.sort,
    };

    if (filters.categories.length   > 0) query.category     = filters.categories.join(',');
    if (filters.levels.length       > 0) query.level        = filters.levels.join(',');
    if (filters.paymentTypes.length > 0) query.payment_type = filters.paymentTypes.join(',');
    if (filters.featured)                query.featured      = true;

    coursesApi
      .list(query)
      .then(r => {
        setCourses(r.data?.items || []);
        setTotal(r.data?.total   || 0);
      })
      .finally(() => setLoading(false));
  }, [page, filters]);

  /* ── Lock body scroll when drawer or modal is open ── */
  useEffect(() => {
    document.body.style.overflow = (sidebarOpen || searchOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, searchOpen]);

  /* ─── Handlers — stable via useCallback ─── */
  const toggleMulti = useCallback((
    key: 'categories' | 'levels' | 'paymentTypes',
    value: string,
  ) => {
    setFilters(prev => {
      const cur  = prev[key] as string[];
      const next = cur.includes(value)
        ? cur.filter(v => v !== value)
        : [...cur, value];
      return { ...prev, [key]: next };
    });
    setPage(1);
  }, []);

  const toggleFeatured = useCallback(() => {
    setFilters(prev => ({ ...prev, featured: !prev.featured }));
    setPage(1);
  }, []);

  const setSort = (sort: string) => {
    setFilters(prev => ({ ...prev, sort }));
    setPage(1);
  };

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handleClose = useCallback(() => setSidebarOpen(false), []);

  /* ─── Derived values ─── */
  const pages      = Math.ceil(total / PER_PAGE);
  const active     = hasActiveFilters(filters);
  const pageNums   = buildPageNumbers(pages, page);
  const rangeStart = (page - 1) * PER_PAGE + 1;
  const rangeEnd   = Math.min(page * PER_PAGE, total);

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */
  return (
    <div className="explore-root fade-in">

      {/* ── Search modal ── */}
      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)} />
      )}

      {/* ── Page header ── */}
      <div className="page-title-container">
        <div className="explore-page-header">
          <div>
            <h1>Explore Courses</h1>
            <p className="explore-subtitle text-primary">
              {total} course{total !== 1 ? 's' : ''} available
              {active && (
                <span className="explore-subtitle__filtered"> — filtered</span>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
              style={{ borderRadius: '999px', padding: '0.4rem 1rem' }}
              onClick={() => setSearchOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11"/>
              </svg>
              Search
            </button>

            <button
              className="filter-toggle-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open filters"
              aria-expanded={sidebarOpen}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/>
              </svg>
              Filters
              {active && <span className="filter-active-dot" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile overlay ── */}
      <div
        className={`filter-overlay${sidebarOpen ? ' show' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Two-column layout ── */}
      <div className="explore-layout">

        <aside
          className={`filter-sidebar${sidebarOpen ? ' open' : ''}`}
          aria-label="Course filters"
        >
          <SidebarContent
            filters={filters}
            categories={categories}
            active={active}
            onClearAll={clearAll}
            onClose={handleClose}
            onToggleMulti={toggleMulti}
            onToggleFeatured={toggleFeatured}
          />
        </aside>

        {/* ── Course column ── */}
        <div className="explore-courses-col">

          {/* Sort bar */}
          <div className="explore-sortbar">
            <span className="explore-sortbar-info">
              {total > 0 && !loading
                ? `Showing ${rangeStart}–${rangeEnd} of ${total}`
                : '\u00A0'}
            </span>

            <div className="explore-sortbar-right">
              <span>Sort:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={filters.sort}
                onChange={e => setSort(e.target.value)}
              >
                {SORTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {active && (
            <div className="explore-chips">
              {filters.categories.map(key => {
                /* Resolve display label using the same key function */
                const cat = categories.find(c => categoryKey(c) === key);
                return cat ? (
                  <span
                    key={key}
                    className="badge badge-primary text-primary explore-chip"
                    onClick={() => toggleMulti('categories', key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && toggleMulti('categories', key)}
                  >
                    {cat.title}
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '0.25rem' }}>
                      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                    </svg>
                  </span>
                ) : null;
              })}

              {filters.levels.map(l => (
                <span
                  key={l}
                  className="badge badge-accent explore-chip"
                  style={{ textTransform: 'capitalize' }}
                  onClick={() => toggleMulti('levels', l)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && toggleMulti('levels', l)}
                >
                  {l}
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '0.25rem' }}>
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                  </svg>
                </span>
              ))}

              {filters.paymentTypes.map(pt => {
                const found = PAYMENT_TYPES.find(p => p.value === pt);
                return found ? (
                  <span
                    key={pt}
                    className="badge badge-secondary explore-chip text-primary"
                    onClick={() => toggleMulti('paymentTypes', pt)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && toggleMulti('paymentTypes', pt)}
                  >
                    {found.label}
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '0.25rem' }}>
                      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                    </svg>
                  </span>
                ) : null;
              })}

              {filters.featured && (
                <span
                  className="badge badge-warning explore-chip"
                  onClick={toggleFeatured}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && toggleFeatured()}
                >
                  Featured
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: '0.25rem' }}>
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                  </svg>
                </span>
              )}
            </div>
          )}

          {/* ── Courses / Loading / Empty ── */}
          {loading ? (
            <Spinner />
          ) : courses.length === 0 ? (
            <Empty
              icon="bi-search"
              title="No courses found"
              subtitle="Try adjusting your filters or search terms"
              action={active ? { label: 'Clear filters', onClick: clearAll } : undefined}
            />
          ) : (
            <>
              <div className="explore-grid">
                {courses.map(c => (
                  <CourseCard
                    key={c.id}
                    course={{
                      ...c,
                      thumbnail: c.thumbnail,
                      // thumbnail: c.thumbnail || DEFAULT_COURSE_THUMB,
                    }}
                  />
                ))}
              </div>

              {/* ── Pagination ── */}
              <Pagination
                page={page}
                pages={pages}
                onPageChange={setPage}
                ariaLabel="Course pages"
              />

            </>
          )}
        </div>
      </div>
    </div>
  );
}