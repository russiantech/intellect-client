import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps { isOpen: boolean; onClose: () => void; }

interface NavItem {
  to: string;
  icon: string;
  label: string;
  badge?: string | number;
  roles?: string[];
}

const publicLinks: NavItem[] = [
  { to: '/', icon: 'bi-house', label: 'Home' },
  { to: '/explore', icon: 'bi-compass', label: 'Browse Courses' },
  { to: '/paths', icon: 'bi-signpost-split', label: 'Learning Paths' },
  { to: '/instructors', icon: 'bi-people', label: 'Instructors' },
  { to: '/about', icon: 'bi-info-circle', label: 'About Intellect' },
];

const studentLinks: NavItem[] = [
  { to: '/dashboard', icon: 'bi-grid', label: 'My Learning' },
  { to: '/my-courses', icon: 'bi-book', label: 'My Courses' },
  { to: '/my-assessments', icon: 'bi-clipboard-check', label: 'My Assessments' },
  { to: '/my-certificates', icon: 'bi-award', label: 'Certificates' },
  { to: '/messages', icon: 'bi-chat-dots', label: 'Messages' },
  // { to: '/explore', icon: 'bi-compass', label: 'Explore Courses' },
  // { to: '/paths', icon: 'bi-signpost-split', label: 'Learning Paths' },
];

const tutorLinks: NavItem[] = [
  { to: '/tutor', icon: 'bi-speedometer2', label: 'Dashboard' },
  { to: '/tutor/courses', icon: 'bi-journal-text', label: 'My Courses' },
  { to: '/tutor/students', icon: 'bi-people', label: 'Students' },
  { to: '/tutor/assessments', icon: 'bi-clipboard-check', label: 'Assessments' },
  { to: '/tutor/schedules', icon: 'bi-calendar3', label: 'Schedules' },
];

const creatorLinks: NavItem[] = [
  { to: '/creator', icon: 'bi-graph-up', label: 'Creator Dashboard' },
  { to: '/creator/courses', icon: 'bi-journal-richtext', label: 'My Courses' },
  { to: '/creator/courses/new', icon: 'bi-plus-circle', label: 'Create Course' },
  { to: '/creator/students', icon: 'bi-people', label: 'Students' },
  { to: '/creator/earnings', icon: 'bi-currency-dollar', label: 'Earnings' },
];

const adminLinks: NavItem[] = [
  { to: '/admin', icon: 'bi-speedometer2', label: 'Admin Dashboard' },
  { to: '/admin/courses', icon: 'bi-journal-text', label: 'Courses' },
  { to: '/admin/users', icon: 'bi-people', label: 'Users' },
  { to: '/admin/enrollments', icon: 'bi-person-check', label: 'Enrollments' },
  { to: '/admin/paths', icon: 'bi-signpost-split', label: 'Learning Paths' },
  { to: '/admin/team-requests', icon: 'bi-person-badge', label: 'Team Requests' },
  { to: '/admin/schedules', icon: 'bi-calendar3', label: 'Schedules' },
  { to: '/admin/broadcast', icon: 'bi-broadcast', label: 'Broadcasts' },
  { to: '/admin/partnerships', icon: 'bi-building', label: 'Partnerships' },
  { to: '/admin/discounts', icon: 'bi-tag', label: 'Discounts' },
  { to: '/admin/certificates', icon: 'bi-award', label: 'Certificates' },
  { to: '/admin/settings', icon: 'bi-gear', label: 'Settings' },
];

const partnerLinks: NavItem[] = [
  { to: '/partner', icon: 'bi-building', label: 'Partner Dashboard' },
  // { to: '/explore', icon: 'bi-compass', label: 'Browse Courses' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  const role = user?.primary_role || 'guest';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isTutor = role === 'tutor';
  const isCreator = role === 'creator' || user?.is_creator;
  const isPartner = role === 'partner';

  const sections: { label: string; links: NavItem[] }[] = [];

  if (isAdmin) {
    sections.push({ label: 'Admin', links: adminLinks });
    sections.push({ label: 'Learning', links: studentLinks });
  } else if (isTutor) {
    sections.push({ label: 'Tutor', links: tutorLinks });
    sections.push({ label: 'Learning', links: studentLinks });
  } else if (isCreator) {
    sections.push({ label: 'Creator Studio', links: creatorLinks });
    sections.push({ label: 'Learning', links: studentLinks });
  } else if (isPartner) {
    sections.push({ label: 'Partner', links: partnerLinks });
  } else if (user) {
    sections.push({ label: 'My Learning', links: studentLinks });
  } else {
    sections.push({ label: 'Navigation', links: publicLinks });
  }

  // if (user && !isAdmin) {
  if (user) {
    sections.push({
      label: 'Discover', links: [
        { to: '/explore', icon: 'bi-compass', label: 'Explore Courses' },
        { to: '/paths', icon: 'bi-signpost-split', label: 'Learning Paths' },
        { to: '/instructors', icon: 'bi-people', label: 'Instructors' },
      ]
    });
  }

  sections.push({
    label: 'Account', links: [
      { to: '/profile', icon: 'bi-person-circle', label: 'My Profile' },
      ...(user && !isCreator && !isAdmin ? [{ to: '/creator', icon: 'bi-pencil-square', label: 'Become a Creator' }] : []),
    ]
  });

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="d-lg-none" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998 }} onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Close on mobile */}
        <button className="d-lg-none btn btn-link p-0 ms-auto me-3 mb-2 d-flex" style={{ color: 'var(--text-muted)' }} onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>

        {sections.map(section => (
          <div className="sidebar-section" key={section.label}>
            <div className="sidebar-label">{section.label}</div>
            {section.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/' || link.to.endsWith('admin') || link.to.endsWith('tutor') || link.to.endsWith('creator')}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => window.innerWidth < 992 && onClose()}
              >
                <i className={`bi ${link.icon}`} style={{ width: 18, textAlign: 'center' }} />
                <span>{link.label}</span>
                {link.badge !== undefined && (
                  <span className="badge bg-primary ms-auto" style={{ fontSize: '0.65rem' }}>{link.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>
    </>
  );
}
