

// // v3
// import { useState, useEffect, useCallback } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { coursesApi } from '@/services/api';
// import { Course } from '@/types';
// import {
//   Spinner,
//   Empty,
//   Modal,
//   StatusBadge,
//   PageTitle,
//   SearchInput,
//   Avatar,
// } from '@/components/shared/index';
// import { CourseThumbnail } from '@/components/shared/CourseThumbnail';
// import Pagination from '@/components/shared/Pagination';

// /* ═══════════════════════════════════════════
//    AdminCourses — Full CRUD for all courses
//    Admin can: list, search, filter, approve,
//    reject, delete, edit, create new courses.
//    ═══════════════════════════════════════════ */

// const PER_PAGE = 15;
// const STATUSES = ['draft', 'pending', 'published', 'unpublished', 'rejected'] as const;

// type CourseStatus = typeof STATUSES[number];

// export default function AdminCourses() {

//   const [courses, setCourses] = useState<Course[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [status, setStatus] = useState<CourseStatus | ''>('');
//   const [page, setPage] = useState(1);
//   const [total, setTotal] = useState(0);

//   const [approvalModal, setApprovalModal] = useState<{
//     course: Course | null;
//     show: boolean;
//   }>({ course: null, show: false });
//   const [rejectionReason, setRejectionReason] = useState('');
//   const [processing, setProcessing] = useState(false);

//   /* ── Load courses ── */
//   const load = useCallback(() => {
//     setLoading(true);
//     const params: Record<string, unknown> = { page, per_page: PER_PAGE };
//     if (search.trim()) params.search = search.trim();
//     if (status) params.status = status;

//     coursesApi
//       .list(params)
//       .then(r => {
//         setCourses(r.data?.items || []);
//         setTotal(r.data?.total || 0);
//       })
//       .catch(() => toast.error('Failed to load courses'))
//       .finally(() => setLoading(false));
//   }, [page, search, status]);

//   useEffect(() => { load(); }, [load]);

//   /* ── Handlers ── */
//   const handleSearchChange = (val: string) => {
//     setSearch(val);
//     setPage(1);
//   };

//   const handleStatusChange = (val: string) => {
//     setStatus(val as CourseStatus | '');
//     setPage(1);
//   };

//   const handleApprove = async (approved: boolean) => {
//     if (!approvalModal.course) return;
//     if (!approved && !rejectionReason.trim()) {
//       return toast.error('Please provide a rejection reason');
//     }
//     setProcessing(true);
//     try {
//       await coursesApi.approve(approvalModal.course.id, {
//         approved,
//         rejection_reason: rejectionReason.trim() || undefined,
//       });
//       toast.success(`Course ${approved ? 'approved' : 'rejected'}`);
//       setApprovalModal({ course: null, show: false });
//       setRejectionReason('');
//       load();
//     } catch (err: any) {
//       toast.error(
//         err?.response?.data?.detail ||
//         err?.message ||
//         'Action failed',
//       );
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const handleDelete = async (course: Course) => {
//     if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
//     try {
//       await coursesApi.delete(course.id);
//       toast.success('Course deleted');
//       load();
//     } catch (err: any) {
//       toast.error(
//         err?.response?.data?.detail ||
//         err?.message ||
//         'Delete failed',
//       );
//     }
//   };

//   const pages = Math.ceil(total / PER_PAGE);

//   return (
//     <div className="fade-in">
//       <PageTitle
//         title="Manage Courses"
//         subtitle="Review, approve, and manage all courses"
//         crumbs={[{ label: 'Admin' }, { label: 'Courses' }]}
//       />

//       {/* ── Toolbar: Search + Filter + Create ── */}
//       <div className="card mb-4">
//         <div className="p-3 d-flex flex-wrap gap-3 align-items-center">
//           <div style={{ flex: '1 1 260px' }}>
//             <SearchInput
//               value={search}
//               onChange={handleSearchChange}
//               placeholder="Search courses…"
//             />
//           </div>

//           <select
//             className="form-select"
//             style={{ width: 'auto', minWidth: 160 }}
//             value={status}
//             onChange={e => handleStatusChange(e.target.value)}
//           >
//             <option value="">All Statuses</option>
//             {STATUSES.map(s => (
//               <option key={s} value={s}>
//                 {s.charAt(0).toUpperCase() + s.slice(1)}
//               </option>
//             ))}
//           </select>

//           <span className="text-muted" style={{ fontSize: '0.8rem' }}>
//             {total} course{total !== 1 ? 's' : ''}
//           </span>

//           <div className="ms-auto">
//             <Link
//               to="/admin/courses/new"
//               className="btn btn-primary btn-icon-start"
//             >
//               <i className="bi bi-plus-circle" /> Create Course
//             </Link>
//           </div>
//         </div>
//       </div>

//       {/* ── Content ── */}
//       {loading ? (
//         <Spinner />
//       ) : courses.length === 0 ? (
//         <Empty
//           icon="bi-journal-x"
//           title="No courses found"
//           subtitle={
//             search || status
//               ? 'Try adjusting your search or filter'
//               : 'No courses in the system yet'
//           }
//         />
//       ) : (
//         <>
//           <div className="card overflow-hidden">
//             <div className="table-responsive">
//               <table className="table mb-0">
//                 <thead>
//                   <tr>
//                     <th>Course</th>
//                     <th>Creator</th>
//                     <th>Level</th>
//                     <th>Fee</th>
//                     <th>Enrolled</th>
//                     <th>Status</th>
//                     <th style={{ width: 1 }}>Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {courses.map(c => (
//                     <tr key={c.id}>
//                       <td style={{ maxWidth: 280 }}>
//                         <div className="d-flex align-items-center gap-3">
//                           <CourseThumbnail
//                             thumbnail={c.thumbnail}
//                             size={48}
//                             borderRadius={6}
//                           />
//                           <div>
//                             <Link
//                               to={`/admin/courses/${c.id}/edit`}
//                               className="fw-600 text-decoration-none"
//                               style={{ fontSize: '0.875rem', display: 'block' }}
//                             >
//                               {c.title}
//                             </Link>
//                             <span className="text-muted" style={{ fontSize: '0.72rem' }}>
//                               {c.lessons_count} lessons ·{' '}
//                               {c.created_at
//                                 ? new Date(c.created_at).toLocaleDateString()
//                                 : ''}
//                             </span>
//                           </div>
//                         </div>
//                       </td>

//                       <td>
//                         {c.creator ? (
//                           <div className="d-flex align-items-center gap-2">
//                             <Avatar
//                               image={c.creator.image}
//                               name={c.creator.name}
//                               size={28}
//                             />
//                             <span style={{ fontSize: '0.8rem' }}>
//                               {c.creator.name}
//                             </span>
//                           </div>
//                         ) : (
//                           <span className="text-muted">—</span>
//                         )}
//                       </td>

//                       <td>
//                         <span className={`badge-level ${c.level}`}>
//                           {c.level}
//                         </span>
//                       </td>

//                       <td style={{ fontSize: '0.875rem' }}>
//                         {c.fee > 0 ? (
//                           `₦${c.fee.toLocaleString()}`
//                         ) : (
//                           <span className="text-success fw-600">Free</span>
//                         )}
//                       </td>

//                       <td style={{ fontSize: '0.875rem' }}>
//                         {c.enrolled_count ?? 0}
//                       </td>

//                       <td>
//                         <StatusBadge status={c.status} />
//                       </td>

//                       <td>
//                         <div className="d-flex gap-1 flex-nowrap">
//                           {c.status === 'pending' && (
//                             <button
//                               className="btn btn-sm btn-success btn-icon-start"
//                               onClick={() => {
//                                 setApprovalModal({ course: c, show: true });
//                                 setRejectionReason('');
//                               }}
//                             >
//                               <i className="bi bi-check-circle" /> Review
//                             </button>
//                           )}

//                           <Link
//                             to={`/admin/courses/${c.id}/edit`}
//                             className="btn btn-sm btn-outline-primary"
//                             title="Edit course"
//                           >
//                             <i className="bi bi-pencil" />
//                           </Link>

//                           <Link
//                             to={`/admin/courses/${c.id}/revenue`}
//                             className="btn btn-sm btn-outline-warning"
//                             title="Configure revenue split"
//                           >
//                             <i className="bi bi-percent" />
//                           </Link>

//                           <Link
//                             to={`/courses/${c.slug}`}
//                             className="btn btn-sm btn-outline-secondary"
//                             title="Preview"
//                           >
//                             <i className="bi bi-eye" />
//                           </Link>

//                           <button
//                             className="btn btn-sm btn-outline-danger"
//                             onClick={() => handleDelete(c)}
//                             title="Delete"
//                           >
//                             <i className="bi bi-trash" />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* ── Reusable Pagination ── */}
//           <Pagination
//             page={page}
//             pages={pages}
//             onPageChange={setPage}
//             ariaLabel="Course pages"
//           />
//         </>
//       )}

//       {/* ── Approval / Rejection Modal ── */}
//       <Modal
//         show={approvalModal.show}
//         onClose={() => setApprovalModal({ course: null, show: false })}
//         title="Review Course"
//         size="lg"
//         footer={
//           <div className="d-flex gap-2 ms-auto">
//             <button
//               className="btn btn-outline-secondary"
//               onClick={() => setApprovalModal({ course: null, show: false })}
//             >
//               Cancel
//             </button>
//             <button
//               className="btn btn-danger"
//               disabled={processing}
//               onClick={() => handleApprove(false)}
//             >
//               {processing ? (
//                 <span className="spinner-border spinner-border-sm me-1" />
//               ) : (
//                 <i className="bi bi-x-circle me-1" />
//               )}
//               Reject
//             </button>
//             <button
//               className="btn btn-success"
//               disabled={processing}
//               onClick={() => handleApprove(true)}
//             >
//               {processing ? (
//                 <span className="spinner-border spinner-border-sm me-1" />
//               ) : (
//                 <i className="bi bi-check-circle me-1" />
//               )}
//               Approve & Publish
//             </button>
//           </div>
//         }
//       >
//         {approvalModal.course && (
//           <div>
//             <div className="d-flex align-items-start gap-3 mb-4">
//               {approvalModal.course.thumbnail && (
//                 <img
//                   src={`/uploads/courses/thumbnails/${approvalModal.course.thumbnail}`}
//                   alt=""
//                   style={{
//                     width: 100,
//                     height: 68,
//                     objectFit: 'cover',
//                     borderRadius: 8,
//                   }}
//                 />
//               )}
//               <div>
//                 <h5 className="fw-700 mb-1">
//                   {approvalModal.course.title}
//                 </h5>
//                 <p className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>
//                   {approvalModal.course.short_description}
//                 </p>
//                 <div className="d-flex gap-2 flex-wrap">
//                   <span
//                     className={`badge-level ${approvalModal.course.level}`}
//                   >
//                     {approvalModal.course.level}
//                   </span>
//                   <span className="text-muted" style={{ fontSize: '0.75rem' }}>
//                     {approvalModal.course.lessons_count} lessons
//                   </span>
//                   {approvalModal.course.fee > 0 ? (
//                     <span
//                       className="fw-600 text-primary"
//                       style={{ fontSize: '0.8rem' }}
//                     >
//                       ₦{approvalModal.course.fee.toLocaleString()}
//                     </span>
//                   ) : (
//                     <span
//                       className="text-success"
//                       style={{ fontSize: '0.8rem' }}
//                     >
//                       Free
//                     </span>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div>
//               <label className="form-label fw-600">
//                 Rejection Reason (required if rejecting)
//               </label>
//               <textarea
//                 className="form-control"
//                 rows={3}
//                 placeholder="Provide clear feedback for the creator…"
//                 value={rejectionReason}
//                 onChange={e => setRejectionReason(e.target.value)}
//               />
//             </div>
//           </div>
//         )}
//       </Modal>
//     </div>
//   );
// }





// v4
// v3 — fixed thumbnail URL handling throughout
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { coursesApi } from '@/services/api';
import { Course } from '@/types';
import {
  Spinner,
  Empty,
  Modal,
  StatusBadge,
  PageTitle,
  SearchInput,
  Avatar,
} from '@/components/shared/index';
import { CourseThumbnail } from '@/components/shared/CourseThumbnail';
import { resolveImage } from '@/utils/resolveImage';
import Pagination from '@/components/shared/Pagination';

/* ═══════════════════════════════════════════
   AdminCourses — Full CRUD for all courses
   Admin can: list, search, filter, approve,
   reject, delete, edit, create new courses.
   ═══════════════════════════════════════════ */

const PER_PAGE = 15;
const STATUSES = ['draft', 'pending', 'published', 'unpublished', 'rejected'] as const;

type CourseStatus = typeof STATUSES[number];

// ── Small helper: modal thumbnail ────────────────────────────────────────────
// Keeps the modal JSX clean and avoids the inline path-prefix mistake.
function ModalThumbnail({ thumbnail }: { thumbnail?: string | null }) {
  const src = useMemo(
    () => resolveImage(thumbnail, null, 'courses/thumbnails'),
    [thumbnail],
  );
  const [imgSrc, setImgSrc] = useState<string | null>(src);

  if (!imgSrc) return null;

  return (
    <img
      src={imgSrc}
      alt=""
      onError={() => setImgSrc(null)}
      style={{ width: 100, height: 68, objectFit: 'cover', borderRadius: 8 }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminCourses() {
  const [courses, setCourses]   = useState<Course[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState<CourseStatus | ''>('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  const [approvalModal, setApprovalModal] = useState<{
    course: Course | null;
    show: boolean;
  }>({ course: null, show: false });
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing]           = useState(false);

  /* ── Load courses ──────────────────────────────────────────────────────── */
  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, per_page: PER_PAGE };
    if (search.trim()) params.search = search.trim();
    if (status)        params.status = status;

    coursesApi
      .list(params)
      .then(r => {
        setCourses(r.data?.items || []);
        setTotal(r.data?.total  || 0);
      })
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
  const handleStatusChange = (val: string) => { setStatus(val as CourseStatus | ''); setPage(1); };

  const closeModal = useCallback(
    () => setApprovalModal({ course: null, show: false }),
    [],
  );

  const handleApprove = async (approved: boolean) => {
    if (!approvalModal.course) return;
    if (!approved && !rejectionReason.trim()) {
      return toast.error('Please provide a rejection reason');
    }
    setProcessing(true);
    try {
      await coursesApi.approve(approvalModal.course.id, {
        approved,
        rejection_reason: rejectionReason.trim() || undefined,
      });
      toast.success(`Course ${approved ? 'approved' : 'rejected'}`);
      closeModal();
      setRejectionReason('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    try {
      await coursesApi.delete(course.id);
      toast.success('Course deleted');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Delete failed');
    }
  };

  const pages = Math.ceil(total / PER_PAGE);

  return (
    <div className="fade-in">
      <PageTitle
        title="Manage Courses"
        subtitle="Review, approve, and manage all courses"
        crumbs={[{ label: 'Admin' }, { label: 'Courses' }]}
      />

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="p-3 d-flex flex-wrap gap-3 align-items-center">
          <div style={{ flex: '1 1 260px' }}>
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search courses…"
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={status}
            onChange={e => handleStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          <span className="text-muted" style={{ fontSize: '0.8rem' }}>
            {total} course{total !== 1 ? 's' : ''}
          </span>

          <div className="ms-auto">
            <Link to="/admin/courses/new" className="btn btn-primary btn-icon-start">
              <i className="bi bi-plus-circle" /> Create Course
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loading ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <Empty
          icon="bi-journal-x"
          title="No courses found"
          subtitle={
            search || status
              ? 'Try adjusting your search or filter'
              : 'No courses in the system yet'
          }
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Creator</th>
                    <th>Level</th>
                    <th>Fee</th>
                    <th>Enrolled</th>
                    <th>Status</th>
                    <th style={{ width: 1 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id}>
                      {/* ── Course cell ─────────────────────────────────── */}
                      <td style={{ maxWidth: 280 }}>
                        <div className="d-flex align-items-center gap-3">
                          {/* CourseThumbnail now handles URL resolution internally */}
                          <CourseThumbnail
                            thumbnail={c.thumbnail}
                            size={48}
                            borderRadius={6}
                          />
                          <div>
                            <Link
                              to={`/admin/courses/${c.id}/edit`}
                              className="fw-600 text-decoration-none"
                              style={{ fontSize: '0.875rem', display: 'block' }}
                            >
                              {c.title}
                            </Link>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {c.lessons_count} lessons ·{' '}
                              {c.created_at
                                ? new Date(c.created_at).toLocaleDateString()
                                : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ── Creator cell ─────────────────────────────────── */}
                      <td>
                        {c.creator ? (
                          <div className="d-flex align-items-center gap-2">
                            <Avatar
                              image={c.creator.image}
                              name={c.creator.name}
                              size={28}
                            />
                            <span style={{ fontSize: '0.8rem' }}>{c.creator.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td>
                        <span className={`badge-level ${c.level}`}>{c.level}</span>
                      </td>

                      <td style={{ fontSize: '0.875rem' }}>
                        {c.fee > 0 ? (
                          `₦${c.fee.toLocaleString()}`
                        ) : (
                          <span className="text-success fw-600">Free</span>
                        )}
                      </td>

                      <td style={{ fontSize: '0.875rem' }}>
                        {c.enrolled_count ?? 0}
                      </td>

                      <td>
                        <StatusBadge status={c.status} />
                      </td>

                      {/* ── Actions cell ─────────────────────────────────── */}
                      <td>
                        <div className="d-flex gap-1 flex-nowrap">
                          {c.status === 'pending' && (
                            <button
                              className="btn btn-sm btn-success btn-icon-start"
                              onClick={() => {
                                setApprovalModal({ course: c, show: true });
                                setRejectionReason('');
                              }}
                            >
                              <i className="bi bi-check-circle" /> Review
                            </button>
                          )}

                          <Link
                            to={`/admin/courses/${c.id}/edit`}
                            className="btn btn-sm btn-outline-primary"
                            title="Edit course"
                          >
                            <i className="bi bi-pencil" />
                          </Link>

                          <Link
                            to={`/admin/courses/${c.id}/revenue`}
                            className="btn btn-sm btn-outline-warning"
                            title="Configure revenue split"
                          >
                            <i className="bi bi-percent" />
                          </Link>

                          <Link
                            to={`/courses/${c.slug}`}
                            className="btn btn-sm btn-outline-secondary"
                            title="Preview"
                          >
                            <i className="bi bi-eye" />
                          </Link>

                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(c)}
                            title="Delete"
                          >
                            <i className="bi bi-trash" />
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
            page={page}
            pages={pages}
            onPageChange={setPage}
            ariaLabel="Course pages"
          />
        </>
      )}

      {/* ── Approval / Rejection Modal ───────────────────────────────────── */}
      <Modal
        show={approvalModal.show}
        onClose={closeModal}
        title="Review Course"
        size="lg"
        footer={
          <div className="d-flex gap-2 ms-auto">
            <button className="btn btn-outline-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              disabled={processing}
              onClick={() => handleApprove(false)}
            >
              {processing
                ? <span className="spinner-border spinner-border-sm me-1" />
                : <i className="bi bi-x-circle me-1" />}
              Reject
            </button>
            <button
              className="btn btn-success"
              disabled={processing}
              onClick={() => handleApprove(true)}
            >
              {processing
                ? <span className="spinner-border spinner-border-sm me-1" />
                : <i className="bi bi-check-circle me-1" />}
              Approve &amp; Publish
            </button>
          </div>
        }
      >
        {approvalModal.course && (
          <div>
            <div className="d-flex align-items-start gap-3 mb-4">
              {/*
               * ✅ FIX: was  src={`/uploads/courses/thumbnails/${thumbnail}`}
               *    which produced a double-URL when thumbnail is already absolute.
               *    ModalThumbnail delegates to resolveImage internally.
               */}
              <ModalThumbnail thumbnail={approvalModal.course.thumbnail} />

              <div>
                <h5 className="fw-700 mb-1">{approvalModal.course.title}</h5>
                <p className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>
                  {approvalModal.course.short_description}
                </p>
                <div className="d-flex gap-2 flex-wrap">
                  <span className={`badge-level ${approvalModal.course.level}`}>
                    {approvalModal.course.level}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {approvalModal.course.lessons_count} lessons
                  </span>
                  {approvalModal.course.fee > 0 ? (
                    <span className="fw-600 text-primary" style={{ fontSize: '0.8rem' }}>
                      ₦{approvalModal.course.fee.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-success" style={{ fontSize: '0.8rem' }}>Free</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="form-label fw-600">
                Rejection Reason (required if rejecting)
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Provide clear feedback for the creator…"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
