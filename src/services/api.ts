import axios, { AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Token injection
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const resp = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refresh}` },
          });
          const { access_token } = resp.data;
          localStorage.setItem('access_token', access_token);
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/auth/signin';
        }
      }
    }
    return Promise.reject(err);
  }
);

// ─── AUTH ─────────────────────────────────────────
export const authApi = {
  signup:             (data: any)          => api.post('/auth/signup', data),
  verifySignup: (data: any)                => api.post('/auth/signup/verify-signup', data),
  resendVerificationCode: (data: any)      => api.post('/auth/signup/resend', data),
  signin:             (data: any)          => api.post('/auth/signin', data),
  signout:            ()                   => api.post('/auth/signout'),
  // verifyEmail:        (token: string)   => api.post('/auth/verify-email', { token }),

  forgotPassword:     (email: string)      => api.post('/auth/forgot-password', { email }),
  // resetPassword:      (data: any)          => api.post('/auth/reset-password', data),
  // v2
  // forgotPassword: (data: { email: string }) => api.post('/auth/forgot-password', data),

  resetPassword: (data: { token: string; email_code: string; new_password: string }) =>
    api.post('/auth/reset-password', data),

  resendResetCode: (data: { token: string }) =>
    api.post('/auth/forgot-password/resend', data),

  changePassword:     (data: any)          => api.post('/auth/change-password', data),
  refreshToken:       (token: string)      => api.post('/auth/refresh', {}, { headers: { Authorization: `Bearer ${token}` } }),
  // resendVerification: ()                => api.post('/auth/resend-verification'),
  // resendVerificationCode: ()            => api.post('/auth/resend'),
  me:                 ()                   => api.get('/auth/me'),
};

// ─── USERS ────────────────────────────────────────
export const usersApi = {
  getProfile:       () => api.get('/users/profile'),
  updateProfile:    (data: any) => api.put('/users/profile', data),
  uploadAvatar:     (file: File)                => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/users/profile/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getPublicProfile: (username: string)          => api.get(`/users/public/${username}`),
  listInstructors:  (params?: any)              => api.get('/users/instructors/', {params}),
  listUsers:        (params?: any)              => api.get('/users/', { params }),
  getUser:          (id: number)                => api.get(`/users/${id}`),
  adminUpdateUser:  (id: number, data: any)     => api.put(`/users/${id}/admin`, data),
  toggleActive:     (id: number)                => api.post(`/users/${id}/toggle-active`),
  assignRole:       (id: number, role: string)  => api.post(`/users/${id}/assign-role`, null, { params: { role_name: role } }),
  removeRole:       (id: number, role: string)  => api.delete(`/users/${id}/remove-role/${role}`),
};

// ─── COURSES ──────────────────────────────────────
export const coursesApi = {
  list:             (params?: any)              => api.get('/courses/', { params }),
  get:              (idOrSlug: string | number) => api.get(`/courses/${idOrSlug}`),
  create:           (data: any) => api.post('/courses/', data),
  update:           (id: number, data: any)    => api.put(`/courses/${id}`, data),
  delete:           (id: number)                => api.delete(`/courses/${id}`),
  submitForApproval:(id: number)                => api.post(`/courses/${id}/submit-for-approval`),
  approve:          (id: number, data: any)    => api.post(`/courses/${id}/approve`, data),
  uploadThumbnail:  (id: number, file: File)   => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/courses/${id}/upload-thumbnail`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadContent:    (courseId: number, topicId: number, file: File)     => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/courses/${courseId}/topics/${topicId}/upload-content`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getTopicContent:  (courseId: number, topicId: number) => api.get(`/courses/${courseId}/topics/${topicId}/content`),
  // Text content
  addTextContent:   (courseId: number, topicId: number, data: any)      =>
    api.post(`/courses/${courseId}/topics/${topicId}/content/text`, data),
  updateTextContent:(courseId: number, topicId: number, contentId: number, data: { title?: string; body?: string }) =>
    api.patch(`/courses/${courseId}/topics/${topicId}/content/${contentId}/text`, data),
  deleteContent:    (courseId: number, topicId: number, contentId: number) =>
    api.delete(`/courses/${courseId}/topics/${topicId}/content/${contentId}`),
  reorderContent:   (courseId: number, topicId: number, items: { id: number; order_index: number }[]) =>
    api.put(`/courses/${courseId}/topics/${topicId}/content/reorder`, items),
  // Lessons
  createLesson:           (courseId: number, data: any) => api.post(`/courses/${courseId}/lessons`, data),
  updateLesson:           (courseId: number, lessonId: number, data: any)   => api.put(`/courses/${courseId}/lessons/${lessonId}`, data),
  deleteLesson:           (courseId: number, lessonId: number)               => api.delete(`/courses/${courseId}/lessons/${lessonId}`),
  getLessonAssessments:   (courseId: number, lessonId: number)               => api.get(`/courses/${courseId}/lessons/${lessonId}/assessments`),
  // Topics
  createTopic:  (courseId: number, data: any)      => api.post(`/courses/${courseId}/topics`, data),
  updateTopic:  (courseId: number, topicId: number, data: any)              => api.put(`/courses/${courseId}/topics/${topicId}`, data),
  deleteTopic:  (courseId: number, topicId: number)=> api.delete(`/courses/${courseId}/topics/${topicId}`),
  // Feedback
  submitFeedback: (courseId: number, data: any)    => api.post(`/courses/${courseId}/feedback`, data),
  // Meta
  getCategories: () => api.get('/courses/meta/categories'),
  getTags:       () => api.get('/courses/meta/tags'),
};

// ─── ENROLLMENTS ─────────────────────────────────
export const enrollmentsApi = {
  enroll:           (courseId: number)  => api.post('/enrollments/enroll', { course_id: courseId }),
  enrollPath:       (pathId: number)    => api.post(`/enrollments/enroll-path/${pathId}`),
  myCourses:        ()                  => api.get('/enrollments/my-courses'),
  myPaths:          ()                  => api.get('/enrollments/my-paths'),
  markProgress:     (topicId: number, completed = true)          => api.post('/enrollments/progress', { topic_id: topicId, completed }),
  myCertificates:   ()                  => api.get('/enrollments/certificates'),
};

// ─── QUIZZES (topic-level interactive) ───────────
// Backend routes (prefix /quizzes):
//   GET  /topic/{topic_id}          – get quiz for a topic (student, no answers)
//   POST /{quiz_id}/attempt         – submit an attempt  ← FIX: was "/submit"
//   POST /topic/{topic_id}          – create quiz (creator)
//   PUT  /{quiz_id}                 – update quiz (creator)
//   DELETE /{quiz_id}               – delete quiz
//   POST /topic/{topic_id}/ai-generate – AI-generate questions
//   GET  /{quiz_id}/attempts        – list attempts (staff)
export const quizzesApi = {
  getForTopic:    (topicId: number) => api.get(`/quizzes/topic/${topicId}`),
  // FIX: endpoint is /{quiz_id}/attempt, not /{quiz_id}/submit
  submitAttempt:  (quizId: number, data: { answers: { question_id: number; response: string }[] }) =>
    api.post(`/quizzes/${quizId}/attempt`, data),
  create:         (topicId: number, data: any)              => api.post(`/quizzes/topic/${topicId}`, data),
  update:         (quizId: number, data: any)               => api.put(`/quizzes/${quizId}`, data),
  delete:         (quizId: number) => api.delete(`/quizzes/${quizId}`),
  aiGenerate:     (topicId: number, params?: { count?: number; question_types?: string }) =>
    api.post(`/quizzes/topic/${topicId}/ai-generate`, null, { params }),
  listAttempts:   (quizId: number) => api.get(`/quizzes/${quizId}/attempts`),
  getAttempt:     (attemptId: number)                       => api.get(`/quizzes/attempt/${attemptId}`),
  aiGradeAttempt: (attemptId: number)                       => api.post(`/quizzes/attempt/${attemptId}/ai-grade`),
};

// ─── PROJECTS (course-level) ─────────────────────
// Backend routes (prefix /projects):
//   GET  /course/{course_id}              – list briefs (creator uses this too)
//   POST /course/{course_id}              – create brief (creator/admin)
//   PUT  /{project_id}                    – update brief (creator/admin)
//   DELETE /{project_id}                  – soft-delete (creator/admin)
//   POST /{project_id}/submit             – submit (student, multipart)
//   GET  /submissions/my                  – student's own submissions
//   GET  /submissions/{id}                – detail
//   POST /submissions/{id}/ai-grade       – AI grade
//   POST /submissions/{id}/tutor-review   – tutor review
//   GET  /course/{course_id}/all-submissions – staff view all
//   GET  /submissions/{id}/download       – download file
export const projectsApi = {
  // Brief CRUD (creator/admin)
  listForCourse:  (courseId: number)           => api.get(`/projects/course/${courseId}`),
  create:         (courseId: number, data: any)    => api.post(`/projects/course/${courseId}`, data),
  update:         (projectId: number, data: any)   => api.put(`/projects/${projectId}`, data),
  delete:         (projectId: number)          => api.delete(`/projects/${projectId}`),

  // Student submission — POST /{project_id}/submit with FormData
  submit:         (projectId: number, formData: FormData)              =>
    api.post(`/projects/${projectId}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // FIX: was "MyAssessments" (wrong name, wrong endpoint). Backend: GET /projects/submissions/my
  mySubmissions:  (courseId?: number) => api.get('/projects/submissions/my', { params: { course_id: courseId } }),

  // Submission views
  getSubmission:       (submissionId: number)  => api.get(`/projects/submissions/${submissionId}`),
  allCourseSubmissions:(courseId: number, params?: any) => api.get(`/projects/course/${courseId}/all-submissions`, { params }),

  // Grading
  aiGrade:        (submissionId: number)       => api.post(`/projects/submissions/${submissionId}/ai-grade`),
  tutorReview:    (submissionId: number, data: any) => api.post(`/projects/submissions/${submissionId}/tutor-review`, data),

  // Download
  downloadUrl:    (submissionId: number)       => `${BASE_URL}/projects/submissions/${submissionId}/download`,
};

// ─── ATTENDANCE ──────────────────────────────────
export const attendanceApi = {
  generateCode:         (scheduleId: number)   => api.post(`/attendance/schedules/${scheduleId}/generate-code`),
  selfCheckIn:          (data: { schedule_id: number; check_in_code: string }) => api.post('/attendance/self-check-in', data),
  markAttendance:       (scheduleId: number, records: any[])            =>
    api.post(`/attendance/schedules/${scheduleId}/mark`, { schedule_id: scheduleId, records }),
  getScheduleAttendance:(scheduleId: number)   => api.get(`/attendance/schedules/${scheduleId}`),
  myAttendance:         (courseId: number)     => api.get('/attendance/my-attendance', { params: { course_id: courseId } }),
};

// ─── PATHS ────────────────────────────────────────
export const pathsApi = {
  list:       (params?: any)                   => api.get('/paths/', { params }),
  get:        (id: number)                     => api.get(`/paths/${id}`),
  create:     (data: any)  => api.post('/paths/', data),
  update:     (id: number, data: any)          => api.put(`/paths/${id}`, data),
  delete:     (id: number)                     => api.delete(`/paths/${id}`),
  addCourse:  (pathId: number, courseId: number) => api.post(`/paths/${pathId}/courses/${courseId}`),
  removeCourse:(pathId: number, courseId: number) => api.delete(`/paths/${pathId}/courses/${courseId}`),
};

// ─── ASSESSMENTS (Lesson-level) ───────────────────
/*
export const assessmentsApi = {
  list:          (courseId: number)            => api.get(`/assessments/course/${courseId}`),
  get:           (id: number)                  => api.get(`/assessments/${id}`),
  getForLesson: (courseId: number, lessonId: number) => api.get(`/assessments/course/${courseId}/lessons/${lessonId}`),
  create:        (data: any)                   => api.post('/assessments/', data),
  update:        (id: number, data: any)       => api.put(`/assessments/${id}`, data),
  delete:        (id: number)                  => api.delete(`/assessments/${id}`),
  submit:        (data: any)                   => api.post('/assessments/submit', data),
  mySubmissions: (courseId?: number)           => api.get('/assessments/submissions/my', { params: { course_id: courseId } }),
  getSubmission: (id: number)                  => api.get(`/assessments/submissions/${id}`),
  grade:         (data: any)                   => api.post('/assessments/grade', data),
  aiGrade:       (submissionId: number)        => api.post(`/assessments/submissions/${submissionId}/ai-grade`),
  aiGenerate:    (courseId: number, lessonId: number, params?: { count?: number; question_types?: string }) =>
    api.post(`/assessments/course/${courseId}/lessons/${lessonId}/ai-generate`, null, { params }),
  courseSubmissions: (courseId: number, type?: string) =>
    api.get(`/assessments/course/${courseId}/all-submissions`, { params: { assessment_type: type } }),
};
*/

export const assessmentsApi = {
  getForLesson: (lessonId: number) =>
    api.get(`/lesson-assessments/lesson/${lessonId}`),
 
  create: (payload: Record<string, unknown>) =>
    api.post('/lesson-assessments/', payload),
 
  update: (id: number, payload: Record<string, unknown>) =>
    api.put(`/lesson-assessments/${id}`, payload),
 
  delete: (id: number) =>
    api.delete(`/lesson-assessments/${id}`),
 
  aiGenerate: (id: number, params: { count: number; question_types: string }) =>
    api.post(`/lesson-assessments/${id}/ai-generate-questions`, null, { params }),
 
  get: (id: number) =>
    api.get(`/lesson-assessments/${id}`),

  mySubmissions: (courseId?: number, assessmentType?: string) =>
    api.get('/lesson-assessments/submissions/my', {
      params: { course_id: courseId, assessment_type: assessmentType },
    }),
};

// ─── PAYMENTS ────────────────────────────────────
export const paymentsApi = {

  initiate:        (data: any)        => api.post('/payments/initiate', data),
  verify:          (txRef: string)    => api.post('/payments/verify', { tx_ref: txRef }),
  history:         () => api.get('/payments/history'),
  validateDiscount:(data: any)        => api.post('/payments/discounts/validate', data),
  createDiscount:  (data: any)        => api.post('/payments/discounts', data),
  listDiscounts:   () => api.get('/payments/discounts'),
  deleteDiscount:  (id: number)       => api.delete(`/payments/discounts/${id}`),
  adminRevenue:    (params?: any)     => api.get('/payments/admin/revenue', { params }),
  listPlans:       (params?: any)     => api.get('/payments/plans', { params }),
  createPlan:      (data: any)        => api.post('/payments/plans', data),
  myPayments:      () => api.get('/payments/my-payments'),
};

// ─── ADMIN ────────────────────────────────────────
export const adminApi = {
  dashboard:          ()                       => api.get('/admin/dashboard'),
  getBrand:           ()                       => api.get('/admin/brand'),
  updateBrand:        (data: any)              => api.put('/admin/brand', data),
  createCategory:     (data: any)              => api.post('/admin/categories', data),
  updateCategory:     (id: number, data: any)  => api.put(`/admin/categories/${id}`, data),
  deleteCategory:     (id: number)             => api.delete(`/admin/categories/${id}`),
  createTag:          (data: any)              => api.post('/admin/tags', data),
  listTeamRequests:   (status?: string)        => api.get('/admin/team-requests', { params: { status } }),
  reviewTeamRequest:  (id: number, data: any)  => api.post(`/admin/team-requests/${id}/review`, data),
  sendInvite:         (data: any)              => api.post('/admin/invites', data),
  listInvites:        ()                       => api.get('/admin/invites'),
  sendBroadcast:      (data: any)              => api.post('/admin/broadcasts', data),
  listBroadcasts:     ()                       => api.get('/admin/broadcasts'),
  assignTutor:        (data: any)              => api.post('/admin/tutor-assignments', data),
  unassignTutor:      (id: number)             => api.delete(`/admin/tutor-assignments/${id}`),
  listTutorAssignments:(params?: any)          => api.get('/admin/tutor-assignments', { params }),
  createSchedule:     (data: any)              => api.post('/admin/schedules', data),
  listSchedules:      (courseId?: number)      => api.get('/admin/schedules', { params: { course_id: courseId } }),
  markAttendance:     (scheduleId: number, data: any) => api.post(`/admin/schedules/${scheduleId}/attendance`, data),
  enrollUser:         (userId: number, courseId: number) =>
    api.post('/admin/enroll-user', null, { params: { user_id: userId, course_id: courseId } }),
  listCertificates:   (params?: any)           => api.get('/admin/certificates', { params }),
};

// ─── CREATOR ─────────────────────────────────────
export const creatorApi = {
  requestRole: (data: any)            => api.post('/creator/request-creator', data),
  myRequests:  ()                     => api.get('/creator/my-requests'),
  myCourses:   (params?: any)         => api.get('/creator/my-courses', { params }),
  analytics:   ()                     => api.get('/creator/analytics'),
  students:    (courseId?: number)    => api.get('/creator/students', { params: { course_id: courseId } }),
  earnings:    ()                     => api.get('/creator/earnings'),
};

// ─── PARTNERSHIPS ────────────────────────────────
export const partnershipsApi = {
  list:         (params?: any)    => api.get('/partnerships/', { params }),
  get:          (id: number)      => api.get(`/partnerships/${id}`),
  create:       (data: any)       => api.post('/partnerships/', data),
  update:       (id: number, data: any)                    => api.put(`/partnerships/${id}`, data),
  activate:     (id: number)      => api.post(`/partnerships/${id}/activate`),
  suspend:      (id: number)      => api.post(`/partnerships/${id}/suspend`),
  enrollStudent:(partnershipId: number, email: string)     =>
    api.post(`/partnerships/${partnershipId}/enroll-student`, null, { params: { student_email: email } }),
  listStudents: (id: number)      => api.get(`/partnerships/${id}/students`),
};

// ─── MESSAGING ───────────────────────────────────
export const messagingApi = {
  sendMessage:     (data: any)     => api.post('/messages/', data),
  conversations:   ()              => api.get('/messages/conversations'),
  getConversation: (partnerId: number, params?: any)        => api.get(`/messages/${partnerId}`, { params }),
  deleteMessage:   (id: number)    => api.delete(`/messages/${id}`),
};

// ─── NOTIFICATIONS ───────────────────────────────
export const notificationsApi = {
  list:        (params?: any) => api.get('/notifications/', { params }),
  markRead:    (id: number)   => api.post(`/notifications/${id}/read`),
  markAllRead: ()             => api.post('/notifications/read-all'),
};

// ─── AI ──────────────────────────────────────────
export const aiApi = {
  chat: (data: any) => api.post('/ai/chat', data),
};

export default api;