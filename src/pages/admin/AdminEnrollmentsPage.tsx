import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi, coursesApi, usersApi } from '@/services/api';
import { Course, User } from '@/types';
import { Spinner, Empty, PageTitle, StatusBadge, Avatar, SearchInput } from '@/components/shared/index';

export default function AdminEnrollmentsPage() {
  const [tab, setTab] = useState<'assign' | 'all'>('assign');

  // Assign tab state
  const [searchUser, setSearchUser] = useState('');
  const [searchCourse, setSearchCourse] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [courseResults, setCourseResults] = useState<Course[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Search users
  useEffect(() => {
    if (searchUser.length < 2) { setUserResults([]); return; }
    usersApi.listUsers({ search: searchUser, per_page: 8 }).then(r => setUserResults(r.data.items || []));
  }, [searchUser]);

  // Search courses
  useEffect(() => {
    if (searchCourse.length < 2) { setCourseResults([]); return; }
    coursesApi.list({ search: searchCourse, per_page: 8, status: 'published' }).then(r => setCourseResults(r.data.items || []));
  }, [searchCourse]);

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
      toast.error(err.response?.data?.detail || 'Enrollment failed');
    } finally { setAssigning(false); }
  };

  return (
    <div className="fade-in">
      <PageTitle
        title="Enrollments"
        subtitle="Assign courses to users and manage all enrollments"
        crumbs={[{ label: 'Admin' }, { label: 'Enrollments' }]}
      />

      <div className="d-flex gap-2 mb-4">
        {(['assign', 'all'] as const).map(t => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ borderRadius: 999, textTransform: 'capitalize' }} onClick={() => setTab(t)}>
            {t === 'assign' ? '+ Assign Course' : 'All Enrollments'}
          </button>
        ))}
      </div>

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

      {tab === 'all' && <AllEnrollments />}
    </div>
  );
}

function AllEnrollments() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // We don't have a direct "all enrollments" API yet, so use course-level data
  useEffect(() => {
    coursesApi.list({ per_page: 50, status: 'published' })
      .then(r => setEnrollments(r.data.items || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? enrollments.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : enrollments;

  return (
    <div>
      <div className="mb-4" style={{ maxWidth: 400 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Filter by course name…" />
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="bi-person-check" title="No courses found" /> : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Creator</th>
                  <th>Enrolled</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <div className="fw-600" style={{ fontSize: '0.875rem' }}>{c.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.level} · {c.lessons_count} lessons</div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{c.creator?.name || '—'}</td>
                    <td>
                      <span className="badge bg-primary-light text-primary fw-700">{c.enrolled_count}</span>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <div className="d-flex gap-1">
                        <Link to={`/courses/${c.slug}`} className="btn btn-sm btn-outline-secondary" title="View course">
                          <i className="bi bi-eye" />
                        </Link>
                        <Link to={`/admin/courses/${c.id}/revenue`} className="btn btn-sm btn-outline-warning" title="Revenue split">
                          <i className="bi bi-percent" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
