import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import { ThemeProvider } from '@/context/ThemeContext';
import { CREATOR_PERMISSIONS, ADMIN_PERMISSIONS } from './pages/shared/courses/Courseeditorpermissions';

// ── Lazy Pages ─────────────────────────────────

// Auth
const Signin       = lazy(() => import('@/pages/auth/Signin'));
const Signup       = lazy(() => import('@/pages/auth/Signup'));
const VerifySignup  = lazy(() => import('@/pages/auth/VerifySignup'));
const ForgotPassword    = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword     = lazy(() => import('@/pages/auth/ResetPassword'));

// Public / Shared
const Home         = lazy(() => import('@/pages/shared/Home'));
const Explore      = lazy(() => import('@/pages/courses/Explore'));
const CourseDetail = lazy(() => import('@/pages/courses/CourseDetail'));
const PathsPage    = lazy(() => import('@/pages/paths/PathsPage'));
const PathDetail   = lazy(() => import('@/pages/paths/PathDetail'));

// const InstructorsPage = lazy(() => import('@/pages/shared/Instructors'));
const InstructorsPage = lazy(() => import('@/pages/public/Instructors'));
const InstructorsProfile = lazy(() => import('@/pages/public/InstructorProfile'));

const AboutPage    = lazy(() => import('@/pages/shared/About'));

const CourseEditor  = lazy(() => import('@/pages/shared/courses/CourseEditor')); // Used by both Admin and Creator

// Learning
const LearnPage    = lazy(() => import('@/pages/learning/LearnPage'));

// Dashboard
const StudentDash  = lazy(() => import('@/pages/student/Dashboard'));
const TutorDash    = lazy(() => import('@/pages/tutor/Dashboard'));
const CreatorDash  = lazy(() => import('@/pages/creator/Dashboard'));
const AdminDash    = lazy(() => import('@/pages/admin/Dashboard'));
const PartnerDash  = lazy(() => import('@/pages/partnership/PartnerDashboard'));

// Profile
const Profile      = lazy(() => import('@/pages/shared/user/Profile'));
const ProfileEdit      = lazy(() => import('@/pages/shared/user/ProfileEdit'));

// Admin
const AdminCourses    = lazy(() => import('@/pages/admin/AdminCourses'));
// const AdminCourseEditor = lazy(() => import('@/pages/admin/AdminCourseEditor'));
const AdminUsers      = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminEnrollmentsPage = lazy(() => import('@/pages/admin/AdminEnrollmentsPage'));
const AdminTeamRequests = lazy(() => import('@/pages/admin/AdminTeamRequests'));
const AdminBroadcast  = lazy(() => import('@/pages/admin/AdminBroadcast'));
const AdminPathsPage      = lazy(() => import('@/pages/admin/AdminPathsPage'));
const AdminSchedulesPage  = lazy(() => import('@/pages/admin/AdminSchedulesPage'));
const AdminPartnership = lazy(() => import('@/pages/admin/AdminPartnership'));
const AdminDiscounts  = lazy(() => import('@/pages/admin/AdminDiscounts'));
const AdminCertificates = lazy(() => import('@/pages/admin/AdminCertificates'));
const AdminSettings   = lazy(() => import('@/pages/admin/AdminSettings'));
const CourseRevenueConfig = lazy(() => import('@/pages/admin/CourseRevenueConfig'));

// Creator
const CreatorCourses  = lazy(() => import('@/pages/creator/CreatorCourses'));
// const CourseEditor    = lazy(() => import('@/pages/creator/CourseEditor'));
const CreatorStudents = lazy(() => import('@/pages/creator/CreatorStudents'));
const CreatorEarnings = lazy(() => import('@/pages/creator/CreatorEarnings'));

// Tutor
const TutorCourses    = lazy(() => import('@/pages/tutor/TutorCourses'));
const TutorAssessments = lazy(() => import('@/pages/tutor/TutorAssessments'));
const TutorStudents   = lazy(() => import('@/pages/tutor/TutorStudents'));
const MarkAttendance  = lazy(() => import('@/pages/tutor/MarkAttendance'));
const TutorSchedules  = lazy(() => import('@/pages/tutor/TutorSchedules'));

// Student
const MyCourses    = lazy(() => import('@/pages/student/MyCourses'));
const MyCerts      = lazy(() => import('@/pages/student/MyCertificates'));
const MyAssessments = lazy(() => import('@/pages/student/MyAssessments'));
const TakeAssessment = lazy(() => import('@/pages/student/TakeAssessment'));

// Payment
const PaymentCallback = lazy(() => import('@/pages/shared/PaymentCallback'));
const MessagesPage = lazy(() => import('@/pages/shared/MessagesPage'));
const SearchResults = lazy(() => import('@/pages/shared/SearchResults'));

// Errors
const NotFound     = lazy(() => import('@/pages/errors/NotFound'));

// ── Fallback ────────────────────────────────────
function Loader() {
  return (
    <div className="preloader">
      <div className="preloader-logo">
        <img src="/assets/images/logos/favicon.ico" alt="Intellect Logo" style={{width: '50px', height: '50px'}} />
        Intellect
        </div>
    </div>
  );
}

// ── Guards ──────────────────────────────────────
function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  if (roles && user && !roles.some(r => user.roles.includes(r) || user.primary_role === r)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function PublicRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <Loader />;
  if (isAuthenticated && user) {
    const role = user.primary_role;
    const dest = role === 'admin' || role === 'super_admin' ? '/admin'
      : role === 'tutor' ? '/tutor'
      : role === 'creator' ? '/creator'
      : role === 'partner' ? '/partner'
      : '/dashboard';
    return <Navigate to={dest} replace />;
  }
  return children;
}

// ── App ─────────────────────────────────────────
// export default function App() {
//   return (
//     <ThemeProvider>
//       <AuthProvider>
//       <BrowserRouter>
//         <Suspense fallback={<Loader />}>
//           <Routes>

//             {/* Public Auth */}
//             <Route path="/auth/signin" element={<PublicRoute><Signin /></PublicRoute>} />
//             <Route path="/auth/signup" element={<PublicRoute><Signup /></PublicRoute>} />
//             <Route path="/auth/verify-signup" element={<VerifySignup />} />
//             <Route path="/auth/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
//             <Route path="/auth/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

//             {/* App shell with nav + sidebar */}
//             <Route element={<Layout />}>
//               {/* Public */}
//               <Route path="/" element={<Home />} />
//               <Route path="/explore" element={<Explore />} />
//               <Route path="/courses/:slug" element={<CourseDetail />} />
//               <Route path="/paths" element={<PathsPage />} />
//               {/* <Route path="/paths/:id" element={<PathDetail />} /> */}
//               <Route path="/paths/:slug" element={<PathDetail />} />
//               <Route path="/about" element={<AboutPage />} />
//               <Route path="/search" element={<SearchResults />} />

//               {/* Instructors */}
//               <Route path="/instructors" element={<InstructorsPage />} />
//               <Route path="/instructors/:username" element={<InstructorsProfile />} />

//               {/* Payment callback */}
//               <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
//               <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
//               <Route path="/messages/:partnerId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

//               {/* Learning player */}
//               <Route path="/learn/:slug" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />

//               {/* Student */}
//               <Route path="/dashboard" element={<ProtectedRoute><StudentDash /></ProtectedRoute>} />
//               <Route path="/my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
//               <Route path="/my-certificates" element={<ProtectedRoute><MyCerts /></ProtectedRoute>} />
//               <Route path="/my-assessments" element={<ProtectedRoute><MyAssessments /></ProtectedRoute>} />
//               <Route path="/my-assessments/:assessmentId/take" element={<ProtectedRoute><TakeAssessment /></ProtectedRoute>} />
              
//               <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
//               <Route path="/profile/edit" element={<ProfileEdit />} />
//               <Route path="/profile/:username" element={<Profile />} />

//               {/* Tutor */}
//               <Route path="/tutor" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorDash /></ProtectedRoute>} />
//               <Route path="/tutor/courses" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorCourses /></ProtectedRoute>} />
//               <Route path="/tutor/assessments" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorAssessments /></ProtectedRoute>} />
//               <Route path="/tutor/students" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorStudents /></ProtectedRoute>} />
//               <Route path="/tutor/schedules" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorSchedules /></ProtectedRoute>} />
//               <Route path="/tutor/schedules/:scheduleId/attendance" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><MarkAttendance /></ProtectedRoute>} />

//               {/* Creator Routes */}
//               <Route path="/creator" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CreatorDash /></ProtectedRoute>} />
//               <Route path="/creator/courses" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CreatorCourses /></ProtectedRoute>} />
//               {/*
//               Creators see no delete button, no status/featured controls,
//               and reach the "Submit for Review" flow in the Publish step.
//               ─────────────────────────────────────────────────────────── */}
//               <Route
//                 path="/creator/courses/new"
//                 element={
//                   <ProtectedRoute roles={['creator', 'admin', 'super_admin']}>
//                     <CourseEditor permissions={CREATOR_PERMISSIONS} />
//                   </ProtectedRoute>
//                 }
//               />
//               <Route
//                 path="/creator/courses/:id/edit"
//                 element={
//                   <ProtectedRoute roles={['creator', 'admin', 'super_admin']}>
//                     <CourseEditor permissions={CREATOR_PERMISSIONS} />
//                   </ProtectedRoute>
//                 }
//               />
//               <Route path="/creator/students" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CreatorStudents /></ProtectedRoute>} />
//               <Route path="/creator/earnings" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CreatorEarnings /></ProtectedRoute>} />

//               {/* Admin */}
//               <Route path="/admin" element={<ProtectedRoute roles={['admin','super_admin']}><AdminDash /></ProtectedRoute>} />

//               <Route path="/admin/courses" element={<ProtectedRoute roles={['admin','super_admin']}><AdminCourses /></ProtectedRoute>} />
//               {/* <Route path="/admin/courses/new" element={<ProtectedRoute roles={['admin','super_admin']}><AdminCourseEditor /></ProtectedRoute>} />
//               <Route path="/admin/courses/:id/edit" element={<ProtectedRoute roles={['admin','super_admin']}><AdminCourseEditor /></ProtectedRoute>} /> */}

//               <Route path="/admin/users" element={<ProtectedRoute roles={['admin','super_admin']}><AdminUsers /></ProtectedRoute>} />
//               <Route path="/admin/enrollments" element={<ProtectedRoute roles={['admin','super_admin']}><AdminEnrollmentsPage /></ProtectedRoute>} />
//               <Route path="/admin/team-requests" element={<ProtectedRoute roles={['admin','super_admin']}><AdminTeamRequests /></ProtectedRoute>} />
//               <Route path="/admin/broadcast" element={<ProtectedRoute roles={['admin','super_admin']}><AdminBroadcast /></ProtectedRoute>} />
//               <Route path="/admin/paths" element={<ProtectedRoute roles={['admin','super_admin']}><AdminPathsPage /></ProtectedRoute>} />
//               <Route path="/admin/schedules" element={<ProtectedRoute roles={['admin','super_admin']}><AdminSchedulesPage /></ProtectedRoute>} />
//               <Route path="/admin/partnerships" element={<ProtectedRoute roles={['admin','super_admin']}><AdminPartnership /></ProtectedRoute>} />
//               <Route path="/admin/discounts" element={<ProtectedRoute roles={['admin','super_admin']}><AdminDiscounts /></ProtectedRoute>} />
//               <Route path="/admin/certificates" element={<ProtectedRoute roles={['admin','super_admin']}><AdminCertificates /></ProtectedRoute>} />
//               <Route path="/admin/settings" element={<ProtectedRoute roles={['admin','super_admin']}><AdminSettings /></ProtectedRoute>} />
//               <Route path="/admin/courses/:courseId/revenue" element={<ProtectedRoute roles={['admin','super_admin']}><CourseRevenueConfig /></ProtectedRoute>} />
                
//                {/* 
//                Admins get status editing, featured toggle, direct publish,
//                 unpublish, and hard-delete on the Publish step.
//                 ─────────────────────────────────────────────────────────── */}
//               <Route
//                 path="/admin/courses/new"
//                 element={
//                   <ProtectedRoute roles={['admin', 'super_admin']}>
//                     <CourseEditor permissions={ADMIN_PERMISSIONS} />
//                   </ProtectedRoute>
//                 }
//               />
//               <Route
//                 path="/admin/courses/:id/edit"
//                 element={
//                   <ProtectedRoute roles={['admin', 'super_admin']}>
//                     <CourseEditor permissions={ADMIN_PERMISSIONS} />
//                   </ProtectedRoute>
//                 }
//               />

//               {/* Partner */}
//               <Route path="/partner" element={<ProtectedRoute roles={['partner','admin','super_admin']}><PartnerDash /></ProtectedRoute>} />
//             </Route>

//             <Route path="*" element={<NotFound />} />
//           </Routes>
//         </Suspense>
//         <Toaster
//           position="top-right"
//           toastOptions={{
//             duration: 4000,
//             style: { background: '#363636', color: '#fff', borderRadius: '8px', fontSize: '14px' },
//             success: { style: { background: '#065f46', color: '#fff' } },
//             error: { style: { background: '#991b1b', color: '#fff' } },
//           }}
//         />
//       </BrowserRouter>
//     </AuthProvider>
//     </ThemeProvider>
//   );
// }


// v2
// ── App ─────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loader />}>
            <Routes>

              {/* Public Auth */}
              <Route path="/auth/signin" element={<PublicRoute><Signin /></PublicRoute>} />
              <Route path="/auth/signup" element={<PublicRoute><Signup /></PublicRoute>} />
              <Route path="/auth/verify-signup" element={<VerifySignup />} />
              <Route path="/auth/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/auth/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

              {/* App shell */}
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/courses/:slug" element={<CourseDetail />} />
                <Route path="/paths" element={<PathsPage />} />
                <Route path="/paths/:slug" element={<PathDetail />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/instructors" element={<InstructorsPage />} />
                <Route path="/instructors/:username" element={<InstructorsProfile />} />
                <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                <Route path="/messages/:partnerId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                <Route path="/learn/:slug" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><StudentDash /></ProtectedRoute>} />
                <Route path="/my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
                <Route path="/my-certificates" element={<ProtectedRoute><MyCerts /></ProtectedRoute>} />
                <Route path="/my-assessments" element={<ProtectedRoute><MyAssessments /></ProtectedRoute>} />
                <Route path="/my-assessments/:assessmentId/take" element={<ProtectedRoute><TakeAssessment /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProfileEdit />} />
                <Route path="/profile/:username" element={<Profile />} />

                {/* Tutor */}
                <Route path="/tutor" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorDash /></ProtectedRoute>} />
                <Route path="/tutor/courses" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorCourses /></ProtectedRoute>} />
                <Route path="/tutor/assessments" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorAssessments /></ProtectedRoute>} />
                <Route path="/tutor/students" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorStudents /></ProtectedRoute>} />
                <Route path="/tutor/schedules" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><TutorSchedules /></ProtectedRoute>} />
                <Route path="/tutor/schedules/:scheduleId/attendance" element={<ProtectedRoute roles={['tutor','admin','super_admin']}><MarkAttendance /></ProtectedRoute>} />

                {/* Creator */}
                <Route path="/creator" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CreatorDash /></ProtectedRoute>} />
                <Route path="/creator/courses" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CreatorCourses /></ProtectedRoute>} />
                <Route path="/creator/courses/new" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CourseEditor permissions={CREATOR_PERMISSIONS} /></ProtectedRoute>} />
                <Route path="/creator/courses/:id/edit" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CourseEditor permissions={CREATOR_PERMISSIONS} /></ProtectedRoute>} />
                <Route path="/creator/students" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CreatorStudents /></ProtectedRoute>} />
                <Route path="/creator/earnings" element={<ProtectedRoute roles={['creator','admin','super_admin']}><CreatorEarnings /></ProtectedRoute>} />

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute roles={['admin','super_admin']}><AdminDash /></ProtectedRoute>} />
                <Route path="/admin/courses" element={<ProtectedRoute roles={['admin','super_admin']}><AdminCourses /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute roles={['admin','super_admin']}><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/enrollments" element={<ProtectedRoute roles={['admin','super_admin']}><AdminEnrollmentsPage /></ProtectedRoute>} />
                <Route path="/admin/team-requests" element={<ProtectedRoute roles={['admin','super_admin']}><AdminTeamRequests /></ProtectedRoute>} />
                <Route path="/admin/broadcast" element={<ProtectedRoute roles={['admin','super_admin']}><AdminBroadcast /></ProtectedRoute>} />
                <Route path="/admin/paths" element={<ProtectedRoute roles={['admin','super_admin']}><AdminPathsPage /></ProtectedRoute>} />
                <Route path="/admin/schedules" element={<ProtectedRoute roles={['admin','super_admin']}><AdminSchedulesPage /></ProtectedRoute>} />
                <Route path="/admin/partnerships" element={<ProtectedRoute roles={['admin','super_admin']}><AdminPartnership /></ProtectedRoute>} />
                <Route path="/admin/discounts" element={<ProtectedRoute roles={['admin','super_admin']}><AdminDiscounts /></ProtectedRoute>} />
                <Route path="/admin/certificates" element={<ProtectedRoute roles={['admin','super_admin']}><AdminCertificates /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute roles={['admin','super_admin']}><AdminSettings /></ProtectedRoute>} />
                <Route path="/admin/courses/:courseId/revenue" element={<ProtectedRoute roles={['admin','super_admin']}><CourseRevenueConfig /></ProtectedRoute>} />
                <Route path="/admin/courses/new" element={<ProtectedRoute roles={['admin','super_admin']}><CourseEditor permissions={ADMIN_PERMISSIONS} /></ProtectedRoute>} />
                <Route path="/admin/courses/:id/edit" element={<ProtectedRoute roles={['admin','super_admin']}><CourseEditor permissions={ADMIN_PERMISSIONS} /></ProtectedRoute>} />

                {/* Partner */}
                <Route path="/partner" element={<ProtectedRoute roles={['partner','admin','super_admin']}><PartnerDash /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#363636', color: '#fff', borderRadius: '8px', fontSize: '14px' },
              success: { style: { background: '#065f46', color: '#fff' } },
              error: { style: { background: '#991b1b', color: '#fff' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

