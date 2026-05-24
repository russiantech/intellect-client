// src/pages/admin/AdminUsers.tsx
/**
 * AdminUsers — v4.1
 *
 * Changes
 * ─────────────────────────────────────────────────────────────────────────
 * 1. IMPERSONATION — Gate changed from hardcoded email to super_admin role.
 *    Prevents self-impersonation and impersonating any admin target.
 * 2. ONLINE STATUS — Real-time online/offline indicator with last-seen tooltip.
 * 3. PROFILE EDIT — Direct link to user profile edit page.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersApi, adminApi } from '@/services/api';
import { User } from '@/types';
import {
  Spinner,
  PageTitle,
  Avatar,
  SearchInput,
  Modal,
  StatusBadge,
  Empty,
} from '@/components/shared/index';
import Pagination from '@/components/shared/Pagination';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const PER_PAGE = 20;
const ROLES = ['student', 'tutor', 'creator', 'partner', 'admin', 'super_admin'] as const;

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

/** Format last_seen into a human-readable relative string */
function formatLastSeen(lastSeen: string | Date | null | undefined): string {
  if (!lastSeen) return 'Never';
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/** Online status indicator with tooltip */
function OnlineStatus({ user }: { user: User }) {
  const lastSeenText = formatLastSeen(user.last_seen);
  const tooltip = user.is_online
    ? `Online now`
    : `Last seen: ${lastSeenText}`;

  return (
    <span
      className="d-inline-flex align-items-center gap-1"
      title={tooltip}
      style={{ cursor: 'help' }}
    >
      <span
        className={`d-inline-block rounded-circle ${user.is_online ? 'bg-success' : 'bg-secondary'}`}
        style={{ width: 8, height: 8 }}
      />
      <span style={{ fontSize: '0.72rem' }} className={user.is_online ? 'text-success' : 'text-muted'}>
        {user.is_online ? 'Online' : lastSeenText}
      </span>
    </span>
  );
}

/** Check if a user has any admin-level role */
function isAdminRole(roles: string[] = []): boolean {
  return roles.some(r => r === 'admin' || r === 'super_admin');
}

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Enrollment tracking modal
  const [enrollmentModal, setEnrollmentModal] = useState<{
    show: boolean;
    user: User | null;
    tab: 'courses' | 'paths' | 'activity';
  }>({ show: false, user: null, tab: 'courses' });
  const [userEnrollments, setUserEnrollments] = useState<any>(null);
  const [userPathEnrollments, setUserPathEnrollments] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<any>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  // Impersonation & current user
  const { canImpersonate, impersonate } = useImpersonation();
  const { user: currentUser } = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    usersApi.listUsers({
      page,
      per_page: PER_PAGE,
      search: search || undefined,
      role: roleFilter || undefined,
    }).then(r => {
      setUsers(r.data.items || []);
      setTotal(r.data.total || 0);
    }).finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (u: User) => {
    try {
      await usersApi.toggleActive(u.id);
      toast.success('User status updated');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Toggle failed');
    }
  };

  const openEnrollmentModal = async (user: User) => {
    setEnrollmentModal({ show: true, user, tab: 'courses' });
    setEnrollmentLoading(true);
    try {
      const [enrollmentsRes, pathEnrollmentsRes, activityRes] = await Promise.all([
        adminApi.getUserEnrollments(user.id),
        adminApi.getUserPathEnrollments(user.id),
        adminApi.getUserActivity(user.id, 30),
      ]);
      setUserEnrollments(enrollmentsRes.data);
      setUserPathEnrollments(pathEnrollmentsRes.data);
      setUserActivity(activityRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to load user enrollment data');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  /** Handle impersonation with confirmation */
  const handleImpersonate = async (targetUser: User) => {
    if (!canImpersonate()) {
      toast.error('You do not have permission to impersonate users');
      return;
    }

    const confirmed = window.confirm(
      `Impersonate ${targetUser.name || targetUser.username}?\n\n` +
      `You will be logged in as this user and redirected to their dashboard. ` +
      `Use the "Back to Admin" banner to return to your account.\n\n` +
      `Continue?`
    );
    if (!confirmed) return;

    await impersonate(targetUser.id);
  };

  const pages = Math.ceil(total / PER_PAGE);

  return (
    <div className="fade-in">
      <PageTitle
        title="Manage Users"
        subtitle={`${total} total users`}
        crumbs={[{ label: 'Admin' }, { label: 'Users' }]}
      />

      {/* Filters */}
      <div className="card mb-4">
        <div className="p-3 d-flex flex-wrap gap-3 align-items-center">
          <div style={{ flex: '1 1 260px' }}>
            <SearchInput
              value={search}
              onChange={v => { setSearch(v); setPage(1); }}
              placeholder="Search users by name, email, or username"
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <span className="text-muted rounded-pill border px-3" style={{ fontSize: '0.8rem' }}>
            {total} user{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Avatar image={u.image} name={u.name || u.username} size={36} />
                        <div>
                          <div className="fw-600" style={{ fontSize: '0.875rem' }}>
                            {u.name || u.username}
                            {u.is_creator && u.creator_approved && (
                              <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.6rem' }}>Creator</span>
                            )}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        {u.roles.map(r => (
                          <span
                            key={r}
                            className="badge bg-primary-light text-primary"
                            style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <span
                          className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}
                          style={{ fontSize: '0.65rem', width: 'fit-content' }}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <OnlineStatus user={u} />
                        {u.email_verified && (
                          <span
                            className="badge bg-info"
                            style={{ fontSize: '0.6rem', width: 'fit-content' }}
                            title="Email address verified"
                          >
                            <i className="bi bi-envelope-check me-1" style={{ fontSize: '0.6rem' }} />
                            Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-nowrap">
                        {/* View enrollments */}
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openEnrollmentModal(u)}
                          title="View enrollments & activity"
                        >
                          <i className="bi bi-journal-bookmark" />
                        </button>

                        {/* Edit profile */}
                        <Link
                          to={`/admin/users/${u.id}/edit`}
                          className="btn btn-sm btn-outline-secondary"
                          title="Edit user profile"
                        >
                          <i className="bi bi-pencil" />
                        </Link>

                        {/* Impersonate — super_admin only, cannot self-impersonate or target admins */}
                        {canImpersonate() && u.id !== currentUser?.id && !isAdminRole(u.roles) && (
                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleImpersonate(u)}
                            title={`Log in as ${u.name || u.username}`}
                          >
                            <i className="bi bi-incognito" />
                          </button>
                        )}

                        {/* Activate / Deactivate */}
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => handleToggle(u)}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <i className={`bi ${u.is_active ? 'bi-person-x' : 'bi-person-check'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        page={page}
        pages={pages}
        onPageChange={setPage}
        ariaLabel="User pages"
      />

      {/* ═══════════════════════════════════════════════════════════════
          ENROLLMENT & ACTIVITY MODAL
         ═══════════════════════════════════════════════════════════════ */}
      <Modal
        show={enrollmentModal.show}
        onClose={() => setEnrollmentModal({ show: false, user: null, tab: 'courses' })}
        title={enrollmentModal.user ? `${enrollmentModal.user.name || enrollmentModal.user.username} — Learning Activity` : 'User Activity'}
        size="xl"
        footer={
          <button
            className="btn btn-outline-secondary"
            onClick={() => setEnrollmentModal({ show: false, user: null, tab: 'courses' })}
          >
            Close
          </button>
        }
      >
        {enrollmentModal.user && (
          <div>
            {/* Modal Tabs */}
            <div className="d-flex gap-2 mb-4">
              {(['courses', 'paths', 'activity'] as const).map(t => (
                <button
                  key={t}
                  className={`btn btn-sm ${enrollmentModal.tab === t ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ borderRadius: 999, textTransform: 'capitalize' }}
                  onClick={() => setEnrollmentModal(prev => ({ ...prev, tab: t }))}
                >
                  {t === 'courses' ? 'Course Enrollments' : t === 'paths' ? 'Path Enrollments' : 'Activity Timeline'}
                </button>
              ))}
            </div>

            {enrollmentLoading ? <Spinner /> : (
              <>
                {/* Course Enrollments Tab */}
                {enrollmentModal.tab === 'courses' && (
                  <div>
                    {userEnrollments?.items?.length === 0 ? (
                      <Empty icon="bi-journal-x" title="No course enrollments" subtitle="This user hasn't enrolled in any courses yet" />
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Course</th>
                              <th>Progress</th>
                              <th>Status</th>
                              <th>Payment</th>
                              <th>Enrolled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userEnrollments?.items?.map((e: any) => (
                              <tr key={e.id}>
                                <td>
                                  <div className="fw-600" style={{ fontSize: '0.875rem' }}>{e.course?.title}</div>
                                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                    {e.course?.categories?.join(', ')} · {e.course?.level}
                                  </div>
                                </td>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <div className="progress flex-1" style={{ height: 6, width: 80 }}>
                                      <div className="progress-bar" style={{ width: `${e.progress_pct}%` }} />
                                    </div>
                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{e.progress_pct}%</span>
                                  </div>
                                </td>
                                <td><StatusBadge status={e.status} /></td>
                                <td style={{ fontSize: '0.8rem' }}>
                                  {e.payment?.amount ? (
                                    <span className="text-success fw-600">₦{e.payment.amount.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                                <td style={{ fontSize: '0.8rem' }}>
                                  {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Path Enrollments Tab */}
                {enrollmentModal.tab === 'paths' && (
                  <div>
                    {userPathEnrollments?.items?.length === 0 ? (
                      <Empty icon="bi-diagram-3" title="No path enrollments" subtitle="This user hasn't enrolled in any learning paths" />
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {userPathEnrollments?.items?.map((e: any) => (
                          <div key={e.id} className="card p-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="fw-700" style={{ fontSize: '0.95rem' }}>{e.path?.title}</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                  {e.completed_courses}/{e.total_courses} courses completed
                                </div>
                              </div>
                              <StatusBadge status={e.status} />
                            </div>
                            <div className="mt-3">
                              <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.75rem' }}>
                                <span className="text-muted">Path Progress</span>
                                <span className="fw-600">{e.progress_pct}%</span>
                              </div>
                              <div className="progress" style={{ height: 8 }}>
                                <div className="progress-bar bg-success" style={{ width: `${e.progress_pct}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Activity Timeline Tab */}
                {enrollmentModal.tab === 'activity' && (
                  <div>
                    {userActivity?.summary && (
                      <div className="row g-3 mb-4">
                        <div className="col-md-3">
                          <div className="card p-3 text-center">
                            <div className="fw-700 text-primary" style={{ fontSize: '1.5rem' }}>{userActivity.summary.total_enrollments}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total Enrollments</div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="card p-3 text-center">
                            <div className="fw-700 text-success" style={{ fontSize: '1.5rem' }}>{userActivity.summary.completed_enrollments}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Completed</div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="card p-3 text-center">
                            <div className="fw-700 text-info" style={{ fontSize: '1.5rem' }}>{userActivity.summary.total_topics_completed}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Topics Done</div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="card p-3 text-center">
                            <div className="fw-700 text-warning" style={{ fontSize: '1.5rem' }}>{userActivity.summary.engagement_score}%</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Engagement</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {userActivity?.recent_topic_completions?.length > 0 && (
                      <div className="mb-4">
                        <h6 className="fw-700 mb-3">Recent Topic Completions</h6>
                        <div className="table-responsive">
                          <table className="table table-sm">
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
                    )}

                    {userActivity?.recent_assessments?.length > 0 && (
                      <div className="mb-4">
                        <h6 className="fw-700 mb-3">Recent Assessments</h6>
                        <div className="d-flex flex-column gap-2">
                          {userActivity.recent_assessments.map((a: any) => (
                            <div key={a.id} className="d-flex justify-content-between align-items-center p-2 rounded-2" style={{ background: 'var(--bg)' }}>
                              <div>
                                <div className="fw-600" style={{ fontSize: '0.875rem' }}>Assessment #{a.assessment_id}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  Attempt {a.attempt_number} · {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '—'}
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <span className={`badge ${a.passed ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.7rem' }}>
                                  {a.passed ? 'Passed' : 'Failed'}
                                </span>
                                <span className="fw-600" style={{ fontSize: '0.875rem' }}>{a.percentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {userActivity?.enrollment_timeline?.length > 0 && (
                      <div>
                        <h6 className="fw-700 mb-3">Enrollment Timeline</h6>
                        <div className="d-flex flex-column gap-2">
                          {userActivity.enrollment_timeline.map((e: any, i: number) => (
                            <div key={i} className="d-flex align-items-center gap-3 p-2 rounded-2" style={{ background: 'var(--bg)' }}>
                              <div className={`badge ${e.status === 'completed' ? 'bg-success' : e.status === 'active' ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                {e.status}
                              </div>
                              <div className="flex-1">
                                <div className="fw-600" style={{ fontSize: '0.875rem' }}>{e.course_title}</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  Enrolled {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}
                                  {e.completed_at && ` · Completed ${new Date(e.completed_at).toLocaleDateString()}`}
                                </div>
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{e.progress_pct}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
