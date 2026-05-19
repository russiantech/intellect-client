// pages/shared/courses/CourseEditor.tsx
// v3 — multi-payment-type configuration
//
// What changed vs v2
// ─────────────────────────────────────────────────────────────────────────
// 1. Pricing interface expanded — each billing model (free, one_time,
//    subscription, pay_as_you_go) has its own enabled toggle and fee field.
//    They are independent: turning on subscription does not clear one_time.
//
// 2. saveCourse sends ALL fee columns — fee, subscription_fee,
//    pay_as_you_go_fee, access_period_days, subscription_interval,
//    instructor_led_fee, throttle_enabled, weekly_topic_limit,
//    monthly_topic_limit — so the backend _build_payment_types helper
//    can return every configured option to students.
//
// 3. payment_type is derived automatically on save:
//    'free' when only free is ticked; otherwise 'one_time' (or the sole
//    enabled paid type) so the backend free-guard never hides paid options.
//
// 4. Step 3 is a complete rewrite — checkbox toggle cards, one per
//    billing model, each expanding its own fee fields when enabled.
//    The throttle panel (weekly/monthly topic limits) lives here too.
//
// Everything outside Step 3 (steps 0-2, 4, all lesson/topic logic) is
// unchanged from v2.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { coursesApi, quizzesApi } from '@/services/api';
import { Course, Category, Tag } from '@/types';
import { Spinner, PageTitle } from '@/components/shared/index';
import "@/styles/pages/courses/CourseEditor.css"

import { CourseEditorPermissions, CREATOR_PERMISSIONS } from './Courseeditorpermissions';
import { ProjectBriefPanel } from './ProjectBriefPanel';
import { LessonAssessmentPanel } from './LessonAssessmentPanel';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const STEPS  = ['Details', 'Curriculum', 'Media', 'Pricing', 'Publish'];
const LEVELS = ['novice', 'beginner', 'intermediate', 'professional', 'expert', 'advanced'];
const STATUSES = ['draft', 'pending', 'published', 'unpublished', 'rejected'] as const;

const CONTENT_ICONS: Record<string, string> = {
  video: 'bi-camera-video', pdf: 'bi-file-pdf',
  audio: 'bi-music-note-beamed', image: 'bi-image',
  ppt: 'bi-file-slides', text: 'bi-file-text', doc: 'bi-file-earmark',
};

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Details {
  title: string; short_description: string; description: string;
  lang: string; level: string; duration_weeks: string;
  requirements: string; what_you_learn: string;
  category_ids: number[]; tag_ids: number[];
}

/**
 * Each billing model is independently toggled and has its own fee.
 * All are sent to the backend on save; the backend _build_payment_types
 * helper surfaces every model whose fee > 0 to students.
 */
interface Pricing {
  // ── Free ────────────────────────────────────────────────────────────────
  is_free: boolean;

  // ── One-time ─────────────────────────────────────────────────────────────
  one_time_enabled: boolean;
  one_time_fee: number;

  // ── Subscription ─────────────────────────────────────────────────────────
  subscription_enabled: boolean;
  subscription_fee: number;
  subscription_interval: string;

  // ── Pay-as-you-go ────────────────────────────────────────────────────────
  payg_enabled: boolean;
  payg_fee: number;
  access_period_days: number;

  // ── Instructor-led add-on ────────────────────────────────────────────────
  instructor_led_fee: number;

  // ── Content throttle (PAYG / subscription) ───────────────────────────────
  throttle_enabled: boolean;
  weekly_topic_limit: number | '';
  monthly_topic_limit: number | '';
}

const DEFAULT_PRICING: Pricing = {
  is_free:               false,
  one_time_enabled:      true,
  one_time_fee:          0,
  subscription_enabled:  false,
  subscription_fee:      0,
  subscription_interval: 'monthly',
  payg_enabled:          false,
  payg_fee:              0,
  access_period_days:    30,
  instructor_led_fee:    0,
  throttle_enabled:      false,
  weekly_topic_limit:    '',
  monthly_topic_limit:   '',
};

interface TopicContent {
  id: number; title: string; content_type: string;
  file_path?: string; url?: string; body?: string;
  mime_type?: string; order_index: number;
}
interface TopicFormState {
  [topicId: number]: {
    showTextEditor: boolean; textTitle: string; textBody: string;
    savingText: boolean; editContentId?: number;
  };
}
interface CourseEditorProps {
  permissions?: CourseEditorPermissions;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function mediaUrl(path: string | null | undefined, folder = 'courses/thumbnails'): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/uploads/${folder}/${path}`;
}

/** Derive a safe payment_type for the backend from the Pricing state. */
function derivePrimaryPaymentType(p: Pricing): string {
  if (p.is_free) return 'free';
  // Return the first enabled paid type as the primary
  if (p.one_time_enabled)     return 'one_time';
  if (p.subscription_enabled) return 'subscription';
  if (p.payg_enabled)         return 'pay_as_you_go';
  return 'one_time'; // fallback
}

/* ─── useDragReorder ─────────────────────────────────────────────────────── */
function useDragReorder<T extends { id: number; order_index: number }>(
  items: T[],
  onReorder: (reordered: T[]) => void,
) {
  const dragSrc = useRef<number | null>(null);
  const handleDragStart = (idx: number) => { dragSrc.current = idx; };
  const handleDragOver  = (e: React.DragEvent) => e.preventDefault();
  const handleDrop      = (idx: number) => {
    if (dragSrc.current === null || dragSrc.current === idx) return;
    const next = [...items];
    const [moved] = next.splice(dragSrc.current, 1);
    next.splice(idx, 0, moved);
    onReorder(next.map((item, i) => ({ ...item, order_index: i })));
    dragSrc.current = null;
  };
  return { handleDragStart, handleDragOver, handleDrop };
}

/* ─── QuizBuilderPanel ───────────────────────────────────────────────────── */
// (unchanged from v2 — full implementation kept below)
function QuizBuilderPanel({ topicId, courseId }: { topicId: number; courseId: number }) {
  const [open, setOpen]             = useState(false);
  const [quiz, setQuiz]             = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle]           = useState('');
  const [passMark, setPassMark]     = useState(70);
  const [attempts, setAttempts]     = useState(3);
  const [shuffle, setShuffle]       = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [questions, setQuestions]   = useState<any[]>([]);
  const [genCount, setGenCount]     = useState(5);
  const [genTypes, setGenTypes]     = useState('mcq,true_false');

  const resetForm = () => {
    setTitle(''); setPassMark(70); setAttempts(3);
    setShuffle(false); setShowAnswers(true); setQuestions([]);
  };
  const load = () => {
    setLoading(true);
    quizzesApi.getForTopic(topicId)
      .then(r => {
        const q = r.data.quiz;
        setQuiz(q);
        if (q) {
          setTitle(q.title); setPassMark(q.pass_mark_pct); setAttempts(q.attempts_allowed);
          setShuffle(q.shuffle_questions); setShowAnswers(q.show_answers_after);
          setQuestions(q.questions.map((qu: any) => ({
            ...qu,
            options: qu.options?.length
              ? qu.options
              : [{ text: '', is_correct: false }, { text: '', is_correct: false }],
          })));
        } else { resetForm(); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (open) load(); }, [open]);

  const addQuestion = () => setQuestions(prev => [...prev, {
    body: '', question_type: 'mcq', marks: 1,
    options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
    correct_answer: '', explanation: '',
  }]);
  const removeQuestion = (i: number) => setQuestions(prev => prev.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, patch: any) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  const updateOption = (qi: number, oi: number, patch: any) =>
    setQuestions(prev => prev.map((q, idx) => idx === qi
      ? { ...q, options: q.options.map((o: any, oidx: number) => oidx === oi ? { ...o, ...patch } : o) }
      : q));
  const addOption = (qi: number) =>
    setQuestions(prev => prev.map((q, idx) => idx === qi
      ? { ...q, options: [...(q.options || []), { text: '', is_correct: false }] }
      : q));
  const removeOption = (qi: number, oi: number) =>
    setQuestions(prev => prev.map((q, idx) => idx === qi
      ? { ...q, options: q.options.filter((_: any, oidx: number) => oidx !== oi) }
      : q));

  const buildPayload = () => ({
    title: title.trim() || 'Topic Quiz',
    pass_mark_pct: passMark, attempts_allowed: attempts,
    shuffle_questions: shuffle, show_answers_after: showAnswers,
    questions: questions.map((q, i) => ({
      body: q.body, question_type: q.question_type, marks: q.marks, order_index: i,
      options: q.question_type === 'mcq' ? q.options : undefined,
      correct_answer: q.question_type !== 'mcq' ? q.correct_answer : undefined,
      explanation: q.explanation || undefined,
    })),
  });
  const save = async () => {
    if (!title.trim())          { toast.error('Quiz title required'); return; }
    if (questions.length === 0) { toast.error('Add at least one question'); return; }
    setSaving(true);
    try {
      quiz
        ? await quizzesApi.update(quiz.id, buildPayload())
        : await quizzesApi.create(topicId, buildPayload());
      toast.success('Quiz saved!'); load();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };
  const deleteQuiz = async () => {
    if (!quiz || !window.confirm('Delete this quiz?')) return;
    try {
      await quizzesApi.delete(quiz.id);
      setQuiz(null); resetForm(); toast.success('Quiz deleted');
    } catch { toast.error('Delete failed'); }
  };
  const generateWithAI = async () => {
    setGenerating(true);
    try {
      const r = await quizzesApi.aiGenerate(topicId, { count: genCount, question_types: genTypes });
      const generated = (r.data.questions || []).map((q: any) => ({
        ...q, options: q.options || [{ text: '', is_correct: false }, { text: '', is_correct: false }],
      }));
      setQuestions(prev => [...prev, ...generated]);
      toast.success(`${generated.length} questions generated!`);
    } catch { toast.error('AI generation failed'); }
    finally { setGenerating(false); }
  };
  const QTYPE_LABELS: Record<string, string> = {
    mcq: 'Multiple Choice', true_false: 'True / False', short_answer: 'Short Answer',
  };
  return (
    <div className="topic-quiz-builder">
      <button
        className={`btn btn-sm ${quiz ? 'btn-success' : 'btn-outline-success'}`}
        style={{ fontSize: '0.72rem' }}
        onClick={() => setOpen(p => !p)}
        title={quiz ? 'Edit quiz' : 'Add quiz'}
      >
        <i className={`bi ${quiz ? 'bi-patch-check-fill' : 'bi-patch-question'} me-1`} />
        {quiz ? 'Quiz ✓' : 'Add Quiz'}
      </button>
      {open && (
        <div className="quiz-builder-panel">
          {loading ? (
            <div className="p-3 text-muted small text-center">
              <span className="spinner-border spinner-border-sm me-2" />Loading…
            </div>
          ) : (
            <>
              <div className="quiz-builder-head">
                <span className="fw-700" style={{ fontSize: '0.875rem' }}>
                  <i className="bi bi-patch-question-fill text-primary me-2" />
                  {quiz ? 'Edit Quiz' : 'New Quiz'}
                </span>
                <div className="d-flex gap-2">
                  {quiz && (
                    <button className="btn btn-sm btn-outline-danger" onClick={deleteQuiz}>
                      <i className="bi bi-trash" />
                    </button>
                  )}
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(false)}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
              <div className="quiz-builder-settings">
                <div style={{ flex: 2 }}>
                  <label className="form-label fw-600 small mb-1">Quiz Title</label>
                  <input className="form-control form-control-sm" value={title}
                    onChange={e => setTitle(e.target.value)} placeholder="e.g. Knowledge Check" />
                </div>
                <div>
                  <label className="form-label fw-600 small mb-1">Pass %</label>
                  <input type="number" className="form-control form-control-sm" min={0} max={100}
                    value={passMark} onChange={e => setPassMark(Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label fw-600 small mb-1">Attempts</label>
                  <input type="number" className="form-control form-control-sm" min={1}
                    value={attempts} onChange={e => setAttempts(Number(e.target.value))} />
                </div>
              </div>
              <div className="d-flex gap-3 mb-3" style={{ fontSize: '0.8rem' }}>
                <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} />
                  Shuffle questions
                </label>
                <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)} />
                  Show answers after
                </label>
              </div>
              <div className="quiz-ai-gen-row">
                <span className="fw-600 small"><i className="bi bi-stars text-primary me-1" />AI Generate</span>
                <input type="number" className="form-control form-control-sm" style={{ width: 60 }}
                  min={1} max={20} value={genCount} onChange={e => setGenCount(Number(e.target.value))} title="# of questions" />
                <select className="form-select form-select-sm" style={{ width: 160 }}
                  value={genTypes} onChange={e => setGenTypes(e.target.value)}>
                  <option value="mcq">MCQ only</option>
                  <option value="true_false">True/False only</option>
                  <option value="short_answer">Short Answer only</option>
                  <option value="mcq,true_false">MCQ + T/F</option>
                  <option value="mcq,short_answer">MCQ + Short</option>
                  <option value="mcq,true_false,short_answer">All types</option>
                </select>
                <button className="btn btn-sm btn-outline-primary" onClick={generateWithAI} disabled={generating}>
                  {generating
                    ? <><span className="spinner-border spinner-border-sm me-1" />Generating…</>
                    : <><i className="bi bi-magic me-1" />Generate</>}
                </button>
              </div>
              <div className="quiz-questions-list">
                {questions.length === 0 && (
                  <div className="text-center text-muted small py-3">No questions yet.</div>
                )}
                {questions.map((q, qi) => (
                  <div key={qi} className="quiz-question-editor">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.65rem' }}>Q{qi + 1}</span>
                      <select className="form-select form-select-sm" style={{ width: 160 }}
                        value={q.question_type} onChange={e => updateQuestion(qi, { question_type: e.target.value })}>
                        {Object.entries(QTYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <input type="number" className="form-control form-control-sm" style={{ width: 65 }}
                        min={1} value={q.marks} title="Marks"
                        onChange={e => updateQuestion(qi, { marks: Number(e.target.value) })} />
                      <span className="text-muted small">mark{q.marks !== 1 ? 's' : ''}</span>
                      <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => removeQuestion(qi)}>
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                    <textarea className="form-control form-control-sm mb-2" rows={2}
                      placeholder="Question text…" value={q.body}
                      onChange={e => updateQuestion(qi, { body: e.target.value })}
                      style={{ fontSize: '0.82rem', resize: 'vertical' }} />
                    {q.question_type === 'mcq' && (
                      <div className="quiz-options-editor">
                        {(q.options || []).map((opt: any, oi: number) => (
                          <div key={oi} className="d-flex align-items-center gap-2 mb-1">
                            <input type="checkbox" checked={opt.is_correct} title="Correct answer"
                              onChange={e => updateOption(qi, oi, { is_correct: e.target.checked })} />
                            <input className="form-control form-control-sm" placeholder={`Option ${oi + 1}`}
                              value={opt.text} style={{ fontSize: '0.8rem' }}
                              onChange={e => updateOption(qi, oi, { text: e.target.value })} />
                            {q.options.length > 2 && (
                              <button className="btn btn-sm btn-outline-danger p-0 px-1" onClick={() => removeOption(qi, oi)}>
                                <i className="bi bi-dash" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button className="btn btn-sm btn-link p-0" style={{ fontSize: '0.75rem' }} onClick={() => addOption(qi)}>
                          <i className="bi bi-plus me-1" />Add option
                        </button>
                      </div>
                    )}
                    {q.question_type === 'true_false' && (
                      <div className="d-flex gap-2 mb-2">
                        <select className="form-select form-select-sm" value={q.correct_answer || 'True'} style={{ width: 120 }}
                          onChange={e => updateQuestion(qi, { correct_answer: e.target.value })}>
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </select>
                        <span className="text-muted small align-self-center">= Correct answer</span>
                      </div>
                    )}
                    {q.question_type === 'short_answer' && (
                      <input className="form-control form-control-sm mb-2"
                        placeholder="Expected answer (keyword match)…" value={q.correct_answer || ''}
                        style={{ fontSize: '0.8rem' }}
                        onChange={e => updateQuestion(qi, { correct_answer: e.target.value })} />
                    )}
                    <input className="form-control form-control-sm" placeholder="Explanation (optional)…"
                      value={q.explanation || ''} style={{ fontSize: '0.78rem' }}
                      onChange={e => updateQuestion(qi, { explanation: e.target.value })} />
                  </div>
                ))}
                <button className="btn btn-sm btn-outline-secondary w-100 mt-2" onClick={addQuestion}>
                  <i className="bi bi-plus-circle me-1" />Add Question
                </button>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border, #2a2a3a)' }}>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-sm btn-primary fw-600" onClick={save} disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                    : <><i className="bi bi-check me-1" />Save Quiz</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── PaymentModelCard ───────────────────────────────────────────────────────
   A reusable toggle card for a single billing model.
   Shows a checkbox header; children (fee fields) expand when enabled.
   ─────────────────────────────────────────────────────────────────────────── */
interface PaymentModelCardProps {
  icon:        string;
  label:       string;
  description: string;
  enabled:     boolean;
  onToggle:    (v: boolean) => void;
  disabled?:   boolean;   // e.g. when "free" is active
  accent?:     string;    // CSS color token or hex
  children?:   React.ReactNode;
}

function PaymentModelCard({
  icon, label, description, enabled, onToggle, disabled, accent = 'var(--primary)', children,
}: PaymentModelCardProps) {
  const borderColor = enabled ? accent : 'var(--border)';
  return (
    <div
      style={{
        border:       `1.5px solid ${borderColor}`,
        borderRadius: 'var(--radius)',
        overflow:     'hidden',
        opacity:      disabled ? 0.45 : 1,
        transition:   'border-color 0.15s, opacity 0.15s',
      }}
    >
      {/* ── Header row ── */}
      <label
        className="d-flex align-items-center gap-3 p-3"
        style={{
          cursor:     disabled ? 'not-allowed' : 'pointer',
          background: enabled ? 'var(--primary-light, rgba(99,102,241,0.06))' : 'var(--surface)',
          userSelect: 'none',
          margin:     0,
        }}
      >
        <input
          type="checkbox"
          className="form-check-input mt-0 flex-shrink-0"
          checked={enabled}
          disabled={disabled}
          onChange={e => onToggle(e.target.checked)}
        />
        <div
          className="d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: enabled ? accent : 'var(--surface-alt, #f0f0f0)',
            color: enabled ? '#fff' : 'var(--text-muted)',
            fontSize: '1rem', transition: 'background 0.15s',
          }}
        >
          <i className={`bi ${icon}`} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-600" style={{ fontSize: '0.875rem' }}>{label}</div>
          <div className="text-muted" style={{ fontSize: '0.75rem', lineHeight: 1.4, marginTop: '0.1rem' }}>
            {description}
          </div>
        </div>
        {enabled && (
          <span
            className="badge"
            style={{ background: accent, fontSize: '0.65rem', padding: '3px 8px' }}
          >
            Active
          </span>
        )}
      </label>

      {/* ── Expanded fee fields ── */}
      {enabled && children && (
        <div
          className="p-3"
          style={{ borderTop: `1px solid ${borderColor}`, background: 'var(--surface)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CourseEditor — main component
   ═══════════════════════════════════════════════════════════ */
export default function CourseEditor({ permissions = CREATOR_PERMISSIONS }: CourseEditorProps) {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step,     setStep]     = useState(0);
  const [course,   setCourse]   = useState<Course | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags,     setTags]     = useState<Tag[]>([]);
  const [loading,  setLoading]  = useState(isEdit);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [details, setDetails] = useState<Details>({
    title: '', short_description: '', description: '', lang: 'en',
    level: 'beginner', duration_weeks: '', requirements: '', what_you_learn: '',
    category_ids: [], tag_ids: [],
  });

  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const setP = <K extends keyof Pricing>(key: K, value: Pricing[K]) =>
    setPricing(prev => ({ ...prev, [key]: value }));

  const [thumbnailPreview,   setThumbnailPreview]   = useState('');
  const thumbRef = useRef<HTMLInputElement>(null);

  const [newLessonTitle,   setNewLessonTitle]   = useState('');
  const [newTopicTitles,   setNewTopicTitles]   = useState<Record<number, string>>({});
  const [activeLesson,     setActiveLesson]     = useState<number | null>(null);
  const [uploadingContent, setUploadingContent] = useState<number | null>(null);
  const [deletingContent,  setDeletingContent]  = useState<number | null>(null);
  const [topicContents,    setTopicContents]    = useState<Record<number, TopicContent[]>>({});
  const [topicForms,       setTopicForms]       = useState<TopicFormState>({});
  const [togglingPreview,  setTogglingPreview]  = useState<number | null>(null);
  const [lessonEditing,    setLessonEditing]    = useState<Record<number, string | null>>({});
  const [topicEditing,     setTopicEditing]     = useState<Record<number, string | null>>({});
  const [savingLesson,     setSavingLesson]     = useState<number | null>(null);
  const [savingTopic,      setSavingTopic]      = useState<number | null>(null);

  /* ── Bootstrap ── */
  useEffect(() => {
    Promise.all([
      coursesApi.getCategories(),
      coursesApi.getTags?.() ?? Promise.resolve({ data: [] }),
    ]).then(([catRes, tagRes]) => {
      setCategories(catRes.data || []);
      setTags(tagRes.data || []);
    });
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    coursesApi.get(id).then(r => {
      const c: Course = r.data;
      setCourse(c);
      setDetails({
        title:             c.title             || '',
        short_description: c.short_description || '',
        description:       c.description       || '',
        lang:              c.lang              || 'en',
        level:             c.level             || 'beginner',
        duration_weeks:    c.duration_weeks?.toString() || '',
        requirements:      c.requirements      || '',
        what_you_learn:    c.what_you_learn    || '',
        category_ids:      (c.categories || []).map((x: any) => x.id),
        tag_ids:           ((c as any).tags    || []).map((x: any) => x.id),
      });

      // ── Hydrate pricing from all fee columns ─────────────────────────────
      const subFee  = Number((c as any).subscription_fee   || 0);
      const paygFee = Number((c as any).pay_as_you_go_fee  || 0);
      const baseFee = Number(c.fee || 0);
      const isFree  = c.payment_type === 'free';

      setPricing({
        is_free:               isFree,
        one_time_enabled:      !isFree && baseFee > 0,
        one_time_fee:          baseFee,
        subscription_enabled:  !isFree && subFee > 0,
        subscription_fee:      subFee,
        subscription_interval: c.subscription_interval || 'monthly',
        payg_enabled:          !isFree && paygFee > 0,
        payg_fee:              paygFee,
        access_period_days:    Number((c as any).access_period_days || 30),
        instructor_led_fee:    Number((c as any).instructor_led_fee || 0),
        throttle_enabled:      Boolean((c as any).throttle_enabled),
        weekly_topic_limit:    (c as any).weekly_topic_limit  ?? '',
        monthly_topic_limit:   (c as any).monthly_topic_limit ?? '',
      });

      if (c.thumbnail) setThumbnailPreview(mediaUrl(c.thumbnail) ?? '');
    }).finally(() => setLoading(false));
  }, [id]);

  /* ── Tab navigation ── */
  const goToStep = useCallback((i: number) => {
    if (!isEdit && !course && i > 0) { toast.error('Please save course details first.'); return; }
    setStep(i);
  }, [isEdit, course]);

  /* ── Save details / pricing ── */
  const saveCourse = async (redirectStep?: number) => {
    if (!details.title.trim()) { toast.error('Title is required'); return; }

    // Pricing validation
    if (!pricing.is_free) {
      if (!pricing.one_time_enabled && !pricing.subscription_enabled && !pricing.payg_enabled) {
        toast.error('Enable at least one payment model, or set the course to Free.');
        return;
      }
      if (pricing.one_time_enabled && pricing.one_time_fee <= 0) {
        toast.error('Enter a price for the One-time option.');
        return;
      }
      if (pricing.subscription_enabled && pricing.subscription_fee <= 0) {
        toast.error('Enter a subscription fee.');
        return;
      }
      if (pricing.subscription_enabled && !pricing.subscription_interval) {
        toast.error('Select a billing interval for the subscription.');
        return;
      }
      if (pricing.payg_enabled && pricing.payg_fee <= 0) {
        toast.error('Enter a fee for Pay-as-you-go.');
        return;
      }
      if (pricing.payg_enabled && pricing.access_period_days < 1) {
        toast.error('Access period must be at least 1 day.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        // Details
        ...details,
        duration_weeks: details.duration_weeks ? Number(details.duration_weeks) : undefined,

        // ── Payment type + all fee columns ──────────────────────────────────
        // payment_type is derived so the backend free-guard works correctly.
        // Every other fee is sent explicitly so _build_payment_types can
        // surface each enabled model to students independently.
        payment_type:          derivePrimaryPaymentType(pricing),
        fee:                   pricing.is_free ? 0 : (pricing.one_time_enabled ? pricing.one_time_fee : 0),
        subscription_fee:      pricing.is_free || !pricing.subscription_enabled ? 0 : pricing.subscription_fee,
        subscription_interval: pricing.subscription_enabled ? pricing.subscription_interval : null,
        pay_as_you_go_fee:     pricing.is_free || !pricing.payg_enabled  ? 0 : pricing.payg_fee,
        access_period_days:    pricing.payg_enabled ? pricing.access_period_days : 30,
        instructor_led_fee:    pricing.is_free ? 0 : (pricing.instructor_led_fee || 0),
        // ────────────────────────────────────────────────────────────────────

        // Throttle
        throttle_enabled:    pricing.throttle_enabled,
        weekly_topic_limit:  pricing.throttle_enabled && pricing.weekly_topic_limit  !== ''
          ? Number(pricing.weekly_topic_limit)  : null,
        monthly_topic_limit: pricing.throttle_enabled && pricing.monthly_topic_limit !== ''
          ? Number(pricing.monthly_topic_limit) : null,
      };

      // Strip empty-string values
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

      if (isEdit && id) {
        const r = await coursesApi.update(Number(id), payload);
        setCourse(r.data);
        toast.success('Saved!');
      } else {
        const r = await coursesApi.create(payload);
        setCourse(r.data);
        navigate(`${backRoute}/${r.data.id}/edit`, { replace: true });
        toast.success('Course created!');
      }
      if (redirectStep !== undefined) setStep(redirectStep);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  /* ── Delete entire course (admin only) ── */
  const deleteCourse = async () => {
    if (!course) return;
    if (!window.confirm(`Permanently delete "${course.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await coursesApi.delete(course.id);
      toast.success('Course deleted');
      navigate('/admin/courses', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    } finally { setDeleting(false); }
  };

  /* ── Thumbnail ── */
  const uploadThumbnail = async (file: File) => {
    if (!course) { toast.error('Save course details first'); return; }
    try {
      const r = await coursesApi.uploadThumbnail(course.id, file);
      setThumbnailPreview(r.data.url ?? mediaUrl(r.data.thumbnail) ?? '');
      toast.success('Thumbnail uploaded!');
    } catch { toast.error('Thumbnail upload failed'); }
  };

  /* ── Lessons ── */
  const addLesson = async () => {
    if (!newLessonTitle.trim() || !course) return;
    try {
      const r = await coursesApi.createLesson(course.id, {
        title: newLessonTitle, order_index: course.lessons?.length ?? 0,
      });
      setCourse(prev => prev
        ? { ...prev, lessons: [...(prev.lessons || []), { ...r.data, topics: [] }] }
        : prev);
      setNewLessonTitle('');
      toast.success('Lesson added!');
    } catch { toast.error('Failed to add lesson'); }
  };
  const deleteLesson = async (lessonId: number) => {
    if (!course || !window.confirm('Delete this lesson and all its topics?')) return;
    try {
      await coursesApi.deleteLesson(course.id, lessonId);
      setCourse(prev => prev
        ? { ...prev, lessons: (prev.lessons || []).filter(l => l.id !== lessonId) }
        : prev);
      toast.success('Lesson deleted');
    } catch { toast.error('Failed to delete lesson'); }
  };
  const reorderLessons = async (reordered: any[]) => {
    if (!course) return;
    setCourse(prev => prev ? { ...prev, lessons: reordered } : prev);
    try {
      await Promise.all(
        reordered.map(l => coursesApi.updateLesson(course.id, l.id, { order_index: l.order_index }))
      );
    } catch { toast.error('Reorder failed — refresh to sync'); }
  };
  const lessonDrag = useDragReorder(course?.lessons ?? [], reorderLessons);
  const startLessonEdit  = (lessonId: number, title: string) =>
    setLessonEditing(prev => ({ ...prev, [lessonId]: title }));
  const cancelLessonEdit = (lessonId: number) =>
    setLessonEditing(prev => { const n = { ...prev }; delete n[lessonId]; return n; });
  const saveInlineLessonTitle = async (lesson: any) => {
    const newTitle = lessonEditing[lesson.id]?.trim();
    if (!newTitle || newTitle === lesson.title || !course) { cancelLessonEdit(lesson.id); return; }
    setSavingLesson(lesson.id);
    try {
      await coursesApi.updateLesson(course.id, lesson.id, { title: newTitle });
      setCourse(prev => prev ? {
        ...prev,
        lessons: (prev.lessons || []).map(l => l.id === lesson.id ? { ...l, title: newTitle } : l),
      } : prev);
      toast.success('Lesson renamed');
    } catch { toast.error('Failed to rename lesson'); }
    finally { setSavingLesson(null); cancelLessonEdit(lesson.id); }
  };

  /* ── Topics ── */
  const getNewTopicTitle = (lid: number) => newTopicTitles[lid] ?? '';
  const setNewTopicTitle = (lid: number, val: string) =>
    setNewTopicTitles(prev => ({ ...prev, [lid]: val }));
  const addTopic = async (lessonId: number) => {
    const title = getNewTopicTitle(lessonId);
    if (!title.trim() || !course) return;
    try {
      const lesson = (course.lessons || []).find(l => l.id === lessonId);
      const r = await coursesApi.createTopic(course.id, {
        title, lesson_id: lessonId, order_index: lesson?.topics?.length ?? 0,
      });
      setCourse(prev => prev ? {
        ...prev,
        lessons: (prev.lessons || []).map(l =>
          l.id === lessonId ? { ...l, topics: [...(l.topics || []), r.data] } : l),
      } : prev);
      setNewTopicTitle(lessonId, '');
      toast.success('Topic added!');
    } catch { toast.error('Failed to add topic'); }
  };
  const deleteTopic = async (lessonId: number, topicId: number) => {
    if (!course || !window.confirm('Delete this topic?')) return;
    try {
      await coursesApi.deleteTopic(course.id, topicId);
      setCourse(prev => prev ? {
        ...prev,
        lessons: (prev.lessons || []).map(l =>
          l.id === lessonId
            ? { ...l, topics: (l.topics || []).filter((t: any) => t.id !== topicId) }
            : l),
      } : prev);
      setTopicContents(prev => { const n = { ...prev }; delete n[topicId]; return n; });
      toast.success('Topic deleted');
    } catch { toast.error('Failed to delete topic'); }
  };
  const toggleFreePreview = async (lessonId: number, topic: any) => {
    if (!course) return;
    setTogglingPreview(topic.id);
    try {
      await coursesApi.updateTopic(course.id, topic.id, { is_free_preview: !topic.is_free_preview });
      setCourse(prev => prev ? {
        ...prev,
        lessons: (prev.lessons || []).map(l =>
          l.id === lessonId
            ? { ...l, topics: (l.topics || []).map((t: any) =>
                t.id === topic.id ? { ...t, is_free_preview: !t.is_free_preview } : t) }
            : l),
      } : prev);
      toast.success(!topic.is_free_preview ? 'Set as free preview' : 'Preview removed');
    } catch { toast.error('Failed to update preview flag'); }
    finally { setTogglingPreview(null); }
  };
  const reorderTopics = async (lessonId: number, reordered: any[]) => {
    if (!course) return;
    setCourse(prev => prev ? {
      ...prev,
      lessons: (prev.lessons || []).map(l =>
        l.id === lessonId ? { ...l, topics: reordered } : l),
    } : prev);
    try {
      await Promise.all(
        reordered.map(t => coursesApi.updateTopic(course.id, t.id, { order_index: t.order_index }))
      );
    } catch { toast.error('Reorder failed — refresh to sync'); }
  };

  /* ── Topic content ── */
  const loadTopicContents = async (topicId: number) => {
    if (!course || topicContents[topicId] !== undefined) return;
    try {
      const r = await coursesApi.getTopicContent(course.id, topicId);
      setTopicContents(prev => ({ ...prev, [topicId]: r.data.contents || [] }));
    } catch { setTopicContents(prev => ({ ...prev, [topicId]: [] })); }
  };
  const uploadTopicContent = async (topicId: number, file: File) => {
    if (!course) return;
    setUploadingContent(topicId);
    try {
      const r = await coursesApi.uploadContent(course.id, topicId, file);
      setTopicContents(prev => ({ ...prev, [topicId]: [...(prev[topicId] || []), r.data] }));
      toast.success('Content uploaded!');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingContent(null); }
  };
  const initTopicForm = (topicId: number) => {
    if (topicForms[topicId]) return;
    setTopicForms(prev => ({
      ...prev, [topicId]: { showTextEditor: false, textTitle: '', textBody: '', savingText: false },
    }));
  };
  const updateTopicForm = (topicId: number, patch: Partial<TopicFormState[number]>) =>
    setTopicForms(prev => ({ ...prev, [topicId]: { ...prev[topicId], ...patch } }));
  const saveTextContent = async (topicId: number) => {
    if (!course) return;
    const form = topicForms[topicId];
    if (!form?.textTitle.trim() || !form?.textBody.trim()) { toast.error('Title and content are required'); return; }
    const editId = form.editContentId;
    updateTopicForm(topicId, { savingText: true });
    try {
      if (editId) {
        await coursesApi.updateTextContent(course.id, topicId, editId, { title: form.textTitle, body: form.textBody });
        setTopicContents(prev => ({
          ...prev, [topicId]: (prev[topicId] || []).map(c =>
            c.id === editId ? { ...c, title: form.textTitle, body: form.textBody } : c),
        }));
        updateTopicForm(topicId, { showTextEditor: false, textTitle: '', textBody: '', editContentId: undefined });
        toast.success('Content updated!');
      } else {
        const r = await coursesApi.addTextContent(course.id, topicId, { title: form.textTitle, body: form.textBody });
        setTopicContents(prev => ({ ...prev, [topicId]: [...(prev[topicId] || []), r.data] }));
        updateTopicForm(topicId, { showTextEditor: false, textTitle: '', textBody: '' });
        toast.success('Content saved!');
      }
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed to save content'); }
    finally { updateTopicForm(topicId, { savingText: false }); }
  };
  const deleteTopicContent = async (topicId: number, contentId: number) => {
    if (!course || !window.confirm('Delete this content?')) return;
    setDeletingContent(contentId);
    try {
      await coursesApi.deleteContent?.(course.id, topicId, contentId);
      setTopicContents(prev => ({
        ...prev, [topicId]: (prev[topicId] || []).filter(c => c.id !== contentId),
      }));
      toast.success('Content deleted');
    } catch { toast.error('Failed to delete content'); }
    finally { setDeletingContent(null); }
  };
  const startTopicEdit  = (topicId: number, title: string) =>
    setTopicEditing(prev => ({ ...prev, [topicId]: title }));
  const cancelTopicEdit = (topicId: number) =>
    setTopicEditing(prev => { const n = { ...prev }; delete n[topicId]; return n; });
  const saveInlineTopicTitle = async (lessonId: number, topic: any) => {
    const newTitle = topicEditing[topic.id]?.trim();
    if (!newTitle || newTitle === topic.title || !course) { cancelTopicEdit(topic.id); return; }
    setSavingTopic(topic.id);
    try {
      await coursesApi.updateTopic(course.id, topic.id, { title: newTitle });
      setCourse(prev => prev ? {
        ...prev,
        lessons: (prev.lessons || []).map(l =>
          l.id === lessonId
            ? { ...l, topics: (l.topics || []).map((t: any) =>
                t.id === topic.id ? { ...t, title: newTitle } : t) }
            : l),
      } : prev);
      toast.success('Topic renamed');
    } catch { toast.error('Failed to rename topic'); }
    finally { setSavingTopic(null); cancelTopicEdit(topic.id); }
  };

  /* ── Publish actions ── */
  const submitForApproval = async () => {
    if (!course) return;
    try {
      await coursesApi.submitForApproval(course.id);
      toast.success('Submitted for admin review!');
      navigate('/creator/courses');
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Submission failed'); }
  };
  const publishDirectly = async () => {
    if (!course) return;
    setSaving(true);
    try {
      const r = await coursesApi.update(course.id, { status: 'published' });
      setCourse(r.data);
      toast.success('Course published!');
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Publish failed'); }
    finally { setSaving(false); }
  };

  /* ── Category / tag helpers ── */
  const toggleCategory = (cid: number) =>
    setDetails(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(cid)
        ? prev.category_ids.filter(c => c !== cid)
        : [...prev.category_ids, cid],
    }));
  const toggleTag = (tid: number) =>
    setDetails(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tid)
        ? prev.tag_ids.filter(t => t !== tid)
        : [...prev.tag_ids, tid],
    }));

  if (loading) return <Spinner />;

  const backRoute = permissions.canDeleteCourse ? '/admin/courses' : '/creator/courses';

  /* ══════════════════════════════════════════
     Render
     ══════════════════════════════════════════ */
  return (
    <div className="fade-in">

      <PageTitle
        title={isEdit ? 'Edit Course' : 'Create New Course'}
        subtitle="Share your knowledge with the world"
        crumbs={[
          permissions.canDeleteCourse
            ? { label: 'Admin', href: '/admin' }
            : { label: 'Creator', href: '/creator' },
          { label: 'Courses', href: backRoute },
          ...(isEdit && course
            ? [{ label: 'Edit', href: `${backRoute}/${course.id}/edit` }, { label: course.title }]
            : [{ label: 'New' }]
          ),
        ]}
      />

      {/* ── Step indicator ── */}
      <div className="step-indicator mb-4">
        {STEPS.map((s, i) => (
          <button
            key={s}
            className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''} rounded-pill me-1`}
            onClick={() => goToStep(i)}
            title={(!isEdit && !course && i > 0) ? 'Save details first' : s}
          >
            {i < step ? <><i className="bi bi-check me-1" />{s}</> : s}
          </button>
        ))}
      </div>

      <div className="card studio-step">

        {/* ════════════════════════════════════
            STEP 0 — Details  (unchanged)
            ════════════════════════════════════ */}
        {step === 0 && (
          <div>
            <h5 className="fw-bold mb-4">Course Details</h5>
            <div className="row g-3">

              {permissions.canEditStatus && (
                <div className="col-12 col-sm-4">
                  <label className="form-label fw-600 small">Status</label>
                  <select
                    className="form-select" value={course?.status || 'draft'}
                    disabled={!course}
                    onChange={async e => {
                      if (!course) return;
                      try {
                        const r = await coursesApi.update(course.id, { status: e.target.value });
                        setCourse(r.data); toast.success('Status updated');
                      } catch { toast.error('Failed to update status'); }
                    }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              )}

              {permissions.canEditFeatured && (
                <div className="col-12 col-sm-4 d-flex align-items-end">
                  <div className="form-check mb-2">
                    <input type="checkbox" className="form-check-input" id="featuredCheck"
                      checked={course?.featured || false} disabled={!course}
                      onChange={async e => {
                        if (!course) return;
                        try {
                          const r = await coursesApi.update(course.id, { featured: e.target.checked });
                          setCourse(r.data);
                          toast.success(e.target.checked ? 'Course featured ⭐' : 'Removed from featured');
                        } catch { toast.error('Failed to update'); }
                      }}
                    />
                    <label className="form-check-label fw-600 small" htmlFor="featuredCheck">Featured course</label>
                  </div>
                </div>
              )}

              <div className="col-12">
                <label className="form-label fw-600 small">Course Title *</label>
                <input className="form-control" placeholder="e.g. Complete Python Bootcamp"
                  value={details.title} onChange={e => setDetails(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label fw-600 small">Short Description</label>
                <input className="form-control" placeholder="One-line summary"
                  value={details.short_description} maxLength={500}
                  onChange={e => setDetails(p => ({ ...p, short_description: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label fw-600 small">Full Description</label>
                <textarea className="form-control" rows={5}
                  placeholder="Describe what students will learn…"
                  value={details.description}
                  onChange={e => setDetails(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="col-4">
                <label className="form-label fw-600 small">Level</label>
                <select className="form-select" value={details.level}
                  onChange={e => setDetails(p => ({ ...p, level: e.target.value }))}>
                  {LEVELS.map(l => <option key={l} value={l} style={{ textTransform: 'capitalize' }}>{l}</option>)}
                </select>
              </div>
              <div className="col-4">
                <label className="form-label fw-600 small">Language</label>
                <select className="form-select" value={details.lang}
                  onChange={e => setDetails(p => ({ ...p, lang: e.target.value }))}>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="yo">Yoruba</option>
                  <option value="ha">Hausa</option>
                  <option value="ig">Igbo</option>
                </select>
              </div>
              <div className="col-4">
                <label className="form-label fw-600 small">Duration (weeks)</label>
                <input type="number" className="form-control" min={1}
                  value={details.duration_weeks}
                  onChange={e => setDetails(p => ({ ...p, duration_weeks: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label fw-600 small">
                  Requirements <span className="text-muted">(one per line)</span>
                </label>
                <textarea className="form-control" rows={3}
                  placeholder={'Basic computer knowledge\nInternet connection'}
                  value={details.requirements}
                  onChange={e => setDetails(p => ({ ...p, requirements: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label fw-600 small">
                  What Students Will Learn <span className="text-muted">(one per line)</span>
                </label>
                <textarea className="form-control" rows={3}
                  placeholder={'Build full-stack apps\nDeploy to production'}
                  value={details.what_you_learn}
                  onChange={e => setDetails(p => ({ ...p, what_you_learn: e.target.value }))} />
              </div>

              {categories.length > 0 && (
                <div className="col-12">
                  <label className="form-label fw-600 small">Categories</label>
                  <div className="d-flex flex-wrap gap-2">
                    {categories.map(cat => {
                      const selected = details.category_ids.includes(cat.id);
                      return (
                        <button key={cat.id} type="button"
                          className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-outline-secondary'}`}
                          style={{ fontSize: '0.75rem' }} onClick={() => toggleCategory(cat.id)}>
                          {selected && <i className="bi bi-check me-1" />}{cat.title}
                        </button>
                      );
                    })}
                  </div>
                  {details.category_ids.length === 0 && (
                    <div className="text-muted small mt-1">Select at least one category</div>
                  )}
                </div>
              )}

              {tags.length > 0 && (
                <div className="col-12">
                  <label className="form-label fw-600 small">Tags <span className="text-muted">(optional)</span></label>
                  <div className="d-flex flex-wrap gap-2">
                    {tags.map(tag => {
                      const selected = details.tag_ids.includes(tag.id);
                      return (
                        <button key={tag.id} type="button"
                          className={`btn btn-sm ${selected ? 'btn-accent' : 'btn-outline-secondary'}`}
                          style={{ fontSize: '0.75rem' }} onClick={() => toggleTag(tag.id)}>
                          {selected && <i className="bi bi-check me-1" />}{tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="d-flex justify-content-end mt-4">
              <button className="btn btn-primary fw-600" onClick={() => saveCourse(1)}
                disabled={saving || !details.title.trim()}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                  : isEdit ? 'Save & Continue →' : 'Create Course →'}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            STEP 1 — Curriculum  (unchanged)
            ════════════════════════════════════ */}
        {step === 1 && course && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="fw-bold mb-0">Curriculum Builder</h5>
              <span className="text-muted small">
                <i className="bi bi-grip-vertical me-1" />Drag lessons or topics to reorder
              </span>
            </div>

            {(course.lessons || []).length === 0 && (
              <div className="text-center text-muted py-4" style={{ fontSize: '0.875rem' }}>
                <i className="bi bi-collection d-block mb-2" style={{ fontSize: '2rem' }} />
                No lessons yet. Add your first lesson below.
              </div>
            )}

            {(course.lessons || []).map((lesson: any, li: number) => {
              const topicDragRef = { _src: null as number | null };
              const topicDrag = {
                handleDragStart: (idx: number) => { topicDragRef._src = idx; },
                handleDragOver:  (e: React.DragEvent) => e.preventDefault(),
                handleDrop:      (idx: number) => {
                  const src = topicDragRef._src;
                  if (src === null || src === idx) return;
                  const topics = [...(lesson.topics || [])];
                  const [moved] = topics.splice(src, 1);
                  topics.splice(idx, 0, moved);
                  reorderTopics(lesson.id, topics.map((t, i) => ({ ...t, order_index: i })));
                  topicDragRef._src = null;
                },
              };
              return (
                <div key={lesson.id} className="mb-3 border rounded-3 overflow-hidden"
                  draggable onDragStart={() => lessonDrag.handleDragStart(li)}
                  onDragOver={lessonDrag.handleDragOver} onDrop={() => lessonDrag.handleDrop(li)}
                  style={{ cursor: 'grab' }}>

                  <div className="p-3 d-flex align-items-center gap-2" style={{ background: 'var(--bg)' }}>
                    <i className="bi bi-grip-vertical text-muted" style={{ cursor: 'grab', fontSize: '1rem' }} />
                    <i className="bi bi-collection text-primary" />

                    {lessonEditing[lesson.id] !== undefined ? (
                      <div className="d-flex align-items-center gap-1 flex-1">
                        <input className="form-control form-control-sm fw-700" style={{ fontSize: '0.875rem' }}
                          value={lessonEditing[lesson.id] ?? ''} autoFocus
                          onChange={e => setLessonEditing(prev => ({ ...prev, [lesson.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  saveInlineLessonTitle(lesson);
                            if (e.key === 'Escape') cancelLessonEdit(lesson.id);
                          }} />
                        <button className="btn btn-sm btn-success px-2 py-1"
                          onClick={() => saveInlineLessonTitle(lesson)} disabled={savingLesson === lesson.id}>
                          {savingLesson === lesson.id
                            ? <span className="spinner-border spinner-border-sm" style={{ width: '0.65rem', height: '0.65rem' }} />
                            : <i className="bi bi-check" />}
                        </button>
                        <button className="btn btn-sm btn-outline-secondary px-2 py-1"
                          onClick={() => cancelLessonEdit(lesson.id)}><i className="bi bi-x" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="fw-700 flex-1" style={{ fontSize: '0.9rem' }}>
                          <span className="text-muted me-2" style={{ fontSize: '0.75rem' }}>Lesson {li + 1}</span>
                          {lesson.title}
                        </span>
                        <button className="btn btn-sm btn-link text-muted p-0 px-1" title="Rename lesson"
                          onClick={() => startLessonEdit(lesson.id, lesson.title)}>
                          <i className="bi bi-pencil" style={{ fontSize: '0.75rem' }} />
                        </button>
                      </>
                    )}

                    <span className="badge bg-secondary-subtle text-secondary me-1" style={{ fontSize: '0.68rem' }}>
                      {(lesson.topics || []).length} topics
                    </span>
                    <button className="btn btn-outline-danger btn-sm px-2 py-1 lh-1"
                      onClick={() => deleteLesson(lesson.id)} title="Delete lesson">
                      <i className="bi bi-trash" />
                    </button>
                    <button className="btn btn-sm btn-outline-secondary px-2 py-1 lh-1"
                      onClick={() => {
                        const opening = activeLesson !== lesson.id;
                        setActiveLesson(opening ? lesson.id : null);
                        if (opening) {
                          (lesson.topics || []).forEach((t: any) => { initTopicForm(t.id); loadTopicContents(t.id); });
                        }
                      }}>
                      <i className={`bi ${activeLesson === lesson.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                    </button>
                  </div>

                  {activeLesson === lesson.id && (
                    <div className="p-3" style={{ background: 'var(--surface)' }}>
                      {(lesson.topics || []).length === 0 && (
                        <div className="text-muted small mb-3 ps-2">No topics yet. Add the first topic below.</div>
                      )}

                      {(lesson.topics || []).map((topic: any, ti: number) => (
                        <div key={topic.id} className="mb-3 border rounded-2 overflow-hidden"
                          draggable onDragStart={() => { topicDragRef._src = ti; }}
                          onDragOver={topicDrag.handleDragOver} onDrop={() => topicDrag.handleDrop(ti)}
                          style={{ background: 'var(--card-bg, #fff)', cursor: 'grab' }}>

                          <div className="d-flex align-items-center gap-2 p-2 flex-wrap">
                            <i className="bi bi-grip-vertical text-muted" style={{ fontSize: '0.85rem' }} />
                            <i className="bi bi-file-earmark-play text-muted" style={{ fontSize: '0.85rem' }} />

                            {topicEditing[topic.id] !== undefined ? (
                              <div className="d-flex align-items-center gap-1 flex-1">
                                <input className="form-control form-control-sm fw-600" style={{ fontSize: '0.82rem' }}
                                  value={topicEditing[topic.id] ?? ''} autoFocus
                                  onChange={e => setTopicEditing(prev => ({ ...prev, [topic.id]: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter')  saveInlineTopicTitle(lesson.id, topic);
                                    if (e.key === 'Escape') cancelTopicEdit(topic.id);
                                  }} />
                                <button className="btn btn-sm btn-success px-2 py-1"
                                  onClick={() => saveInlineTopicTitle(lesson.id, topic)} disabled={savingTopic === topic.id}>
                                  {savingTopic === topic.id
                                    ? <span className="spinner-border spinner-border-sm" style={{ width: '0.6rem', height: '0.6rem' }} />
                                    : <i className="bi bi-check" />}
                                </button>
                                <button className="btn btn-sm btn-outline-secondary px-2 py-1"
                                  onClick={() => cancelTopicEdit(topic.id)}><i className="bi bi-x" /></button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 fw-600" style={{ fontSize: '0.85rem' }}>
                                  <span className="text-muted me-1" style={{ fontSize: '0.72rem' }}>{li + 1}.{ti + 1}</span>
                                  {topic.title}
                                </span>
                                <button className="btn btn-sm btn-link text-muted p-0 px-1" title="Rename topic"
                                  onClick={() => startTopicEdit(topic.id, topic.title)}>
                                  <i className="bi bi-pencil" style={{ fontSize: '0.72rem' }} />
                                </button>
                              </>
                            )}

                            <button
                              className={`btn btn-sm ${topic.is_free_preview ? 'btn-success' : 'btn-outline-secondary'}`}
                              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                              title={topic.is_free_preview ? 'Free preview — click to remove' : 'Set as free preview'}
                              disabled={togglingPreview === topic.id}
                              onClick={() => toggleFreePreview(lesson.id, topic)}>
                              {togglingPreview === topic.id
                                ? <span className="spinner-border spinner-border-sm" style={{ width: '0.65rem', height: '0.65rem' }} />
                                : <><i className={`bi ${topic.is_free_preview ? 'bi-eye-fill' : 'bi-eye'} me-1`} />
                                    {topic.is_free_preview ? 'Free Preview' : 'Preview'}</>}
                            </button>

                            <label className="btn btn-sm btn-outline-primary mb-0" style={{ cursor: 'pointer', fontSize: '0.72rem' }}>
                              {uploadingContent === topic.id
                                ? <span className="spinner-border spinner-border-sm" />
                                : <><i className="bi bi-cloud-upload me-1" />Upload</>}
                              <input type="file" hidden onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) uploadTopicContent(topic.id, f);
                                e.target.value = '';
                              }} />
                            </label>

                            <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: '0.72rem' }}
                              title="Add text/article content"
                              onClick={() => {
                                initTopicForm(topic.id);
                                updateTopicForm(topic.id, {
                                  showTextEditor: !topicForms[topic.id]?.showTextEditor,
                                  ...(!topicForms[topic.id]?.showTextEditor && {
                                    textTitle: '', textBody: '', editContentId: undefined,
                                  }),
                                });
                              }}>
                              <i className="bi bi-pencil-square me-1" />Text
                            </button>

                            <QuizBuilderPanel topicId={topic.id} courseId={course.id} />

                            <button className="btn btn-sm btn-outline-danger" style={{ fontSize: '0.72rem' }}
                              onClick={() => deleteTopic(lesson.id, topic.id)} title="Delete topic">
                              <i className="bi bi-trash" />
                            </button>
                          </div>

                          {topicForms[topic.id]?.showTextEditor && (
                            <div className="p-3 border-top" style={{ background: 'var(--bg)' }}>
                              {topicForms[topic.id]?.editContentId && (
                                <div className="d-flex align-items-center gap-1 mb-2 text-primary" style={{ fontSize: '0.75rem' }}>
                                  <i className="bi bi-pencil-fill" /><span>Editing existing content</span>
                                </div>
                              )}
                              <div className="mb-2">
                                <label className="form-label fw-600 small mb-1">Content Title</label>
                                <input className="form-control form-control-sm"
                                  placeholder="e.g. Introduction, Chapter Summary…"
                                  value={topicForms[topic.id]?.textTitle ?? ''}
                                  onChange={e => updateTopicForm(topic.id, { textTitle: e.target.value })} />
                              </div>
                              <div className="mb-2">
                                <label className="form-label fw-600 small mb-1">Content Body</label>
                                <textarea className="form-control form-control-sm" rows={6}
                                  placeholder="Write your lesson content, article, or notes here…"
                                  value={topicForms[topic.id]?.textBody ?? ''}
                                  onChange={e => updateTopicForm(topic.id, { textBody: e.target.value })}
                                  style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }} />
                              </div>
                              <div className="d-flex gap-2 justify-content-end">
                                <button className="btn btn-sm btn-outline-secondary"
                                  onClick={() => updateTopicForm(topic.id, {
                                    showTextEditor: false, textTitle: '', textBody: '', editContentId: undefined,
                                  })}>Cancel</button>
                                <button className="btn btn-sm btn-primary fw-600"
                                  disabled={topicForms[topic.id]?.savingText}
                                  onClick={() => saveTextContent(topic.id)}>
                                  {topicForms[topic.id]?.savingText
                                    ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                                    : topicForms[topic.id]?.editContentId
                                      ? <><i className="bi bi-check me-1" />Update Content</>
                                      : <><i className="bi bi-check me-1" />Save Content</>}
                                </button>
                              </div>
                            </div>
                          )}

                          {(topicContents[topic.id] || []).length > 0 && (
                            <div className="border-top" style={{ fontSize: '0.78rem' }}>
                              {topicContents[topic.id].map((c: TopicContent) => (
                                <div key={c.id} className="d-flex align-items-center gap-2 px-3 py-2 border-bottom">
                                  <i className={`bi ${CONTENT_ICONS[c.content_type] ?? 'bi-file-earmark'} text-muted`} />
                                  <span className="flex-1 text-muted text-truncate" style={{ maxWidth: 280 }}>
                                    {c.title || c.file_path}
                                  </span>
                                  <span className="badge bg-light text-muted" style={{ fontSize: '0.65rem' }}>{c.content_type}</span>
                                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                    <i className="bi bi-shield-lock me-1" />Protected
                                  </span>
                                  {c.content_type === 'text' && (
                                    <button className="btn btn-sm btn-link text-primary p-0" title="Edit content"
                                      onClick={() => {
                                        initTopicForm(topic.id);
                                        updateTopicForm(topic.id, {
                                          showTextEditor: true, textTitle: c.title || '',
                                          textBody: c.body || '', editContentId: c.id,
                                        });
                                      }}>
                                      <i className="bi bi-pencil" />
                                    </button>
                                  )}
                                  <button className="btn btn-sm btn-link text-danger p-0"
                                    disabled={deletingContent === c.id}
                                    onClick={() => deleteTopicContent(topic.id, c.id)}>
                                    {deletingContent === c.id
                                      ? <span className="spinner-border spinner-border-sm" />
                                      : <i className="bi bi-x-circle" />}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {topicContents[topic.id] === undefined && (
                            <div className="px-3 py-2 text-muted border-top" style={{ fontSize: '0.75rem' }}>
                              <span className="spinner-border spinner-border-sm me-2" style={{ width: '0.7rem', height: '0.7rem' }} />
                              Loading content…
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="d-flex gap-2 mt-3">
                        <input className="form-control form-control-sm" placeholder="New topic title…"
                          value={getNewTopicTitle(lesson.id)}
                          onChange={e => setNewTopicTitle(lesson.id, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addTopic(lesson.id)} />
                        <button className="btn btn-sm btn-success" onClick={() => addTopic(lesson.id)}>
                          <i className="bi bi-plus me-1" />Add Topic
                        </button>
                      </div>

                      <LessonAssessmentPanel lessonId={lesson.id} courseId={course.id} />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="d-flex gap-2 mt-3 mb-4">
              <input className="form-control" placeholder="New lesson / section title…"
                value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLesson()} />
              <button className="btn btn-primary" onClick={addLesson}>
                <i className="bi bi-plus-circle me-1" />Add Lesson
              </button>
            </div>

            <ProjectBriefPanel courseId={course.id} />

            <div className="d-flex justify-content-between mt-2">
              <button className="btn btn-outline-secondary" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            STEP 2 — Media  (unchanged)
            ════════════════════════════════════ */}
        {step === 2 && course && (
          <div>
            <h5 className="fw-bold mb-4">Course Media</h5>
            <label className="form-label fw-600 small">Course Thumbnail</label>
            <div className="dropzone mb-4" onClick={() => thumbRef.current?.click()} style={{ cursor: 'pointer' }}>
              {thumbnailPreview
                ? <img src={thumbnailPreview} alt="Thumbnail preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8 }} />
                : <>
                    <i className="bi bi-image text-primary d-block mb-2" style={{ fontSize: '2rem' }} />
                    <div className="text-muted small">Click to upload thumbnail (JPG, PNG, WebP)</div>
                  </>}
              <input ref={thumbRef} type="file" accept="image/*" hidden
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setThumbnailPreview(URL.createObjectURL(f)); uploadThumbnail(f); }
                  e.target.value = '';
                }} />
            </div>
            <div className="alert alert-info d-flex gap-2" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-info-circle flex-shrink-0 mt-1" />
              Upload topic content (videos, PDFs, etc.) per topic in the Curriculum tab.
            </div>
            <div className="d-flex justify-content-between mt-4">
              <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            STEP 3 — Pricing  (complete rewrite)
            ════════════════════════════════════════════════════════
            Each billing model is an independent toggle card.
            Multiple models can be active at the same time — students
            see a pill-switcher on the detail page and pick whichever
            suits them.  All fee columns are saved on every submit so
            the backend _build_payment_types helper returns every
            active option correctly.
            ════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            <div className="mb-4">
              <h5 className="fw-bold mb-1">Pricing &amp; Access</h5>
              <p className="text-muted mb-0" style={{ fontSize: '0.82rem' }}>
                Enable one or more billing models. Students will see a selector on the course page
                and can choose whichever option works best for them.
              </p>
            </div>

            <div className="d-flex flex-column gap-3">

              {/* ── Free ─────────────────────────────────────────────────── */}
              <PaymentModelCard
                icon="bi-lightning-fill"
                label="Free"
                description="No payment required. Anyone can enrol immediately. Enabling this disables all paid options."
                enabled={pricing.is_free}
                accent="var(--success, #16a34a)"
                onToggle={v => setPricing(prev => ({
                  ...prev,
                  is_free: v,
                  // Turning on free clears paid toggles so the UI isn't ambiguous
                  ...(v && {
                    one_time_enabled:     false,
                    subscription_enabled: false,
                    payg_enabled:         false,
                  }),
                }))}
              />

              {/* ── One-time ─────────────────────────────────────────────── */}
              <PaymentModelCard
                icon="bi-credit-card"
                label="One-time Payment"
                description="Pay once, keep lifetime access. Best for self-paced courses."
                enabled={pricing.one_time_enabled}
                disabled={pricing.is_free}
                onToggle={v => setP('one_time_enabled', v)}
              >
                <div className="row g-3">
                  <div className="col-sm-5">
                    <label className="form-label fw-600 small mb-1">Price (₦)</label>
                    <div className="input-group">
                      <span className="input-group-text" style={{ fontSize: '0.82rem' }}>₦</span>
                      <input type="number" className="form-control" min={0}
                        value={pricing.one_time_fee}
                        onChange={e => setP('one_time_fee', Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              </PaymentModelCard>

              {/* ── Subscription ─────────────────────────────────────────── */}
              <PaymentModelCard
                icon="bi-arrow-repeat"
                label="Subscription"
                description="Recurring billing. Paystack handles renewals. Access continues while the subscription is active."
                enabled={pricing.subscription_enabled}
                disabled={pricing.is_free}
                accent="var(--info, #0284c7)"
                onToggle={v => setP('subscription_enabled', v)}
              >
                <div className="row g-3">
                  <div className="col-sm-5">
                    <label className="form-label fw-600 small mb-1">Subscription Fee (₦)</label>
                    <div className="input-group">
                      <span className="input-group-text" style={{ fontSize: '0.82rem' }}>₦</span>
                      <input type="number" className="form-control" min={0}
                        value={pricing.subscription_fee}
                        onChange={e => setP('subscription_fee', Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="col-sm-5">
                    <label className="form-label fw-600 small mb-1">Billing Interval</label>
                    <select className="form-select" value={pricing.subscription_interval}
                      onChange={e => setP('subscription_interval', e.target.value)}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </PaymentModelCard>

              {/* ── Pay-as-you-go ─────────────────────────────────────────── */}
              <PaymentModelCard
                icon="bi-calendar-check"
                label="Pay-as-you-go"
                description="Each payment buys a fixed window of access. Use topic limits below to control consumption within the window."
                enabled={pricing.payg_enabled}
                disabled={pricing.is_free}
                accent="var(--warning, #d97706)"
                onToggle={v => setP('payg_enabled', v)}
              >
                <div className="row g-3">
                  <div className="col-sm-5">
                    <label className="form-label fw-600 small mb-1">Fee per Window (₦)</label>
                    <div className="input-group">
                      <span className="input-group-text" style={{ fontSize: '0.82rem' }}>₦</span>
                      <input type="number" className="form-control" min={0}
                        value={pricing.payg_fee}
                        onChange={e => setP('payg_fee', Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="col-sm-5">
                    <label className="form-label fw-600 small mb-1">
                      Access Period <span className="text-muted fw-400">(days)</span>
                    </label>
                    <div className="input-group">
                      <input type="number" className="form-control" min={1}
                        value={pricing.access_period_days}
                        onChange={e => setP('access_period_days', Number(e.target.value))} />
                      <span className="input-group-text" style={{ fontSize: '0.82rem' }}>days</span>
                    </div>
                    <div className="form-text">Days of access per payment.</div>
                  </div>
                </div>
              </PaymentModelCard>

            </div>

            {/* ── Instructor-led add-on ────────────────────────────────────── */}
            {!pricing.is_free && (
              <div className="mt-3 p-3 rounded-3 border" style={{ borderColor: 'var(--border)' }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-person-video3 text-primary" />
                  <div>
                    <div className="fw-600" style={{ fontSize: '0.875rem' }}>Instructor-led Add-on</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Optional upgrade — students can add live sessions on top of any billing model.
                      Set to 0 to not offer it.
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-sm-5">
                    <label className="form-label fw-600 small mb-1">Instructor-led Fee (₦)</label>
                    <div className="input-group">
                      <span className="input-group-text" style={{ fontSize: '0.82rem' }}>₦</span>
                      <input type="number" className="form-control" min={0}
                        value={pricing.instructor_led_fee}
                        onChange={e => setP('instructor_led_fee', Number(e.target.value))} />
                    </div>
                    <div className="form-text">0 = option not offered.</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Content throttle ─────────────────────────────────────────── */}
            {!pricing.is_free && (pricing.subscription_enabled || pricing.payg_enabled) && (
              <div className="mt-3 p-3 rounded-3 border" style={{ borderColor: 'var(--border)' }}>
                <label className="d-flex align-items-center gap-2 mb-0" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" className="form-check-input mt-0"
                    checked={pricing.throttle_enabled}
                    onChange={e => setP('throttle_enabled', e.target.checked)} />
                  <div>
                    <span className="fw-600" style={{ fontSize: '0.875rem' }}>Content throttle</span>
                    <span className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>
                      Limit how many topics a student can access per week / month.
                      Useful for subscription and pay-as-you-go courses.
                    </span>
                  </div>
                </label>

                {pricing.throttle_enabled && (
                  <div className="row g-3 mt-1">
                    <div className="col-sm-5">
                      <label className="form-label fw-600 small mb-1">
                        Weekly limit <span className="text-muted fw-400">(topics)</span>
                      </label>
                      <div className="input-group">
                        <input type="number" className="form-control" min={1}
                          placeholder="No limit"
                          value={pricing.weekly_topic_limit}
                          onChange={e => setP('weekly_topic_limit', e.target.value === '' ? '' : Number(e.target.value))} />
                        <span className="input-group-text" style={{ fontSize: '0.82rem' }}>/ week</span>
                      </div>
                    </div>
                    <div className="col-sm-5">
                      <label className="form-label fw-600 small mb-1">
                        Monthly limit <span className="text-muted fw-400">(topics)</span>
                      </label>
                      <div className="input-group">
                        <input type="number" className="form-control" min={1}
                          placeholder="No limit"
                          value={pricing.monthly_topic_limit}
                          onChange={e => setP('monthly_topic_limit', e.target.value === '' ? '' : Number(e.target.value))} />
                        <span className="input-group-text" style={{ fontSize: '0.82rem' }}>/ month</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Active options summary ────────────────────────────────────── */}
            {!pricing.is_free && (pricing.one_time_enabled || pricing.subscription_enabled || pricing.payg_enabled) && (
              <div className="mt-3 p-3 rounded-3" style={{ background: 'var(--primary-light, rgba(99,102,241,0.06))', border: '1px solid var(--primary-border, #c7d2fe)' }}>
                <div className="fw-600 mb-2" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-check-circle-fill text-primary me-2" />
                  Students will be able to choose from:
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {pricing.one_time_enabled && pricing.one_time_fee > 0 && (
                    <span className="badge" style={{ background: 'var(--primary)', fontSize: '0.75rem', padding: '5px 10px' }}>
                      One-time · ₦{pricing.one_time_fee.toLocaleString()}
                    </span>
                  )}
                  {pricing.subscription_enabled && pricing.subscription_fee > 0 && (
                    <span className="badge bg-info" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                      {pricing.subscription_interval.charAt(0).toUpperCase() + pricing.subscription_interval.slice(1)}ly
                      {' '}· ₦{pricing.subscription_fee.toLocaleString()}
                    </span>
                  )}
                  {pricing.payg_enabled && pricing.payg_fee > 0 && (
                    <span className="badge bg-warning text-dark" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                      Pay-as-you-go · ₦{pricing.payg_fee.toLocaleString()} / {pricing.access_period_days}d
                    </span>
                  )}
                  {pricing.instructor_led_fee > 0 && (
                    <span className="badge bg-secondary" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                      + Instructor-led add-on · ₦{pricing.instructor_led_fee.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {pricing.is_free && (
              <div className="mt-3 p-3 rounded-3" style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.25)' }}>
                <i className="bi bi-lightning-fill text-success me-2" />
                <span style={{ fontSize: '0.82rem' }}>
                  This course is <strong>free</strong>. Students can enrol with one click, no payment required.
                </span>
              </div>
            )}

            <div className="d-flex justify-content-between mt-4">
              <button className="btn btn-outline-secondary" onClick={() => setStep(2)}>← Back</button>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary fw-600" onClick={() => saveCourse()} disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                    : 'Save Pricing'}
                </button>
                <button className="btn btn-primary fw-600" onClick={() => saveCourse(4)} disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                    : 'Save & Continue →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            STEP 4 — Publish  (unchanged)
            ════════════════════════════════════ */}
        {step === 4 && course && (
          <div className="text-center py-3">
            <div className="stat-icon green mx-auto mb-4" style={{ width: 80, height: 80, fontSize: '2rem' }}>
              <i className="bi bi-check-circle" />
            </div>
            <h5 className="fw-bold mb-2">
              {permissions.canPublishDirectly ? 'Manage Publication' : 'Ready to Publish!'}
            </h5>
            <p className="text-muted mb-4" style={{ maxWidth: 420, margin: '0 auto 1.5rem' }}>
              {permissions.canPublishDirectly
                ? 'You can publish, unpublish, or permanently delete this course.'
                : 'Submit your course for admin review. Once approved it will be visible to students.'}
            </p>

            <div className="card p-3 text-start mb-4" style={{ maxWidth: 400, margin: '0 auto 1.5rem' }}>
              <div className="fw-700 mb-2">{course.title}</div>
              <div className="d-flex gap-3 text-muted flex-wrap" style={{ fontSize: '0.8rem' }}>
                <span><i className="bi bi-collection me-1" />{course.lessons?.length ?? 0} lessons</span>
                <span className={`badge ${
                  course.status === 'published' ? 'bg-success' :
                  course.status === 'pending'   ? 'bg-warning text-dark' :
                  course.status === 'rejected'  ? 'bg-danger' : 'bg-secondary'
                }`}>{course.status}</span>
              </div>
              {/* Active billing options summary */}
              <div className="d-flex flex-wrap gap-1 mt-2">
                {pricing.is_free && (
                  <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>Free</span>
                )}
                {!pricing.is_free && pricing.one_time_enabled && pricing.one_time_fee > 0 && (
                  <span className="badge bg-primary" style={{ fontSize: '0.7rem' }}>
                    One-time ₦{pricing.one_time_fee.toLocaleString()}
                  </span>
                )}
                {!pricing.is_free && pricing.subscription_enabled && pricing.subscription_fee > 0 && (
                  <span className="badge bg-info" style={{ fontSize: '0.7rem' }}>
                    Sub ₦{pricing.subscription_fee.toLocaleString()}/{pricing.subscription_interval}
                  </span>
                )}
                {!pricing.is_free && pricing.payg_enabled && pricing.payg_fee > 0 && (
                  <span className="badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>
                    PAYG ₦{pricing.payg_fee.toLocaleString()}/{pricing.access_period_days}d
                  </span>
                )}
              </div>
            </div>

            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <button className="btn btn-outline-secondary" onClick={() => setStep(3)}>← Back</button>

              {!permissions.canPublishDirectly && (
                <>
                  {course.status !== 'pending' && course.status !== 'published' && (
                    <button className="btn btn-success fw-600" onClick={submitForApproval}>
                      <i className="bi bi-send me-2" />Submit for Review
                    </button>
                  )}
                  {course.status === 'pending' && (
                    <div className="alert alert-info mb-0 py-2 px-3" style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-hourglass-split me-2" />Under review.
                    </div>
                  )}
                  {course.status === 'published' && (
                    <div className="alert alert-success mb-0 py-2 px-3" style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-check-circle me-2" />Published!
                    </div>
                  )}
                  {course.status === 'rejected' && (
                    <div className="alert alert-danger mb-0 py-2 px-3 text-start" style={{ fontSize: '0.85rem', maxWidth: 380 }}>
                      <i className="bi bi-x-circle me-2" />Course was rejected. Update and re-submit.
                    </div>
                  )}
                </>
              )}

              {permissions.canPublishDirectly && (
                <>
                  {course.status !== 'published' && (
                    <button className="btn btn-success fw-600" onClick={publishDirectly} disabled={saving}>
                      {saving
                        ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                        : <><i className="bi bi-globe me-2" />Publish Now</>}
                    </button>
                  )}
                  {course.status === 'published' && (
                    <button className="btn btn-warning fw-600" disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const r = await coursesApi.update(course.id, { status: 'unpublished' });
                          setCourse(r.data); toast.success('Course unpublished');
                        } catch { toast.error('Failed to unpublish'); }
                        finally { setSaving(false); }
                      }}>
                      <i className="bi bi-eye-slash me-2" />Unpublish
                    </button>
                  )}
                  {permissions.canDeleteCourse && (
                    <button className="btn btn-outline-danger fw-600" onClick={deleteCourse} disabled={deleting}>
                      {deleting
                        ? <><span className="spinner-border spinner-border-sm me-1" />Deleting…</>
                        : <><i className="bi bi-trash me-2" />Delete Course</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
