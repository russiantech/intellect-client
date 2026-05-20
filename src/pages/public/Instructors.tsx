// // pages/public/Instructors.tsx
// import { useState, useEffect, useRef } from 'react';
// import { Link, useSearchParams } from 'react-router-dom';
// import { usersApi } from '@/services/api';
// import { Avatar } from '@/components/shared';
// import '@/styles/pages/instructors/Instructors.css';

// interface Instructor {
//   id: number;
//   username: string;
//   name: string;
//   image?: string;
//   title?: string;
//   city?: string;
//   country?: string;
//   about?: string;
//   creator_bio?: string;
//   expertise?: string;
//   primary_role: string;
//   is_creator: boolean;
//   creator_approved: boolean;
//   is_online: boolean;
//   education?: any;
//   socials?: any;
// }

// const ROLE_TABS = [
//   { key: '', label: 'All', icon: 'bi-people' },
//   { key: 'tutor', label: 'Tutors', icon: 'bi-person-video3' },
//   { key: 'creator', label: 'Creators', icon: 'bi-pencil-square' },
// ];

// function ExpertisePills({ raw }: { raw?: string }) {
//   if (!raw) return null;
//   const tags = raw.split(/[,;|]+/).map(t => t.trim()).filter(Boolean).slice(0, 4);
//   return (
//     <div className="instructor-tags">
//       {tags.map((t, i) => <span key={i} className="instructor-tag">{t}</span>)}
//     </div>
//   );
// }

// function InstructorCard({ instructor: t }: { instructor: Instructor }) {
//   const bio = t.creator_bio || t.about || '';
//   return (
//     <Link to={`/instructors/${t.username}`} className="instructor-card-link">
//       <div className="instructor-card">
//         {/* Online indicator */}
//         <div className="instructor-avatar-wrap">
//           <Avatar image={t.image} name={t.name || t.username} size={80} />
//           {t.is_online && <span className="online-dot" title="Online now" />}
//         </div>

//         {/* Role badge */}
//         <span className={`role-badge role-badge--${t.primary_role}`}>
//           {t.primary_role === 'creator' ? (
//             <><i className="bi bi-patch-check-fill me-1" />Creator</>
//           ) : (
//             <><i className="bi bi-mortarboard-fill me-1" />Tutor</>
//           )}
//         </span>

//         <h6 className="instructor-name">{t.name || t.username}</h6>

//         {t.title && (
//           <p className="instructor-title">{t.title}</p>
//         )}

//         {(t.city || t.country) && (
//           <p className="instructor-location">
//             <i className="bi bi-geo-alt" />
//             {[t.city, t.country].filter(Boolean).join(', ')}
//           </p>
//         )}

//         {bio && (
//           <p className="instructor-bio">
//             {bio.length > 90 ? bio.slice(0, 90) + '…' : bio}
//           </p>
//         )}

//         <ExpertisePills raw={t.expertise} />

//         <div className="instructor-card-footer">
//           <span className="view-profile-link">
//             View Profile <i className="bi bi-arrow-right" />
//           </span>
//         </div>
//       </div>
//     </Link>
//   );
// }

// export default function Instructors() {
//   const [searchParams, setSearchParams] = useSearchParams();
//   const [instructors, setInstructors] = useState<Instructor[]>([]);
//   const [total, setTotal] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);

//   const roleParam = searchParams.get('role') || '';
//   const searchParam = searchParams.get('q') || '';
//   const [searchInput, setSearchInput] = useState(searchParam);
//   const debounceRef = useRef<ReturnType<typeof setTimeout>>();

//   const fetchInstructors = (role: string, search: string, pg: number) => {
//     setLoading(true);
//     usersApi
//       .listInstructors({ role: role || undefined, search: search || undefined, page: pg, per_page: 24 })
//       .then(r => {
//         setInstructors(r.data.items || []);
//         setTotal(r.data.total || 0);
//       })
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   };

//   useEffect(() => {
//     setPage(1);
//     fetchInstructors(roleParam, searchParam, 1);
//   }, [roleParam, searchParam]);

//   const handleSearch = (val: string) => {
//     setSearchInput(val);
//     clearTimeout(debounceRef.current);
//     debounceRef.current = setTimeout(() => {
//       const p = new URLSearchParams(searchParams);
//       if (val) p.set('q', val); else p.delete('q');
//       setSearchParams(p);
//     }, 350);
//   };

//   const handleRole = (role: string) => {
//     const p = new URLSearchParams(searchParams);
//     if (role) p.set('role', role); else p.delete('role');
//     p.delete('q');
//     setSearchInput('');
//     setSearchParams(p);
//   };

//   return (
//     <div className="instructors-page fade-in">
//       {/* ── Hero ── */}
//       <div className="instructors-hero">
//         <div className="instructors-hero-inner">
//           <p className="hero-eyebrow">Meet the Team</p>
//           <h1 className="hero-heading">Our Instructors</h1>
//           <p className="hero-sub">
//             Learn from industry practitioners, certified educators and domain experts
//             who bring real-world experience into every lesson.
//           </p>

//           {/* Search */}
//           <div className="instructor-search-wrap">
//             <i className="bi bi-search search-icon" />
//             <input
//               type="text"
//               className="instructor-search"
//               placeholder="Search by name, title, skill…"
//               value={searchInput}
//               onChange={e => handleSearch(e.target.value)}
//             />
//             {searchInput && (
//               <button className="search-clear" onClick={() => handleSearch('')}>
//                 <i className="bi bi-x" />
//               </button>
//             )}
//           </div>

//           {/* Role tabs */}
//           <div className="role-tabs">
//             {ROLE_TABS.map(tab => (
//               <button
//                 key={tab.key}
//                 className={`role-tab ${roleParam === tab.key ? 'active' : ''}`}
//                 onClick={() => handleRole(tab.key)}
//               >
//                 <i className={`bi ${tab.icon} me-2`} />
//                 {tab.label}
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* ── Content ── */}
//       <div className="instructors-body">
//         {/* Result count */}
//         {!loading && (
//           <p className="result-count text-primary rounded-pill">
//             {total === 0
//               ? 'No instructors found'
//               : `${total} instructor${total !== 1 ? 's' : ''}${searchParam ? ` matching "${searchParam}"` : ''}`}
//           </p>
//         )}

//         {loading ? (
//           <div className="instructors-loading">
//             {Array.from({ length: 8 }).map((_, i) => (
//               <div key={i} className="instructor-skeleton" />
//             ))}
//           </div>
//         ) : instructors.length === 0 ? (
//           <div className="instructors-empty">
//             <i className="bi bi-people empty-icon" />
//             <h5>No instructors found</h5>
//             <p className="text-muted">Try a different search or check back soon.</p>
//             <button className="btn btn-outline-primary mt-2" onClick={() => { handleSearch(''); handleRole(''); }}>
//               Clear Filters
//             </button>
//           </div>
//         ) : (
//           <div className="instructors-grid">
//             {instructors.map(t => (
//               <InstructorCard key={t.id} instructor={t} />
//             ))}
//           </div>
//         )}

//         {/* Pagination */}
//         {!loading && total > 24 && (
//           <div className="instructors-pagination">
//             <button
//               className="btn btn-outline-primary btn-sm"
//               disabled={page <= 1}
//               onClick={() => { const p = page - 1; setPage(p); fetchInstructors(roleParam, searchParam, p); }}
//             >
//               <i className="bi bi-chevron-left me-1" />Previous
//             </button>
//             <span className="page-info">Page {page} of {Math.ceil(total / 24)}</span>
//             <button
//               className="btn btn-outline-primary btn-sm"
//               disabled={page >= Math.ceil(total / 24)}
//               onClick={() => { const p = page + 1; setPage(p); fetchInstructors(roleParam, searchParam, p); }}
//             >
//               Next<i className="bi bi-chevron-right ms-1" />
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



// v2
// pages/public/Instructors.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usersApi } from '@/services/api';
import { Avatar } from '@/components/shared';
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
      {tags.map((t, i) => <span key={i} className="instructor-tag">{t}</span>)}
    </div>
  );
}

function InstructorCard({ instructor: t }: { instructor: Instructor }) {
  const bio = t.creator_bio || t.about || '';
  return (
    <Link to={`/instructors/${t.username}`} className="instructor-card-link">
      <div className="instructor-card">
        {/* Online indicator */}
        <div className="instructor-avatar-wrap">
          <Avatar image={t.image} name={t.name || t.username} size={80} />
          {t.is_online && <span className="online-dot" title="Online now" />}
        </div>

        {/* Role badge */}
        <span className={`role-badge role-badge--${t.primary_role}`}>
          {t.primary_role === 'creator' ? (
            <><i className="bi bi-patch-check-fill me-1" />Creator</>
          ) : (
            <><i className="bi bi-mortarboard-fill me-1" />Tutor</>
          )}
        </span>

        <h6 className="instructor-name">{t.name || t.username}</h6>

        {t.title && (
          <p className="instructor-title">{t.title}</p>
        )}

        {(t.city || t.country) && (
          <p className="instructor-location">
            <i className="bi bi-geo-alt" />
            {[t.city, t.country].filter(Boolean).join(', ')}
          </p>
        )}

        {bio && (
          <p className="instructor-bio">
            {bio.length > 90 ? bio.slice(0, 90) + '…' : bio}
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

  const roleParam = searchParams.get('role') || '';
  const searchParam = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
    clearTimeout(debounceRef.current);
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
    setSearchParams(p);
  };

  return (
    <div className="instructors-page fade-in">
      {/* ── Hero ── */}
      <div className="instructors-hero">
        <div className="instructors-hero-inner">
          
          {/* <p className="hero-eyebrow">Meet the Team</p> */}
          <h1 className="hero-heading"><svg width={50} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="14" r="8" fill="#7c4dff" />
                <circle cx="28" cy="26" r="8" fill="#f38207" />
                <circle cx="30" cy="10" r="4" fill="#7c4dff" opacity="0.6" />
              </svg> Explore Our Creators</h1>
          <p className="hero-sub">
            Learn from industry practitioners, certified educators and domain experts
            who bring real-world experience into every lesson.
          </p>

          {/* Search */}
          <div className="instructor-search-wrap">
            <i className="bi bi-search search-icon" />
            <input
              type="text"
              className="instructor-search"
              placeholder="Search by name, title, skill…"
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
            />
            {searchInput && (
              <button className="search-clear" onClick={() => handleSearch('')}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>

          {/* Role tabs */}
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
        {/* Result count */}
        {!loading && (
          <p className="result-count text-primary">
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
            <button className="btn btn-outline-primary mt-2" onClick={() => { handleSearch(''); handleRole(''); }}>
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

        {/* Pagination */}
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
