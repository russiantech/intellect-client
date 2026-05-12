import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { creatorApi } from '@/services/api';
import { Spinner, Empty, PageTitle, StatusBadge, Avatar } from '@/components/shared/index';

export function CreatorCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { creatorApi.myCourses().then(r => setCourses(r.data.items || [])).finally(() => setLoading(false)); }, []);
  return (
    <div className="fade-in">
      <PageTitle title="My Courses" crumbs={[{ label: 'Creator', href: '/creator' }, { label: 'Courses' }]} />
      <div className="d-flex justify-content-end mb-4">
        <Link to="/creator/courses/new" className="btn btn-primary btn-icon-start"><i className="bi bi-plus-circle" /> Create Course</Link>
      </div>
      {loading ? <Spinner /> : courses.length === 0 ? (
        <Empty icon="bi-journal-richtext" title="No courses yet" 
        subtitle="Start creating your first course to share your knowledge." 
        action={{ label: 'Create Course', href: '/creator/courses/new', onClick: () => {} }} />
      ) : (
        <div className="card overflow-hidden">
          <table className="table mb-0">
            <thead><tr><th>Course</th><th>Status</th><th>Price</th><th>Enrolled</th><th>Earnings</th><th>Actions</th></tr></thead>
            <tbody>
              {courses.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <div className="fw-600" style={{ fontSize: '0.875rem' }}>{c.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</div>
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ fontSize: '0.875rem' }}>{c.fee > 0 ? `₦${Number(c.fee).toLocaleString()}` : <span className="text-success">Free</span>}</td>
                  <td style={{ fontSize: '0.875rem' }}>{c.enrollments}</td>
                  <td style={{ fontSize: '0.875rem' }}>₦{(c.earnings || 0).toLocaleString()}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Link to={`/creator/courses/${c.id}/edit`} className="btn btn-sm btn-outline-primary"><i className="bi bi-pencil" /></Link>
                      <Link to={`/courses/${c.slug}`} className="btn btn-sm btn-outline-secondary"><i className="bi bi-eye" /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CreatorStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { creatorApi.students().then(r => setStudents(r.data || [])).finally(() => setLoading(false)); }, []);
  return (
    <div className="fade-in">
      <PageTitle title="My Students" subtitle={`${students.length} enrolled students across all your courses`} />
      {loading ? <Spinner /> : students.length === 0 ? <Empty icon="bi-people" title="No students yet" subtitle="Students who enroll in your courses will appear here." /> : (
        <div className="card overflow-hidden">
          <table className="table mb-0">
            <thead><tr><th>Student</th><th>Course</th><th>Progress</th><th>Enrolled</th></tr></thead>
            <tbody>
              {students.map((s: any, i: number) => (
                <tr key={i}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Avatar image={s.student?.image} name={s.student?.name} size={32} />
                      <div>
                        <div className="fw-600" style={{ fontSize: '0.8rem' }}>{s.student?.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.student?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{s.course?.title}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress" style={{ width: 80, height: 6 }}>
                        <div className="progress-bar" style={{ width: `${s.progress_pct || 0}%` }} />
                      </div>
                      <span style={{ fontSize: '0.72rem' }}>{s.progress_pct || 0}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CreatorEarnings() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { creatorApi.earnings().then(r => setData(r.data)).finally(() => setLoading(false)); }, []);
  return (
    <div className="fade-in">
      <PageTitle title="Earnings" subtitle="Your revenue from course sales" />
      {loading ? <Spinner /> : !data ? null : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4">
              <div className="card p-3 text-center">
                <div className="fw-700 fs-4 text-primary">₦{(data.total || 0).toLocaleString()}</div>
                <div className="text-muted small">Total Earnings</div>
              </div>
            </div>
          </div>
          {data.payments?.length === 0 ? <Empty icon="bi-currency-dollar" title="No earnings yet" subtitle="Earnings from paid course enrollments will appear here." /> : (
            <div className="card overflow-hidden">
              <table className="table mb-0">
                <thead><tr><th>Course</th><th>Amount</th><th>Your Cut</th><th>Date</th></tr></thead>
                <tbody>
                  {data.payments?.map((p: any) => (
                    <tr key={p.id}>
                      <td style={{ fontSize: '0.875rem' }}>{p.course?.title}</td>
                      <td style={{ fontSize: '0.875rem' }}>₦{Number(p.amount).toLocaleString()}</td>
                      <td style={{ fontSize: '0.875rem' }} className="fw-600 text-success">₦{Number(p.creator_amount || 0).toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CreatorCourses;
