// Intellect LMS — TypeScript Types

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
  active: boolean;
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
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  order_index: number;
  slug?: string;
  topics: Topic[];
}

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

export interface LearningPath {
  id: number;
  title: string;
  slug?: string;
  description?: string;
  thumbnail?: string;
  fee: number;
  payment_type: PaymentType;
  status: string;
  courses: Partial<Course>[];
  courses_count: number;
  is_enrolled?: boolean;
  progress_pct?: number;
  created_at?: string;
}

export interface Enrollment {
  enrollment_id: number;
  course_id: number;
  status: string;
  progress_pct: number;
  completed_topics: number;
  completed_at?: string;
  course?: Partial<Course>;
}

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
