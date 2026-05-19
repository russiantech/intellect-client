// types/index.ts
/**
 * Intellect LMS — Complete Type Definitions
 * Updated for slug-based paths, full course stats, and admin-editable fields.
 */

/* ═══════════════════════════════════════════════════════════════════
   CORE USER TYPES
   ═══════════════════════════════════════════════════════════════════ */

export type UserRole = 'super_admin' | 'admin' | 'tutor' | 'student' | 'creator' | 'partner';

export interface User {
  id: number;
  name?: string;
  username: string;
  email: string;
  phone?: string;
  image?: string;
  title?: string;
  gender?: string;
  city?: string;
  country?: string;
  lang?: string;
  about?: string;
  socials?: Record<string, string>;
  education?: string;
  expertise?: string;
  is_creator: boolean;
  creator_bio?: string;
  creator_approved: boolean;
  email_verified: boolean;
  is_online: boolean;
  last_seen?: string;
  roles: string[];
  primary_role: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  is_active: boolean;
  created_at?: string;
  projects?: {};
}

export interface AuthState {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
}

export type CourseStatus = 'draft' | 'pending' | 'published' | 'unpublished' | 'rejected';
export type CourseLevel = 'novice' | 'beginner' | 'intermediate' | 'professional' | 'expert' | 'advanced';
export type PaymentType = 'one_time' | 'subscription' | 'pay_as_you_go' | 'free';
export type ContentType = 'video' | 'pdf' | 'image' | 'ppt' | 'doc' | 'audio' | 'text' | 'quiz' | 'link';
export type AssessmentType = 'classwork' | 'homework' | 'exam' | 'quiz' | 'quick_check';
export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'essay' | 'file_upload';

/* ═══════════════════════════════════════════════════════════════════
   COURSE TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface Category {
  id: number;
  title: string;
  slug?: string;
  image?: string;
  icon?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface TopicContent {
  id: number;
  title?: string;
  content_type: ContentType;
  file_path?: string;
  url?: string;
  body?: string;
  duration_seconds?: number;
  order_index: number;
}

export interface Topic {
  id: number;
  title: string;
  description?: string;
  order_index: number;
  slug?: string;
  duration_minutes?: number;
  is_free_preview: boolean;
  contents?: TopicContent[];
  contents_count?: number;
  content_type?: string;
  course_id?: number;
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  order_index: number;
  slug?: string;
  topics: Topic[];
}
/*
export interface Course {
  id: number;
  title: string;
  slug?: string;
  description?: string;
  short_description?: string;
  thumbnail?: string;
  preview_video?: string;
  fee: number;
  payment_type: PaymentType;
  subscription_interval?: string;
  subscription_installments?: number;
  lang: string;
  duration_weeks?: number;
  level: CourseLevel;
  category_id: number | null;
  status: CourseStatus;
  views: number;
  featured: boolean;
  requirements?: string;
  what_you_learn?: string;
  creator_pct?: number;
  platform_pct?: number;
  creator_id?: number;
  creator?: Partial<User>;
  categories: Category[];
  tags: Tag[];
  lessons: Lesson[];
  lessons_count: number;
  topics_count: number;
  enrolled_count: number;
  avg_rating?: number;
  is_enrolled: boolean;
  progress_pct: number;
  tutors?: Partial<User>[];
  rejection_reason?: string;
  approved_at?: string;
  created_at?: string;
}
*/
export interface Course {
  id: number;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  thumbnail?: string;
  preview_video?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | string;
  lang?: string;
  fee: number;
  payment_type: 'free' | 'one_time' | 'subscription' | 'pay_as_you_go';
  subscription_interval?: string;
  access_period_days?: number;
  status: string;
  featured?: boolean;
  is_enrolled?: boolean;
  progress_pct?: number;
  lessons_count?: number;
  topics_count?: number;
  duration_weeks?: number;
  enrolled_count?: number;
  avg_rating?: number;
  categories?: Category[];
  creator?: Creator;
  tutors?: Creator[];
  lessons?: Lesson[];
  what_you_learn?: string;
  requirements?: string;
  throttle_enabled?: boolean;
  weekly_topic_limit?: number;
  monthly_topic_limit?: number;
  instructor_led_fee?: number;
  // Payment options from API
  available_payment_types?: PaymentTypeOption[];

  created_at?: string;}

export interface PaymentTypeOption {
  payment_type: string;
  fee: number;
  subscription_interval?: string;
  access_period_days?: number;
}

/* ═══════════════════════════════════════════════════════════════════
   LEARNING PATH TYPES (Complete — all admin-editable fields)
   ═══════════════════════════════════════════════════════════════════ */

export interface PathCourse extends Course {
  // Extended course info when nested inside a path
  is_enrolled?: boolean;
  path_order?: number;
}

// export interface LearningPath {
//   id: number;
//   title: string;
//   slug?: string;
//   description?: string;
//   thumbnail?: string;
//   fee: number;
//   payment_type: PaymentType;
//   status: string;
//   courses: Partial<Course>[];
//   courses_count: number;
//   is_enrolled?: boolean;
//   progress_pct?: number;
//   created_at?: string;
// 
  // instructor_led_only?: boolean;
// }

// v2
/*
export interface LearningPath {
  id: number;
  title: string;
  description?: string;
  fee: number;
  payment_type: 'free' | 'one_time' | 'subscription';
  status: string;
  slug: string;
  thumbnail?: string;
  courses_count: number;
  course_ids?: number[];      // ← ADD THIS
  courses?: Course[];         // populated in detail view
  issues_certificate: boolean;
  is_enrolled?: boolean;
}
*/

// v3
export interface LearningPath {
  id: number;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  fee: number;
  payment_type: 'free' | 'one_time' | 'subscription' | 'pay_as_you_go';
  status: string;
  featured?: boolean;
  is_active?: boolean;
  is_deleted?: boolean;
  issues_certificate?: boolean;
  is_enrolled?: boolean;
  progress_pct?: number;

  // Aggregated stats (computed from courses)
  courses_count?: number;
  lessons_count?: number;
  topics_count?: number;
  duration_weeks?: number;

  // Enrollment / social stats
  enrolled_count?: number;
  avg_rating?: number;

  // Creator info
  created_by_id?: number;
  creator?: Creator;

  // Nested courses
  courses?: PathCourse[];
  course_ids?: number[];

  // Payment options (from API)
  available_payment_types?: PaymentTypeOption[];

  // Instructor-led option
  instructor_led_fee?: number;

  // Content
  what_you_achieve?: string;

  // Admin-editable payment configuration
  subscription_enabled?: boolean;
  subscription_interval?: string;
  subscription_fee?: number;
  pay_as_you_go_enabled?: boolean;
  pay_as_you_go_fee?: number;
  access_period_days?: number;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   ENROLLMENT TYPES
   ═══════════════════════════════════════════════════════════════════ */
/*
export interface Enrollment {
  enrollment_id: number;
  course_id: number;
  status: string;
  progress_pct: number;
  completed_topics: number;
  completed_at?: string;
  course?: Partial<Course>;
}
*/
export interface Enrollment {
  enrollment_id: number;
  course_id: number;
  status: string;
  progress_pct: number;
  completed_topics: number;
  completed_at?: string;
  topics_accessed_this_week?: number;
  topics_accessed_this_month?: number;
  course?: Course;
}

export interface PathEnrollment {
  path_enrollment_id: number;
  path_id: number;
  status: string;
  progress_pct: number;
  completed_at?: string;
  path?: LearningPath;
}

/* ═══════════════════════════════════════════════════════════════════
   PAYMENT TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface PaymentInitiateRequest {
  course_id?: number;
  path_id?: number;
  payment_type: string;
  discount_code?: string;
  instructor_led?: boolean;
  callback_url?: string;
}

export interface PaymentVerifyResponse {
  status: string;
  paid: boolean;
  reference?: string;
  amount?: number;
  message?: string;
}

export interface DiscountValidation {
  valid: boolean;
  final_price: number;
  savings: number;
  message: string;
}

/* ═══════════════════════════════════════════════════════════════════
   PROGRESS TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface ProgressUpdate {
  topic_id: number;
  completed: boolean;
}

export interface ThrottleStatus {
  throttle_enabled: boolean;
  weekly_limit?: number;
  monthly_limit?: number;
  topics_this_week: number;
  topics_this_month: number;
  can_access: boolean;
  reason?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN / FORM TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface PathCreatePayload {
  title: string;
  description?: string;
  fee: number;
  payment_type: string;
  course_ids?: number[];
  issues_certificate?: boolean;
  duration_weeks?: number;
  instructor_led_fee?: number;
  subscription_enabled?: boolean;
  subscription_interval?: string;
  subscription_fee?: number;
  pay_as_you_go_enabled?: boolean;
  pay_as_you_go_fee?: number;
  access_period_days?: number;
  installment_count?: number;
  installment_fee?: number;
  what_you_achieve?: string;

  instructor_led_only?: boolean;
}

export interface PathUpdatePayload {
  title?: string;
  description?: string;
  fee?: number;
  payment_type?: string;
  course_ids?: number[];
  issues_certificate?: boolean;
  duration_weeks?: number;
  instructor_led_fee?: number;
  subscription_enabled?: boolean;
  subscription_interval?: string;
  subscription_fee?: number;
  pay_as_you_go_enabled?: boolean;
  pay_as_you_go_fee?: number;
  access_period_days?: number;
  what_you_achieve?: string;
  status?: string;
  is_active?: boolean;

  instructor_led_only?: boolean;}

// 
export interface Question {
  id: number;
  body: string;
  question_type: QuestionType;
  options?: string[];
  marks: number;
  order_index: number;
  correct_answer?: string;
  explanation?: string;
}

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  assessment_type: AssessmentType;
  total_marks: number;
  pass_mark: number;
  time_limit_minutes?: number;
  due_date?: string;
  is_auto_graded: boolean;
  show_answers_after: boolean;
  attempts_allowed: number;
  shuffle_questions: boolean;
  questions_count: number;
  questions: Question[];
  course_id?: number;
  topic_id?: number;
  created_at?: string;
}

export interface AssessmentSubmission {
  id: number;
  status: string;
  score?: number;
  percentage?: number;
  passed?: boolean;
  ai_feedback?: string;
  tutor_feedback?: string;
  attempt_number: number;
  submitted_at?: string;
  graded_at?: string;
  assessment?: Partial<Assessment>;
  answers?: SubmissionAnswer[];
}

export interface SubmissionAnswer {
  question_id: number;
  question_body?: string;
  response?: string;
  score?: number;
  is_correct?: boolean;
  correct_answer?: string;
  explanation?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   CERTIFICATE TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface Certificate {
  id: number;
  cert_number: string;
  cert_url?: string;
  status: string;
  issued_at: string;
  course?: Partial<Course>;
  path_id?: number;
}


// 
// ─── Append these additions to the bottom of src/types/index.ts ───────────

// ─── Quiz (topic-level interactive) ──────────────────────────────────────────

export type QuizQuestionType =
  | 'mcq'
  | 'multi_select'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'fill_blank';

export interface QuizQuestion {
  id:             number;
  question_text:  string;
  question_type:  QuizQuestionType;
  options?:       string[];           // MCQ / multi_select choices
  correct_answer?: string;            // only visible to creator / admin
  explanation?:   string;             // only shown after attempt
  points:         number;
  order_index:    number;
}

export interface Quiz {
  id:                      number;
  title:                   string;
  instructions?:           string;
  pass_score:              number;    // percentage
  max_attempts:            number;    // 0 = unlimited
  shuffle_questions:       boolean;
  show_correct_after:      boolean;
  required_for_completion: boolean;
  is_active:               boolean;
  topic_id:                number;
  questions:               QuizQuestion[];
  questions_count:         number;
  attempt_count?:          number;    // current user's attempts so far
  attempts_remaining?:     number;    // -1 = unlimited
}

export interface QuizResultItem {
  question_id:    number;
  response:       string;
  is_correct:     boolean | null;  // null for essay/short-answer awaiting grading
  points_earned:  number | null;
  correct_answer?: string;
  explanation?:   string;
}

export interface QuizAttempt {
  id:             number;
  quiz_id:        number;
  user_id:        number;
  answers:        Record<string, string>;
  score:          number | null;
  max_score:      number | null;
  pct:            number | null;
  passed:         boolean | null;
  status:         'submitted' | 'ai_graded' | 'tutor_graded';
  result_detail:  QuizResultItem[];
  ai_feedback?:   string;
  tutor_feedback?: string;
  attempt_number: number;
  submitted_at?:  string;
  graded_at?:     string;
}

// ─── Project Submission (course-end) ────────────────────────────────────────

export type ProjectStatus =
  | 'submitted'
  | 'under_review'
  | 'ai_graded'
  | 'revision_requested'
  | 'graded';

export interface ProjectSubmission {
  id:             number;
  course_id:      number;
  lesson_id?:     number;
  user_id:        number;
  title:          string;
  description?:   string;
  external_url?:  string;
  file_path?:     string;
  status:         ProjectStatus;
  score?:         number;
  max_score:      number;
  ai_feedback?:   string;
  tutor_feedback?: string;
  graded_at?:     string;
  created_at?:    string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id:          number;
  schedule_id: number;
  user_id:     number;
  present:     boolean;
  note?:       string;
  created_at?: string;
}


export interface Payment {
  id: number;
  tx_ref?: string;
  tx_id?: string;
  amount: number;
  currency: string;
  tx_status: string;
  provider?: string;
  payment_type: string;
  course_id?: number;
  path_id?: number;
  created_at?: string;
}

export interface Discount {
  id: number;
  code: string;
  description?: string;
  discount_type: string;
  value: number;
  max_uses?: number;
  used_count: number;
  valid_from?: string;
  valid_until?: string;
  applies_to: string;
  course_id?: number;
}

export interface Notification {
  id: number;
  title: string;
  body?: string;
  notification_type: string;
  is_read: boolean;
  link?: string;
  created_at?: string;
}

export interface Message {
  id: number;
  body: string;
  is_seen: boolean;
  sender_id: number;
  recipient_id: number;
  mine: boolean;
  created_at?: string;
}

export interface Schedule {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  meeting_link?: string;
  is_recurring: boolean;
  course_id?: number;
  tutor_id?: number;
  tutor?: Partial<User>;
}

export interface Partnership {
  id: number;
  org_name: string;
  org_email: string;
  org_phone?: string;
  org_logo?: string;
  contact_person?: string;
  status: string;
  price_per_student: number;
  max_students?: number;
  active_students: number;
  contract_start?: string;
  contract_end?: string;
  courses: Partial<Course>[];
  student_count: number;
  created_at?: string;
}

export interface TeamRequest {
  id: number;
  requested_role: string;
  motivation?: string;
  portfolio_url?: string;
  status: string;
  user?: Partial<User>;
  rejection_reason?: string;
  created_at?: string;
}

export interface AdminDashboardStats {
  total_users: number;
  total_students: number;
  total_tutors: number;
  total_creators: number;
  total_courses: number;
  published_courses: number;
  pending_approval: number;
  total_enrollments: number;
  total_revenue: number;
  this_month_revenue: number;
  active_partnerships: number;
  pending_team_requests: number;
  enrollment_trend: { date: string; enrollments: number }[];
}

export interface CreatorAnalytics {
  total_courses: number;
  total_enrollments: number;
  total_earnings: number;
  pending_earnings: number;
  this_month_earnings: number;
  top_courses: any[];
  enrollment_trend: { date: string; enrollments: number }[];
}

export interface Creator {
  id: number;
  name: string;
  image?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
}