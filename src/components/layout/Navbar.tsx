// import { useState, useRef, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '@/context/AuthContext';
// import { useTheme } from '@/context/ThemeContext';
// import { notificationsApi } from '@/services/api';
// import NotificationsPanel from '@/components/shared/NotificationsPanel';
// import { Notification } from '@/types';

// interface NavbarProps { onToggleSidebar: () => void; }

// export default function Navbar({ onToggleSidebar }: NavbarProps) {
//   const { user, logout } = useAuth();
//   const { toggleTheme, isDark } = useTheme();
//   const navigate = useNavigate();
//   const [search, setSearch] = useState('');
//   const [notifs, setNotifs] = useState<Notification[]>([]);
//   const [unread, setUnread] = useState(0);
//   const [showNotifs, setShowNotifs] = useState(false);
//   const [showUser, setShowUser] = useState(false);
//   const notifRef = useRef<HTMLDivElement>(null);
//   const userRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!user) return;
//     notificationsApi.list({ unread_only: false, per_page: 10 })
//       .then(r => { setNotifs(r.data.items || []); setUnread(r.data.unread_count || 0); })
//       .catch(() => {});
//   }, [user]);

//   useEffect(() => {
//     const handler = (e: MouseEvent) => {
//       if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
//       if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
//     };
//     document.addEventListener('mousedown', handler);
//     return () => document.removeEventListener('mousedown', handler);
//   }, []);

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
//   };

//   const markAllRead = async () => {
//     await notificationsApi.markAllRead();
//     setUnread(0);
//     setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
//   };

//   const avatarSrc = user?.image && user.image !== 'default.svg'
//     ? `/uploads/avatars/${user.image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.username || 'U')}&background=4A90D9&color=fff`;

//   const dashLink = user?.primary_role === 'admin' || user?.primary_role === 'super_admin' ? '/admin'
//     : user?.primary_role === 'tutor' ? '/tutor'
//     : user?.primary_role === 'creator' ? '/creator'
//     : user?.primary_role === 'partner' ? '/partner'
//     : '/dashboard';

//   return (
//     <nav className="intellect-nav">
//       {/* Mobile menu toggle */}
//       <button className="nav-icon-btn me-2 d-lg-none" onClick={onToggleSidebar} aria-label="Toggle menu">
//         <i className="bi bi-list fs-5" />
//       </button>

//       {/* Logo */}
//       <Link to="/" className="nav-logo me-3">
//         <img src="/assets/images/logos/favicon.ico" alt="Intellect Logo" style={{ width: '1.5rem', height: '1.5rem', marginRight: '0.25rem' }} />
//         Intellect<span className="dot" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>.</span>
//       </Link>

//       {/* Search */}
//       <form className="nav-search d-none d-md-block" onSubmit={handleSearch}>
//         <i className="bi bi-search search-icon" />
//         <input
//           type="text"
//           placeholder="Search courses, topics, instructors…"
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//         />
//       </form>

//       {/* Actions */}
//       <div className="nav-actions">
//         {/* Explore link */}
//         <Link to="/explore" className="btn btn-sm btn-outline-secondary d-none d-lg-inline-flex align-items-center gap-1" style={{ borderRadius: 999, fontSize: '0.8rem' }}>
//           <i className="bi bi-compass" /> Explore
//         </Link>

//         {user ? (
//           <>
//             {/* Theme toggle */}
//             <button className="nav-icon-btn" onClick={toggleTheme} title="Toggle theme">
//               <i className={`bi ${isDark ? 'bi-sun' : 'bi-moon'}`} />
//             </button>

//             {/* Notifications */}
//             <div className="position-relative" ref={notifRef}>
//               <button className="nav-icon-btn" onClick={() => setShowNotifs(p => !p)}>
//                 <i className="bi bi-bell" />
//                 {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
//               </button>
//               {showNotifs && (
//                 <NotificationsPanel
//                   notifications={notifs}
//                   unreadCount={unread}
//                   onClose={() => setShowNotifs(false)}
//                   onMarkRead={(id) => { notificationsApi.markRead(id); setNotifs(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x)); setUnread(p => Math.max(0, p - 1)); }}
//                   onMarkAllRead={() => { notificationsApi.markAllRead(); setNotifs(prev => prev.map(x => ({ ...x, is_read: true }))); setUnread(0); }}
//                 />
//               )}
//             </div>

//             {/* User menu */}
//             <div className="position-relative" ref={userRef}>
//               <img src={avatarSrc} alt={user.name || user.username} className="nav-avatar" onClick={() => setShowUser(p => !p)} />
//               {showUser && (
//                 <div className="dropdown-menu show" style={{ right: 0, left: 'auto', minWidth: 220, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '0.5rem 0' }}>
//                   <div className="px-3 py-2 border-bottom">
//                     <div className="fw-600" style={{ fontSize: '0.875rem' }}>{user.name || user.username}</div>
//                     <div className="text-muted" style={{ fontSize: '0.75rem' }}>{user.email}</div>
//                     <span className="badge bg-primary-light text-primary" style={{ fontSize: '0.65rem' }}>{user.primary_role}</span>
//                   </div>
//                   <Link to={dashLink} className="dropdown-item d-flex align-items-center gap-2" onClick={() => setShowUser(false)}>
//                     <i className="bi bi-speedometer2" /> Dashboard
//                   </Link>
//                   <Link to="/profile" className="dropdown-item d-flex align-items-center gap-2" onClick={() => setShowUser(false)}>
//                     <i className="bi bi-person" /> My Profile
//                   </Link>
//                   <Link to="/my-courses" className="dropdown-item d-flex align-items-center gap-2" onClick={() => setShowUser(false)}>
//                     <i className="bi bi-book" /> My Learning
//                   </Link>
//                   <Link to="/my-certificates" className="dropdown-item d-flex align-items-center gap-2" onClick={() => setShowUser(false)}>
//                     <i className="bi bi-award" /> Certificates
//                   </Link>
//                   <hr className="my-1" />
//                   <button className="dropdown-item d-flex align-items-center gap-2 text-danger" onClick={logout}>
//                     <i className="bi bi-box-arrow-right" /> Sign Out
//                   </button>
//                 </div>
//               )}
//             </div>
//           </>
//         ) : (
//           <div className="d-flex gap-2">
//             <Link to="/auth/signin" className="btn btn-sm btn-outline-primary" style={{ borderRadius: 999 }}>Sign In</Link>
//             <Link to="/auth/signup" className="btn btn-sm btn-primary d-none d-sm-inline-flex" style={{ borderRadius: 999 }}>Get Started</Link>
//           </div>
//         )}
//       </div>
//     </nav>
//   );
// }


// v2
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { notificationsApi } from '@/services/api';
import NotificationsPanel from '@/components/shared/NotificationsPanel';
import { Notification } from '@/types';
import { Avatar } from '@/components/shared/index'; // adjust path as needed

interface NavbarProps { onToggleSidebar: () => void; }

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    notificationsApi.list({ unread_only: false, per_page: 10 })
      .then(r => { setNotifs(r.data.items || []); setUnread(r.data.unread_count || 0); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const dashLink = user?.primary_role === 'admin' || user?.primary_role === 'super_admin' ? '/admin'
    : user?.primary_role === 'tutor' ? '/tutor'
    : user?.primary_role === 'creator' ? '/creator'
    : user?.primary_role === 'partner' ? '/partner'
    : '/dashboard';

  return (
    <nav className="intellect-nav">
      {/* Mobile menu toggle */}
      <button className="nav-icon-btn me-2 d-lg-none" onClick={onToggleSidebar} aria-label="Toggle menu">
        <i className="bi bi-list fs-5" />
      </button>

      {/* Logo */}
      <Link to="/" className="nav-logo me-3">
        <img src="/assets/images/logos/favicon.ico" alt="Intellect Logo" style={{ width: '1.5rem', height: '1.5rem', marginRight: '0.25rem' }} />
        Intellect<span className="dot" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>.</span>
      </Link>

      {/* Search */}
      <form className="nav-search d-none d-md-block" onSubmit={handleSearch}>
        <i className="bi bi-search search-icon" />
        <input
          type="text"
          placeholder="Search courses, topics, instructors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </form>

      {/* Actions */}
      <div className="nav-actions">
        {/* Explore link */}
        <Link to="/explore" className="btn btn-sm btn-outline-secondary d-none d-lg-inline-flex align-items-center gap-1" style={{ borderRadius: 999, fontSize: '0.8rem' }}>
          <i className="bi bi-compass" /> Explore
        </Link>

        {user ? (
          <>
            {/* Theme toggle */}
            <button className="nav-icon-btn" onClick={toggleTheme} title="Toggle theme">
              <i className={`bi ${isDark ? 'bi-sun' : 'bi-moon'}`} />
            </button>

            {/* Notifications */}
            <div className="position-relative" ref={notifRef}>
              <button className="nav-icon-btn" onClick={() => setShowNotifs(p => !p)}>
                <i className="bi bi-bell" />
                {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {showNotifs && (
                <NotificationsPanel
                  notifications={notifs}
                  unreadCount={unread}
                  onClose={() => setShowNotifs(false)}
                  onMarkRead={(id) => { notificationsApi.markRead(id); setNotifs(prev => prev.map(x => x.id === id ? { ...x, is_read: true } : x)); setUnread(p => Math.max(0, p - 1)); }}
                  onMarkAllRead={() => { notificationsApi.markAllRead(); setNotifs(prev => prev.map(x => ({ ...x, is_read: true }))); setUnread(0); }}
                />
              )}
            </div>

            {/* User menu */}
            <div className="position-relative" ref={userRef}>
              {/* <Avatar
                image={user.image}
                name={user.name || user.username}
                size={36}
              /> */}
              <Avatar
                image={user.image}
                name={user.name || user.username}
                size={36}
                onClick={() => setShowUser(p => !p)}
                className="nav-avatar"
              />
              {showUser && (
                <div className="dropdown-menu show fs-10" style={{ right: 0, left: 'auto', minWidth: 220, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '0.5rem 0' }}>
                  <div className="px-3 py-2 border-bottom">
                    <div className="fw-600" style={{ fontSize: '0.875rem' }}>{user.name || user.username}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{user.email}</div>
                    <span className="badge bg-primary-light text-primary" style={{ fontSize: '0.65rem' }}>{user.primary_role}</span>
                  </div>
                  <Link to={dashLink} className="dropdown-item d-flex align-items-center gap-2" onClick={() => setShowUser(false)}>
                    <i className="bi bi-speedometer2" /> Dashboard
                  </Link>
                  <Link to="/profile" className="dropdown-item d-flex align-items-center gap-2" onClick={() => setShowUser(false)}>
                    <i className="bi bi-person" /> My Profile
                  </Link>
                  <Link to="/my-courses" className="dropdown-item d-flex align-items-center gap-2" onClick={() => setShowUser(false)}>
                    <i className="bi bi-book" /> My Learning
                  </Link>
                  <Link to="/my-certificates" className="dropdown-item d-flex align-items-center gap-2" onClick={() => setShowUser(false)}>
                    <i className="bi bi-award" /> Certificates
                  </Link>
                  <hr className="my-1" />
                  <button className="dropdown-item d-flex align-items-center gap-2 text-danger" onClick={logout}>
                    <i className="bi bi-box-arrow-right" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="d-flex gap-2">
            <Link to="/auth/signin" className="btn btn-sm btn-outline-primary" style={{ borderRadius: 999 }}>Sign In</Link>
            <Link to="/auth/signup" className="btn btn-sm btn-primary d-none d-sm-inline-flex" style={{ borderRadius: 999 }}>Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}