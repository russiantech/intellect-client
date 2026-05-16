// v3-FIXED — Full admin enrollment management: de-enroll, analytics, user tracking
// Fixes: course filter sends as 'search' not 'course_id', deenroll body simplified,
// path enrollments work with models lacking .user relationship.
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi, coursesApi, usersApi } from '@/services/api';
import { Course, User } from '@/types';
import {
  Spinner,
  Empty,
  Modal,
  StatusBadge,
  PageTitle,
  SearchInput,
  Avatar,
} from '@/components/shared/index';
import Pagination from '@/components/shared/Pagination';

/* ═══════════════════════════════════════════
   AdminEnrollmentsPage — Full enrollment CRUD
   Admin can: assign, list all, de-enroll,
   view analytics, track user progress.
   ═══════════════════════════════════════════ */

const PER_PAGE = 15;

type Tab = 'assign' | 'courses' | 'paths' | 'analytics' | 'user-tracking';

interface CourseEnrollment {
  id: number;
  user: User | null;
  course: Course | null;
  status: string;
  progress_pct: number;
  completed_topics: number;
  admin_assigned: boolean;
  created_at: string;
  completed_at: string | null;
  topics_accessed_this_week: number;
  topics_accessed_this_month: number;
}

interface PathEnrollment {
  id: number;
  user: User | null;
  path: {
    id: number;
    title: string;
    slug: string;
    thumbnail: string;
    courses_count: number;
  } | null;
  status: string;
  progress_pct: number;
  created_at: string;
  completed_at: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminEnrollmentsPage() {
  const [tab, setTab] = useState<Tab>('assign');

  // Assign tab state
  const [searchUser, setSearchUser] = useState('');
  const [searchCourse, setSearchCourse] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [courseResults, setCourseResults] = useState<Course[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Course enrollments tab
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([]);
  const [courseEnrollmentsLoading, setCourseEnrollmentsLoading] = useState(false);
  const [courseEnrollmentsTotal, setCourseEnrollmentsTotal] = useState(0);
  const [courseEnrollmentsPage, setCourseEnrollmentsPage] = useState(1);
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Path enrollments tab
  const [pathEnrollments, setPathEnrollments] = useState<PathEnrollment[]>([]);
  const [pathEnrollmentsLoading, setPathEnrollmentsLoading] = useState(false);
  const [pathEnrollmentsTotal, setPathEnrollmentsTotal] = useState(0);
  const [pathEnrollmentsPage, setPathEnrollmentsPage] = useState(1);

  // Analytics tab
  const [analyticsCourseId, setAnalyticsCourseId] = useState<number | ''>('');
  const [analyticsPathId, setAnalyticsPathId] = useState<number | ''>('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState(30);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [globalAnalytics, setGlobalAnalytics] = useState<any>(null);

  // User tracking tab
  const [trackingUserId, setTrackingUserId] = useState<number | ''>('');
  const [trackingUserSearch, setTrackingUserSearch] = useState('');
  const [trackingUserResults, setTrackingUserResults] = useState<User[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<any>(null);
  const [userPathEnrollments, setUserPathEnrollments] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // De-enroll modal
  const [deenrollModal, setDeenrollModal] = useState<{
    show: boolean;
    enrollmentId: number;
    type: 'course' | 'path';
    userName: string;
    itemName: string;
  }>({ show: false, enrollmentId: 0, type: 'course', userName: '', itemName: '' });
  const [deenrollReason, setDeenrollReason] = useState('');
  const [deenrollProcessing, setDeenrollProcessing] = useState(false);

  // Search users for assign
  useEffect(() => {
    if (searchUser.length < 2) { setUserResults([]); return; }
    usersApi.listUsers({ search: searchUser, per_page: 8 }).then(r => setUserResults(r.data.items || []));
  }, [searchUser]);

  // Search courses for assign
  useEffect(() => {
    if (searchCourse.length < 2) { setCourseResults([]); return; }
    coursesApi.list({ search: searchCourse, per_page: 8, status: 'published' }).then(r => setCourseResults(r.data.items || []));
  }, [searchCourse]);

  // Search users for tracking
  useEffect(() => {
    if (trackingUserSearch.length < 2) { setTrackingUserResults([]); return; }
    usersApi.listUsers({ search: trackingUserSearch, per_page: 8 }).then(r => setTrackingUserResults(r.data.items || []));
  }, [trackingUserSearch]);

  /* ── Load course enrollments ─────────────────────────────────────────── */
  const loadCourseEnrollments = useCallback(() => {
    setCourseEnrollmentsLoading(true);
    const params: Record<string, unknown> = { page: courseEnrollmentsPage, per_page: PER_PAGE };
    // FIXED: courseFilter is a search string, not a course_id. Don't send as course_id.
    // The backend expects course_id as an integer. We send search for text filtering.
    if (courseFilter.trim()) params.search = courseFilter.trim();
    if (statusFilter) params.status = statusFilter;

    adminApi.listCourseEnrollments(params)
      .then(r => {
        setCourseEnrollments(r.data?.items || []);
        setCourseEnrollmentsTotal(r.data?.total || 0);
      })
      .catch((err: any) => toast.error(err?.response?.data?.detail || 'Failed to load course enrollments'))
      .finally(() => setCourseEnrollmentsLoading(false));
  }, [courseEnrollmentsPage, courseFilter, statusFilter]);

  useEffect(() => { if (tab === 'courses') loadCourseEnrollments(); }, [loadCourseEnrollments, tab]);

  /* ── Load path enrollments ─────────────────────────────────────────── */
  const loadPathEnrollments = useCallback(() => {
    setPathEnrollmentsLoading(true);
    const params: Record<string, unknown> = { page: pathEnrollmentsPage, per_page: PER_PAGE };

    adminApi.listPathEnrollments(params)
      .then(r => {
        setPathEnrollments(r.data?.items || []);
        setPathEnrollmentsTotal(r.data?.total || 0);
      })
      .catch((err: any) => toast.error(err?.response?.data?.detail || 'Failed to load path enrollments'))
      .finally(() => setPathEnrollmentsLoading(false));
  }, [pathEnrollmentsPage]);

  useEffect(() => { if (tab === 'paths') loadPathEnrollments(); }, [loadPathEnrollments, tab]);

  /* ── Load analytics ────────────────────────────────────────────────── */
  const loadAnalytics = useCallback(() => {
    setAnalyticsLoading(true);
    const promises: Promise<any>[] = [];

    if (analyticsCourseId && typeof analyticsCourseId === 'number') {
      promises.push(
        adminApi.getCourseAnalytics(analyticsCourseId, analyticsPeriod)
          .then(r => setAnalyticsData(r.data))
          .catch((err: any) => toast.error(err?.response?.data?.detail || 'Failed to load course analytics'))
      );
    }
    if (analyticsPathId && typeof analyticsPathId === 'number') {
      promises.push(
        adminApi.getPathAnalytics(analyticsPathId, analyticsPeriod)
          .then(r => setAnalyticsData(r.data))
          .catch((err: any) => toast.error(err?.response?.data?.detail || 'Failed to load path analytics'))
      );
    }

    // Always load global analytics
    promises.push(
      adminApi.getGlobalAnalytics(analyticsPeriod)
        .then(r => setGlobalAnalytics(r.data))
        .catch((err: any) => toast.error(err?.response?.data?.detail || 'Failed to load global analytics'))
    );

    Promise.all(promises).finally(() => setAnalyticsLoading(false));
  }, [analyticsCourseId, analyticsPathId, analyticsPeriod]);

  useEffect(() => { if (tab === 'analytics') loadAnalytics(); }, [loadAnalytics, tab]);

  /* ── Load user tracking ────────────────────────────────────────────── */
  const loadUserTracking = useCallback(() => {
    if (!trackingUserId || typeof trackingUserId !== 'number') return;
    setTrackingLoading(true);

    Promise.all([
      adminApi.getUserEnrollments(trackingUserId)
        .then(r => setUserEnrollments(r.data))
        .catch((err: any) => toast.error(err?.response?.data?.detail || 'Failed to load user enrollments')),
      adminApi.getUserPathEnrollments(trackingUserId)
        .then(r => setUserPathEnrollments(r.data))
        .catch((err: any) => toast.error(err?.response?.data?.detail || 'Failed to load user path enrollments')),
      adminApi.getUserActivity(trackingUserId, 30)
        .then(r => setUserActivity(r.data))
        .catch((err: any) => toast.error(err?.response?.data?.detail || 'Failed to load user activity')),
    ]).finally(() => setTrackingLoading(false));
  }, [trackingUserId]);

  useEffect(() => { if (tab === 'user-tracking' && trackingUserId) loadUserTracking(); }, [loadUserTracking, tab, trackingUserId]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const handleAssign = async () => {
    if (!selectedUser || !selectedCourse) return;
    setAssigning(true);
    try {
      await adminApi.enrollUser(selectedUser.id, selectedCourse.id);
      toast.success(`${selectedUser.name || selectedUser.username} enrolled in "${selectedCourse.title}"`);
      setSelectedUser(null);
      setSelectedCourse(null);
      setSearchUser('');
      setSearchCourse('');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Enrollment failed');
    } finally { setAssigning(false); }
  };

  const handleDeenroll = async () => {
    if (!deenrollModal.enrollmentId) return;
    setDeenrollProcessing(true);
    try {
      if (deenrollModal.type === 'course') {
        await adminApi.deenrollFromCourse(deenrollModal.enrollmentId, deenrollReason);
      } else {
        await adminApi.deenrollFromPath(deenrollModal.enrollmentId, deenrollReason);
      }
      toast.success('De-enrolled successfully');
      setDeenrollModal({ show: false, enrollmentId: 0, type: 'course', userName: '', itemName: '' });
      setDeenrollReason('');
      if (tab === 'courses') loadCourseEnrollments();
      if (tab === 'paths') loadPathEnrollments();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'De-enrollment failed');
    } finally {
      setDeenrollProcessing(false);
    }
  };

  const openDeenrollModal = (enrollment: CourseEnrollment | PathEnrollment, type: 'course' | 'path') => {
    setDeenrollModal({
      show: true,
      enrollmentId: enrollment.id,
      type,
      userName: enrollment.user?.name || enrollment.user?.username || 'Unknown',
      itemName: type === 'course' ? (enrollment as CourseEnrollment).course?.title || 'Unknown Course' : (enrollment as PathEnrollment).path?.title || 'Unknown Path',
    });
    setDeenrollReason('');
  };

  const courseEnrollmentPages = Math.ceil(courseEnrollmentsTotal / PER_PAGE);
  const pathEnrollmentPages = Math.ceil(pathEnrollmentsTotal / PER_PAGE);

  return (
    <div className="fade-in">
      <PageTitle
        title="Enrollment Management"
        subtitle="Assign, monitor, de-enroll, and analyze student enrollments"
        crumbs={[{ label: 'Admin' }, { label: 'Enrollments' }]}
      />

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'assign', label: '+ Assign Course', icon: 'bi-person-plus' },
          { key: 'courses', label: 'Course Enrollments', icon: 'bi-journal-bookmark' },
          { key: 'paths', label: 'Path Enrollments', icon: 'bi-diagram-3' },
          { key: 'analytics', label: 'Analytics', icon: 'bi-graph-up' },
          { key: 'user-tracking', label: 'User Tracking', icon: 'bi-person-lines-fill' },
        ] as const).map(t => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ borderRadius: 999 }}
            onClick={() => setTab(t.key as Tab)}
          >
            <i className={`bi ${t.icon} me-1`} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB: ASSIGN
         ═══════════════════════════════════════════════════════════════ */}
      {tab === 'assign' && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card p-4">
              <h6 className="fw-700 mb-4"><i className="bi bi-person-plus me-2 text-primary" />Assign a Course to a User</h6>

              {/* Step 1: Select User */}
              <div className="mb-4">
                <label className="form-label fw-600" style={{ fontSize: '0.875rem' }}>
                  <span className="badge bg-primary me-2">1</span>Select Student
                </label>
                {selectedUser ? (
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: 'var(--bg)', border: '2px solid var(--primary)' }}>
                    <Avatar image={selectedUser.image} name={selectedUser.name} size={40} />
                    <div className="flex-1">
                      <div className="fw-700">{selectedUser.name || selectedUser.username}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>{selectedUser.email}</div>
                    </div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedUser(null)}>
                      <i className="bi bi-x" /> Change
                    </button>
                  </div>
                ) : (
                  <div className="position-relative">
                    <SearchInput value={searchUser} onChange={setSearchUser} placeholder="Search by name or email…" />
                    {userResults.length > 0 && (
                      <div className="border rounded-3 mt-1 overflow-hidden" style={{ position: 'absolute', zIndex: 20, width: '100%', background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
                        {userResults.map(u => (
                          <div key={u.id} className="d-flex align-items-center gap-3 p-3 cursor-pointer"
                            style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                            onClick={() => { setSelectedUser(u); setSearchUser(''); setUserResults([]); }}>
                            <Avatar image={u.image} name={u.name} size={32} />
                            <div>
                              <div className="fw-600" style={{ fontSize: '0.875rem' }}>{u.name || u.username}</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>{u.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Select Course */}
              <div className="mb-4">
                <label className="form-label fw-600" style={{ fontSize: '0.875rem' }}>
                  <span className="badge bg-primary me-2">2</span>Select Course
                </label>
                {selectedCourse ? (
                  <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: 'var(--bg)', border: '2px solid var(--primary)' }}>
                    {selectedCourse.thumbnail
                      ? <img src={`/uploads/courses/thumbnails/${selectedCourse.thumbnail}`} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      : <div style={{ width: 56, height: 40, background: 'var(--primary-light)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="bi bi-play-circle text-primary" />
                        </div>
                    }
                    <div className="flex-1">
                      <div className="fw-700" style={{ fontSize: '0.875rem' }}>{selectedCourse.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {selectedCourse.fee > 0 ? `₦${selectedCourse.fee.toLocaleString()}` : 'Free'} · {selectedCourse.level}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedCourse(null)}>
                      <i className="bi bi-x" /> Change
                    </button>
                  </div>
                ) : (
                  <div className="position-relative">
                    <SearchInput value={searchCourse} onChange={setSearchCourse} placeholder="Search courses…" />
                    {courseResults.length > 0 && (
                      <div className="border rounded-3 mt-1 overflow-hidden" style={{ position: 'absolute', zIndex: 20, width: '100%', background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
                        {courseResults.map(c => (
                          <div key={c.id} className="d-flex align-items-center gap-3 p-3 cursor-pointer"
                            style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                            onClick={() => { setSelectedCourse(c); setSearchCourse(''); setCourseResults([]); }}>
                            {c.thumbnail
                              ? <img src={`/uploads/courses/thumbnails/${c.thumbnail}`} alt="" style={{ width: 48, height: 34, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                              : <div style={{ width: 48, height: 34, background: 'var(--primary-light)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <i className="bi bi-book text-primary" style={{ fontSize: '0.75rem' }} />
                                </div>
                            }
                            <div>
                              <div className="fw-600" style={{ fontSize: '0.875rem' }}>{c.title}</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {c.fee > 0 ? `₦${c.fee.toLocaleString()}` : 'Free'} · {c.level} · {c.lessons_count} lessons
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary & Assign */}
              {selectedUser && selectedCourse && (
                <div className="card p-3 mb-4" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
                  <div className="fw-700 mb-2 text-primary">Enrollment Summary</div>
                  <div className="d-flex gap-4" style={{ fontSize: '0.875rem' }}>
                    <div><span className="text-muted">Student:</span> <strong>{selectedUser.name || selectedUser.username}</strong></div>
                    <div><span className="text-muted">Course:</span> <strong>{selectedCourse.title}</strong></div>
                    {selectedCourse.fee > 0 && <div className="text-success fw-600"><i className="bi bi-check-circle me-1" />Bypassing payment</div>}
                  </div>
                </div>
              )}

              <div className="d-flex gap-3">
                <button
                  className="btn btn-primary fw-600 btn-icon-start"
                  onClick={handleAssign}
                  disabled={!selectedUser || !selectedCourse || assigning}
                >
                  {assigning
                    ? <><span className="spinner-border spinner-border-sm me-2" />Enrolling…</>
                    : <><i className="bi bi-person-check" /> Enroll Student</>
                  }
                </button>
                <button className="btn btn-outline-secondary" onClick={() => { setSelectedUser(null); setSelectedCourse(null); }}>
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Quick tips */}
          <div className="col-lg-4">
            <div className="card p-4">
              <h6 className="fw-700 mb-3"><i className="bi bi-lightbulb me-2 text-warning" />How it works</h6>
              <div className="d-flex flex-column gap-3" style={{ fontSize: '0.875rem' }}>
                {[
                  { icon: 'bi-search', text: 'Search for any student by name or email' },
                  { icon: 'bi-book', text: 'Search for any published course' },
                  { icon: 'bi-person-check', text: 'Admin enrollment bypasses payment requirements' },
                  { icon: 'bi-envelope', text: 'Student receives an enrollment confirmation email' },
                  { icon: 'bi-graph-up', text: 'Progress tracking begins immediately' },
                ].map((tip, i) => (
                  <div key={i} className="d-flex gap-3">
                    <i className={`bi ${tip.icon} text-primary mt-1`} style={{ flexShrink: 0 }} />
                    <span className="text-muted">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: COURSE ENROLLMENTS
         ═══════════════════════════════════════════════════════════════ */}
      {tab === 'courses' && (
        <div>
          <div className="card mb-4">
            <div className="p-3 d-flex flex-wrap gap-3 align-items-center">
              <div style={{ flex: '1 1 260px' }}>
                <SearchInput
                  value={courseFilter}
                  onChange={v => { setCourseFilter(v); setCourseEnrollmentsPage(1); }}
                  placeholder="Search by course title, student name, or email…"
                />
              </div>
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: 160 }}
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCourseEnrollmentsPage(1); }}
              >
                <option value="">All Statuses</option>
                {['active', 'completed', 'suspended', 'dropped'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                {courseEnrollmentsTotal} enrollment{courseEnrollmentsTotal !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {courseEnrollmentsLoading ? <Spinner /> : courseEnrollments.length === 0 ? (
            <Empty icon="bi-journal-x" title="No enrollments found" subtitle="Try adjusting your filters" />
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Enrolled</th>
                        <th style={{ width: 1 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseEnrollments.map(e => (
                        <tr key={e.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Avatar image={e.user?.image} name={e.user?.name} size={32} />
                              <div>
                                <div className="fw-600" style={{ fontSize: '0.875rem' }}>{e.user?.name || e.user?.username}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{e.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="fw-600" style={{ fontSize: '0.875rem' }}>{e.course?.title}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {e.course?.creator_name} · {e.completed_topics} topics done
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-1" style={{ height: 6, minWidth: 80 }}>
                                <div className="progress-bar" style={{ width: `${e.progress_pct}%` }} />
                              </div>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{e.progress_pct}%</span>
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={e.status} />
                            {e.admin_assigned && <span className="badge bg-info ms-1" style={{ fontSize: '0.6rem' }}>Admin</span>}
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Link
                                to={`/admin/users/${e.user?.id}/enrollments`}
                                className="btn btn-sm btn-outline-primary"
                                title="View student profile"
                              >
                                <i className="bi bi-person" />
                              </Link>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => openDeenrollModal(e, 'course')}
                                title="De-enroll student"
                              >
                                <i className="bi bi-person-x" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pagination
                page={courseEnrollmentsPage}
                pages={courseEnrollmentPages}
                onPageChange={setCourseEnrollmentsPage}
                ariaLabel="Course enrollment pages"
              />
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: PATH ENROLLMENTS
         ═══════════════════════════════════════════════════════════════ */}
      {tab === 'paths' && (
        <div>
          {pathEnrollmentsLoading ? <Spinner /> : pathEnrollments.length === 0 ? (
            <Empty icon="bi-diagram-3" title="No path enrollments found" />
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Learning Path</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Enrolled</th>
                        <th style={{ width: 1 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pathEnrollments.map(e => (
                        <tr key={e.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Avatar image={e.user?.image} name={e.user?.name} size={32} />
                              <div>
                                <div className="fw-600" style={{ fontSize: '0.875rem' }}>{e.user?.name || e.user?.username}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{e.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="fw-600" style={{ fontSize: '0.875rem' }}>{e.path?.title}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {e.path?.courses_count} courses
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-1" style={{ height: 6, minWidth: 80 }}>
                                <div className="progress-bar bg-success" style={{ width: `${e.progress_pct}%` }} />
                              </div>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{e.progress_pct}%</span>
                            </div>
                          </td>
                          <td><StatusBadge status={e.status} /></td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => openDeenrollModal(e, 'path')}
                                title="De-enroll from path"
                              >
                                <i className="bi bi-person-x" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pagination
                page={pathEnrollmentsPage}
                pages={pathEnrollmentPages}
                onPageChange={setPathEnrollmentsPage}
                ariaLabel="Path enrollment pages"
              />
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: ANALYTICS
         ═══════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div>
          <div className="card mb-4">
            <div className="p-3 d-flex flex-wrap gap-3 align-items-center">
              <div style={{ flex: '1 1 200px' }}>
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Course ID</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter course ID…"
                  value={analyticsCourseId}
                  onChange={e => setAnalyticsCourseId(e.target.value ? parseInt(e.target.value) : '')}
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Path ID</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter path ID…"
                  value={analyticsPathId}
                  onChange={e => setAnalyticsPathId(e.target.value ? parseInt(e.target.value) : '')}
                />
              </div>
              <div style={{ width: 'auto', minWidth: 140 }}>
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Period (days)</label>
                <select
                  className="form-select"
                  value={analyticsPeriod}
                  onChange={e => setAnalyticsPeriod(parseInt(e.target.value))}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>
              <div className="ms-auto d-flex align-items-end">
                <button className="btn btn-primary" onClick={loadAnalytics} disabled={analyticsLoading}>
                  {analyticsLoading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-arrow-clockwise" />}
                  {' '}Refresh
                </button>
              </div>
            </div>
          </div>

          {analyticsLoading ? <Spinner /> : (
            <div className="row g-4">
              {/* Global Analytics Cards */}
              {globalAnalytics && (
                <>
                  <div className="col-12">
                    <h6 className="fw-700 mb-3">Global Overview (Last {analyticsPeriod} days)</h6>
                  </div>
                  <div className="col-md-3">
                    <div className="card p-3 text-center">
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>Total Course Enrollments</div>
                      <div className="fw-700 text-primary" style={{ fontSize: '1.5rem' }}>{globalAnalytics.courses?.total_enrollments || 0}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card p-3 text-center">
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>Active Enrollments</div>
                      <div className="fw-700 text-success" style={{ fontSize: '1.5rem' }}>{globalAnalytics.courses?.active_enrollments || 0}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card p-3 text-center">
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>Path Enrollments</div>
                      <div className="fw-700 text-info" style={{ fontSize: '1.5rem' }}>{globalAnalytics.paths?.total_enrollments || 0}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card p-3 text-center">
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>Revenue</div>
                      <div className="fw-700 text-warning" style={{ fontSize: '1.5rem' }}>₦{(globalAnalytics.revenue_in_period || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Top Courses */}
                  <div className="col-lg-6">
                    <div className="card p-3">
                      <h6 className="fw-700 mb-3">Top Courses by Enrollment</h6>
                      {globalAnalytics.top_courses?.length === 0 ? (
                        <Empty icon="bi-journal" title="No data" />
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {globalAnalytics.top_courses?.map((c: any, i: number) => (
                            <div key={c.id} className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ background: 'var(--bg)' }}>
                              <span className="badge bg-primary" style={{ minWidth: 28 }}>{i + 1}</span>
                              <div className="flex-1">
                                <div className="fw-600" style={{ fontSize: '0.875rem' }}>{c.title}</div>
                              </div>
                              <span className="badge bg-primary-light text-primary">{c.enrollments} enrolled</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Paths */}
                  <div className="col-lg-6">
                    <div className="card p-3">
                      <h6 className="fw-700 mb-3">Top Paths by Enrollment</h6>
                      {globalAnalytics.top_paths?.length === 0 ? (
                        <Empty icon="bi-diagram-3" title="No data" />
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {globalAnalytics.top_paths?.map((p: any, i: number) => (
                            <div key={p.id} className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ background: 'var(--bg)' }}>
                              <span className="badge bg-success" style={{ minWidth: 28 }}>{i + 1}</span>
                              <div className="flex-1">
                                <div className="fw-600" style={{ fontSize: '0.875rem' }}>{p.title}</div>
                              </div>
                              <span className="badge bg-success-light text-success">{p.enrollments} enrolled</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Specific Course/Path Analytics */}
              {analyticsData && (
                <div className="col-12">
                  <div className="card p-4">
                    <h6 className="fw-700 mb-3">
                      {analyticsData.course_title || analyticsData.path_title} — Detailed Analytics
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <div className="p-3 rounded-3" style={{ background: 'var(--bg)' }}>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>Completion Rate</div>
                          <div className="fw-700 text-primary" style={{ fontSize: '1.25rem' }}>{analyticsData.summary?.completion_rate || 0}%</div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3 rounded-3" style={{ background: 'var(--bg)' }}>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>Avg Progress</div>
                          <div className="fw-700 text-success" style={{ fontSize: '1.25rem' }}>{analyticsData.summary?.average_progress_pct || 0}%</div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3 rounded-3" style={{ background: 'var(--bg)' }}>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>New Enrollments</div>
                          <div className="fw-700 text-info" style={{ fontSize: '1.25rem' }}>{analyticsData.summary?.new_enrollments_in_period || 0}</div>
                        </div>
                      </div>
                    </div>

                    {/* Enrollment Trend Chart (simple bar representation) */}
                    <h6 className="fw-700 mb-2" style={{ fontSize: '0.875rem' }}>Daily Enrollment Trend</h6>
                    <div className="d-flex align-items-end gap-1" style={{ height: 120 }}>
                      {analyticsData.daily_enrollment_trend?.map((d: any, i: number) => {
                        const maxVal = Math.max(...(analyticsData.daily_enrollment_trend?.map((x: any) => x.enrollments) || [1]));
                        const height = maxVal > 0 ? (d.enrollments / maxVal) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 d-flex flex-column align-items-center gap-1">
                            <div
                              className="w-100 rounded-top-2 bg-primary"
                              style={{ height: `${height}%`, opacity: 0.7, minHeight: 2 }}
                              title={`${d.date}: ${d.enrollments} enrollments`}
                            />
                            <span className="text-muted" style={{ fontSize: '0.55rem', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                              {d.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: USER TRACKING
         ═══════════════════════════════════════════════════════════════ */}
      {tab === 'user-tracking' && (
        <div>
          <div className="card mb-4">
            <div className="p-3">
              <label className="form-label fw-600" style={{ fontSize: '0.875rem' }}>
                <i className="bi bi-search me-2" />Search Student to Track
              </label>
              <div className="position-relative" style={{ maxWidth: 400 }}>
                <SearchInput value={trackingUserSearch} onChange={setTrackingUserSearch} placeholder="Search by name or email…" />
                {trackingUserResults.length > 0 && (
                  <div className="border rounded-3 mt-1 overflow-hidden" style={{ position: 'absolute', zIndex: 20, width: '100%', background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
                    {trackingUserResults.map(u => (
                      <div key={u.id} className="d-flex align-items-center gap-3 p-3 cursor-pointer"
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                        onClick={() => { setTrackingUserId(u.id); setTrackingUserSearch(''); setTrackingUserResults([]); }}>
                        <Avatar image={u.image} name={u.name} size={32} />
                        <div>
                          <div className="fw-600" style={{ fontSize: '0.875rem' }}>{u.name || u.username}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>{u.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {trackingLoading ? <Spinner /> : trackingUserId && (
            <div className="row g-4">
              {/* User Summary */}
              {userActivity?.user && (
                <div className="col-12">
                  <div className="card p-4 d-flex align-items-center gap-4">
                    <Avatar image={userActivity.user.image} name={userActivity.user.name} size={64} />
                    <div>
                      <h5 className="fw-700 mb-1">{userActivity.user.name || userActivity.user.username}</h5>
                      <div className="text-muted" style={{ fontSize: '0.875rem' }}>{userActivity.user.email}</div>
                    </div>
                    <div className="ms-auto d-flex gap-3">
                      <div className="text-center">
                        <div className="fw-700 text-primary" style={{ fontSize: '1.25rem' }}>{userActivity.summary?.total_enrollments || 0}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Enrollments</div>
                      </div>
                      <div className="text-center">
                        <div className="fw-700 text-success" style={{ fontSize: '1.25rem' }}>{userActivity.summary?.completed_enrollments || 0}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="fw-700 text-info" style={{ fontSize: '1.25rem' }}>{userActivity.summary?.engagement_score || 0}%</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Engagement</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Course Enrollments */}
              <div className="col-lg-6">
                <div className="card p-3">
                  <h6 className="fw-700 mb-3">Course Enrollments</h6>
                  {userEnrollments?.items?.length === 0 ? (
                    <Empty icon="bi-journal-x" title="No course enrollments" />
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {userEnrollments?.items?.map((e: any) => (
                        <div key={e.id} className="p-2 rounded-2" style={{ background: 'var(--bg)' }}>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-600" style={{ fontSize: '0.875rem' }}>{e.course?.title}</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {e.course?.categories?.join(', ')} · {e.course?.level}
                              </div>
                            </div>
                            <StatusBadge status={e.status} />
                          </div>
                          <div className="d-flex gap-3 mt-2" style={{ fontSize: '0.75rem' }}>
                            <span className="text-muted">Progress: <strong>{e.progress_pct}%</strong></span>
                            <span className="text-muted">Topics: <strong>{e.completed_topics}</strong></span>
                            {e.payment?.amount && <span className="text-success">₦{e.payment.amount.toLocaleString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Path Enrollments */}
              <div className="col-lg-6">
                <div className="card p-3">
                  <h6 className="fw-700 mb-3">Path Enrollments</h6>
                  {userPathEnrollments?.items?.length === 0 ? (
                    <Empty icon="bi-diagram-3" title="No path enrollments" />
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {userPathEnrollments?.items?.map((e: any) => (
                        <div key={e.id} className="p-2 rounded-2" style={{ background: 'var(--bg)' }}>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-600" style={{ fontSize: '0.875rem' }}>{e.path?.title}</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {e.completed_courses}/{e.total_courses} courses completed
                              </div>
                            </div>
                            <StatusBadge status={e.status} />
                          </div>
                          <div className="mt-2">
                            <div className="progress" style={{ height: 6 }}>
                              <div className="progress-bar bg-success" style={{ width: `${e.progress_pct}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              {userActivity?.recent_topic_completions?.length > 0 && (
                <div className="col-12">
                  <div className="card p-3">
                    <h6 className="fw-700 mb-3">Recent Topic Completions</h6>
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr><th>Topic</th><th>Course</th><th>Completed</th></tr>
                        </thead>
                        <tbody>
                          {userActivity.recent_topic_completions.map((t: any, i: number) => (
                            <tr key={i}>
                              <td className="fw-600" style={{ fontSize: '0.875rem' }}>{t.topic_title}</td>
                              <td className="text-muted" style={{ fontSize: '0.8rem' }}>{t.course_title}</td>
                              <td style={{ fontSize: '0.8rem' }}>{t.completed_at ? new Date(t.completed_at).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          DE-ENROLL MODAL
         ═══════════════════════════════════════════════════════════════ */}
      <Modal
        show={deenrollModal.show}
        onClose={() => setDeenrollModal({ show: false, enrollmentId: 0, type: 'course', userName: '', itemName: '' })}
        title={`De-enroll: ${deenrollModal.userName}`}
        size="md"
        footer={
          <div className="d-flex gap-2 ms-auto">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setDeenrollModal({ show: false, enrollmentId: 0, type: 'course', userName: '', itemName: '' })}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              disabled={deenrollProcessing}
              onClick={handleDeenroll}
            >
              {deenrollProcessing
                ? <span className="spinner-border spinner-border-sm me-1" />
                : <i className="bi bi-person-x me-1" />
              }
              De-enroll from {deenrollModal.itemName}
            </button>
          </div>
        }
      >
        <div>
          <p className="text-muted mb-3">
            You are about to de-enroll <strong>{deenrollModal.userName}</strong> from{' '}
            <strong>{deenrollModal.itemName}</strong>.
          </p>
          <div className="alert alert-warning" style={{ fontSize: '0.875rem' }}>
            <i className="bi bi-exclamation-triangle me-2" />
            This will revoke access to all content. Progress data will be retained but the enrollment will be marked as suspended.
          </div>
          <div className="mb-3">
            <label className="form-label fw-600">Reason (optional)</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Provide a reason for de-enrollment…"
              value={deenrollReason}
              onChange={e => setDeenrollReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

