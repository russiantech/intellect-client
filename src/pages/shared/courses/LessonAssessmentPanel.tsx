/* ─── 3. LessonAssessmentPanel — add BEFORE `export default function CourseEditor` ── */
 
import { assessmentsApi } from '@/services/api'; // add to your api service if not present
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import "@/styles/pages/courses/LessonAssessment.css"; // create this CSS file for styling the panel

// const ASSESSMENT_TYPES = [
//   { value: 'classwork', label: 'Classwork', icon: 'bi-pencil' },
//   { value: 'homework',  label: 'Homework',  icon: 'bi-house' },
//   { value: 'exam',      label: 'Exam',      icon: 'bi-file-earmark-check' },
// ];
 
// const AQTYPE_LABELS: Record<string, string> = {
//   mcq:          'Multiple Choice',
//   true_false:   'True / False',
//   short_answer: 'Short Answer',
//   essay:        'Essay',
//   fill_blank:   'Fill in the Blank',
// };
 
// export function LessonAssessmentPanel({
//   lessonId,
//   courseId,
// }: {
//   lessonId: number;
//   courseId: number;
// }) {
//   const [open,        setOpen]        = useState(false);
//   const [assessments, setAssessments] = useState<any[]>([]);
//   const [loading,     setLoading]     = useState(false);
//   const [saving,      setSaving]      = useState(false);
//   const [editId,      setEditId]      = useState<number | null>(null);
//   const [generating,  setGenerating]  = useState(false);
//   const [genCount,    setGenCount]    = useState(5);
//   const [genTypes,    setGenTypes]    = useState('mcq,short_answer');
 
//   const emptyForm = {
//     title:              '',
//     assessment_type:    'classwork',
//     instructions:       '',
//     total_marks:        100,
//     pass_mark:          50,
//     max_attempts:       2,
//     time_limit_minutes: 0,
//     due_date:           '',
//     shuffle_questions:  false,
//     show_answers_after: true,
//     is_auto_graded:     true,
//   };
//   const [form,      setForm]      = useState(emptyForm);
//   const [questions, setQuestions] = useState<any[]>([]);
//   const [currentQView, setCurrentQView] = useState<number | null>(null);
 
//   const load = () => {
//     setLoading(true);
//     assessmentsApi.getForLesson(lessonId)
//       .then(r => setAssessments(r.data || []))
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   };
 
//   useEffect(() => { if (open) load(); }, [open]);
 
//   const resetForm = () => {
//     setForm(emptyForm);
//     setQuestions([]);
//     setEditId(null);
//     setCurrentQView(null);
//   };
 
//   const startEdit = (a: any) => {
//     setEditId(a.id);
//     setForm({
//       title:              a.title,
//       assessment_type:    a.assessment_type,
//       instructions:       a.instructions || '',
//       total_marks:        a.total_marks,
//       pass_mark:          a.pass_mark,
//       max_attempts:       a.max_attempts,
//       time_limit_minutes: a.time_limit_minutes || 0,
//       due_date:           a.due_date ? a.due_date.split('T')[0] : '',
//       shuffle_questions:  a.shuffle_questions,
//       show_answers_after: a.show_answers_after,
//       is_auto_graded:     a.is_auto_graded,
//     });
//     setQuestions(
//       (a.questions || []).map((q: any) => ({
//         ...q,
//         options: q.options?.length
//           ? q.options
//           : [{ text: '', is_correct: false }, { text: '', is_correct: false }],
//       }))
//     );
//     setCurrentQView(0);
//   };
 
//   const addQuestion = () => {
//     const newQ = {
//       body: '', question_type: 'mcq', marks: 10, partial_credit: false,
//       options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
//       correct_answer: '', explanation: '',
//     };
//     setQuestions(prev => [...prev, newQ]);
//     setCurrentQView(questions.length); // jump to new question
//   };
 
//   const removeQuestion = (i: number) => {
//     setQuestions(prev => prev.filter((_, idx) => idx !== i));
//     setCurrentQView(prev => (prev !== null && prev >= i) ? Math.max(0, prev - 1) : prev);
//   };
 
//   const updateQuestion = (i: number, patch: any) =>
//     setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q));
 
//   const updateOption = (qi: number, oi: number, patch: any) =>
//     setQuestions(prev => prev.map((q, idx) => idx === qi
//       ? { ...q, options: q.options.map((o: any, oidx: number) => oidx === oi ? { ...o, ...patch } : o) }
//       : q));
 
//   const addOption = (qi: number) =>
//     setQuestions(prev => prev.map((q, idx) => idx === qi
//       ? { ...q, options: [...(q.options || []), { text: '', is_correct: false }] }
//       : q));
 
//   const removeOption = (qi: number, oi: number) =>
//     setQuestions(prev => prev.map((q, idx) => idx === qi
//       ? { ...q, options: q.options.filter((_: any, oidx: number) => oidx !== oi) }
//       : q));
 
//   const buildPayload = () => ({
//     title:              form.title.trim() || 'Lesson Assessment',
//     instructions:       form.instructions || undefined,
//     assessment_type:    form.assessment_type,
//     lesson_id:          lessonId,
//     course_id:          courseId,
//     total_marks:        form.total_marks,
//     pass_mark:          form.pass_mark,
//     max_attempts:       form.max_attempts,
//     time_limit_minutes: form.time_limit_minutes || undefined,
//     due_date:           form.due_date || undefined,
//     shuffle_questions:  form.shuffle_questions,
//     show_answers_after: form.show_answers_after,
//     is_auto_graded:     form.is_auto_graded,
//     questions: questions.map((q, i) => ({
//       body:           q.body,
//       question_type:  q.question_type,
//       marks:          q.marks,
//       partial_credit: q.partial_credit,
//       order_index:    i,
//       options: q.question_type === 'mcq'
//         ? q.options
//         : undefined,
//       correct_answer: q.question_type !== 'mcq' ? q.correct_answer : undefined,
//       explanation:    q.explanation || undefined,
//     })),
//   });
 
//   const save = async () => {
//     if (!form.title.trim())     { toast.error('Title is required'); return; }
//     if (questions.length === 0) { toast.error('Add at least one question'); return; }
//     setSaving(true);
//     try {
//       editId
//         ? await assessmentsApi.update(editId, buildPayload())
//         : await assessmentsApi.create(buildPayload());
//       toast.success(editId ? 'Assessment updated!' : 'Assessment created!');
//       resetForm();
//       setOpen(false);
//       load();
//     } catch (e: any) {
//       toast.error(e.response?.data?.detail || 'Save failed');
//     } finally { setSaving(false); }
//   };
 
//   const del = async (id: number) => {
//     if (!window.confirm('Deactivate this assessment?')) return;
//     try {
//       await assessmentsApi.delete(id);
//       toast.success('Assessment removed');
//       load();
//     } catch { toast.error('Failed to remove'); }
//   };
 
//   const generateWithAI = async (assessmentId?: number) => {
//     const targetId = assessmentId ?? editId;
//     if (!targetId) { toast.error('Save the assessment first, then generate questions'); return; }
//     setGenerating(true);
//     try {
//       const r = await assessmentsApi.aiGenerate(targetId, {
//         count: genCount,
//         question_types: genTypes,
//       });
//       const generated = (r.data.questions || []).map((q: any) => ({
//         ...q,
//         options: q.options || [{ text: '', is_correct: false }, { text: '', is_correct: false }],
//       }));
//       setQuestions(prev => [...prev, ...generated]);
//       setCurrentQView(questions.length); // jump to first new question
//       toast.success(`${generated.length} questions generated!`);
//     } catch { toast.error('AI generation failed'); }
//     finally { setGenerating(false); }
//   };
 
//   /* Render one question in multistep editor */
//   const renderQuestionEditor = (q: any, qi: number) => (
//     <div className="quiz-question-editor" key={qi}>
//       <div className="d-flex align-items-center gap-2 mb-2">
//         <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.65rem' }}>
//           Q{qi + 1}
//         </span>
//         <select
//           className="form-select form-select-sm" style={{ width: 170 }}
//           value={q.question_type}
//           onChange={e => updateQuestion(qi, { question_type: e.target.value })}
//         >
//           {Object.entries(AQTYPE_LABELS).map(([v, l]) => (
//             <option key={v} value={v}>{l}</option>
//           ))}
//         </select>
//         <input
//           type="number" className="form-control form-control-sm" style={{ width: 65 }}
//           min={1} value={q.marks} title="Marks"
//           onChange={e => updateQuestion(qi, { marks: Number(e.target.value) })}
//         />
//         <span className="text-muted small">mark{q.marks !== 1 ? 's' : ''}</span>
//         <label className="d-flex align-items-center gap-1 mb-0 ms-auto small" style={{ cursor: 'pointer', fontSize: '0.75rem' }}>
//           <input type="checkbox" checked={q.partial_credit}
//             onChange={e => updateQuestion(qi, { partial_credit: e.target.checked })} />
//           Partial
//         </label>
//         <button className="btn btn-sm btn-outline-danger" onClick={() => removeQuestion(qi)}>
//           <i className="bi bi-trash" />
//         </button>
//       </div>
 
//       <textarea
//         className="form-control form-control-sm mb-2" rows={2}
//         placeholder="Question text…" value={q.body}
//         onChange={e => updateQuestion(qi, { body: e.target.value })}
//         style={{ fontSize: '0.82rem', resize: 'vertical' }}
//       />
 
//       {/* MCQ options */}
//       {q.question_type === 'mcq' && (
//         <div className="quiz-options-editor">
//           {(q.options || []).map((opt: any, oi: number) => (
//             <div key={oi} className="d-flex align-items-center gap-2 mb-1">
//               <input type="checkbox" checked={opt.is_correct} title="Correct"
//                 onChange={e => updateOption(qi, oi, { is_correct: e.target.checked })} />
//               <input
//                 className="form-control form-control-sm"
//                 placeholder={`Option ${oi + 1}`}
//                 value={opt.text} style={{ fontSize: '0.8rem' }}
//                 onChange={e => updateOption(qi, oi, { text: e.target.value })}
//               />
//               {q.options.length > 2 && (
//                 <button className="btn btn-sm btn-outline-danger p-0 px-1"
//                   onClick={() => removeOption(qi, oi)}>
//                   <i className="bi bi-dash" />
//                 </button>
//               )}
//             </div>
//           ))}
//           <button className="btn btn-sm btn-link p-0" style={{ fontSize: '0.75rem' }}
//             onClick={() => addOption(qi)}>
//             <i className="bi bi-plus me-1" />Add option
//           </button>
//         </div>
//       )}
 
//       {/* True / False */}
//       {q.question_type === 'true_false' && (
//         <div className="d-flex gap-2 mb-2">
//           <select className="form-select form-select-sm" value={q.correct_answer || 'True'}
//             style={{ width: 120 }}
//             onChange={e => updateQuestion(qi, { correct_answer: e.target.value })}>
//             <option value="True">True</option>
//             <option value="False">False</option>
//           </select>
//           <span className="text-muted small align-self-center">= Correct answer</span>
//         </div>
//       )}
 
//       {/* Short answer / fill blank */}
//       {(q.question_type === 'short_answer' || q.question_type === 'fill_blank') && (
//         <input className="form-control form-control-sm mb-2"
//           placeholder="Expected answer (keyword match)…"
//           value={q.correct_answer || ''} style={{ fontSize: '0.8rem' }}
//           onChange={e => updateQuestion(qi, { correct_answer: e.target.value })} />
//       )}
 
//       {/* Essay */}
//       {q.question_type === 'essay' && (
//         <div className="text-muted small mb-2" style={{ fontSize: '0.78rem' }}>
//           <i className="bi bi-info-circle me-1" />Essay questions are graded by AI or tutor.
//         </div>
//       )}
 
//       <input className="form-control form-control-sm"
//         placeholder="Explanation (optional)…"
//         value={q.explanation || ''} style={{ fontSize: '0.78rem' }}
//         onChange={e => updateQuestion(qi, { explanation: e.target.value })} />
//     </div>
//   );
 
//   const typeInfo = ASSESSMENT_TYPES.find(t => t.value === form.assessment_type);
 
//   return (
//     <div className="lesson-assessment-section mt-3">
//       {/* Header row */}
//       <div className="d-flex align-items-center gap-2 mb-2">
//         <i className="bi bi-file-earmark-check text-warning" />
//         <span className="fw-600 small">Lesson Assessments</span>
//         {assessments.length > 0 && (
//           <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>
//             {assessments.length}
//           </span>
//         )}
//         <button
//           className="btn btn-sm btn-outline-warning ms-auto"
//           style={{ fontSize: '0.75rem' }}
//           onClick={() => {
//             if (open && !editId) { setOpen(false); resetForm(); }
//             else { setOpen(true); resetForm(); }
//           }}
//         >
//           <i className={`bi ${open && !editId ? 'bi-chevron-up' : 'bi-plus-circle'} me-1`} />
//           {open && !editId ? 'Close' : 'Add Assessment'}
//         </button>
//       </div>
 
//       {/* Existing assessments list */}
//       {loading ? (
//         <div className="text-muted small">
//           <span className="spinner-border spinner-border-sm me-2" />Loading…
//         </div>
//       ) : (
//         assessments.map(a => (
//           <div key={a.id}
//             className="d-flex align-items-center gap-2 p-2 border rounded mb-1"
//             style={{ fontSize: '0.82rem' }}>
//             <i className={`bi ${ASSESSMENT_TYPES.find(t => t.value === a.assessment_type)?.icon ?? 'bi-file-earmark'} text-warning`} />
//             <div style={{ flex: 1 }}>
//               <span className="fw-600">{a.title}</span>
//               <span className="badge bg-secondary-subtle text-secondary ms-2" style={{ fontSize: '0.62rem' }}>
//                 {a.assessment_type}
//               </span>
//             </div>
//             <span className="text-muted" style={{ fontSize: '0.72rem' }}>
//               {a.questions_count} q · {a.total_marks}pts
//             </span>
//             <button className="btn btn-sm btn-outline-secondary p-0 px-2"
//               onClick={() => { setOpen(true); startEdit(a); }}
//               title="Edit">
//               <i className="bi bi-pencil" />
//             </button>
//             <button className="btn btn-sm btn-outline-danger p-0 px-2"
//               onClick={() => del(a.id)} title="Remove">
//               <i className="bi bi-trash" />
//             </button>
//           </div>
//         ))
//       )}
 
//       {/* Create / Edit form */}
//       {open && (
//         <div className="assessment-builder-panel mt-2">
//           {/* Panel header */}
//           <div className="quiz-builder-head">
//             <span className="fw-700" style={{ fontSize: '0.875rem' }}>
//               <i className={`bi ${typeInfo?.icon ?? 'bi-file-earmark-check'} text-warning me-2`} />
//               {editId ? 'Edit Assessment' : 'New Assessment'}
//             </span>
//             <div className="d-flex gap-2">
//               <button className="btn btn-sm btn-outline-secondary"
//                 onClick={() => { setOpen(false); resetForm(); }}>
//                 <i className="bi bi-x-lg" />
//               </button>
//             </div>
//           </div>
 
//           {/* ── Settings ── */}
//           <div className="row g-2 mb-3">
//             <div className="col-12 col-sm-6">
//               <label className="form-label fw-600 small mb-1">Title *</label>
//               <input className="form-control form-control-sm"
//                 value={form.title}
//                 onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
//                 placeholder="e.g. Week 1 Classwork" />
//             </div>
//             <div className="col-6 col-sm-3">
//               <label className="form-label fw-600 small mb-1">Type</label>
//               <select className="form-select form-select-sm"
//                 value={form.assessment_type}
//                 onChange={e => setForm(p => ({ ...p, assessment_type: e.target.value }))}>
//                 {ASSESSMENT_TYPES.map(t => (
//                   <option key={t.value} value={t.value}>{t.label}</option>
//                 ))}
//               </select>
//             </div>
//             <div className="col-6 col-sm-3">
//               <label className="form-label fw-600 small mb-1">Due Date</label>
//               <input type="date" className="form-control form-control-sm"
//                 value={form.due_date}
//                 onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
//             </div>
 
//             <div className="col-4">
//               <label className="form-label fw-600 small mb-1">Total Marks</label>
//               <input type="number" className="form-control form-control-sm" min={1}
//                 value={form.total_marks}
//                 onChange={e => setForm(p => ({ ...p, total_marks: Number(e.target.value) }))} />
//             </div>
//             <div className="col-4">
//               <label className="form-label fw-600 small mb-1">Pass Mark</label>
//               <input type="number" className="form-control form-control-sm" min={0}
//                 value={form.pass_mark}
//                 onChange={e => setForm(p => ({ ...p, pass_mark: Number(e.target.value) }))} />
//             </div>
//             <div className="col-4">
//               <label className="form-label fw-600 small mb-1">Attempts</label>
//               <input type="number" className="form-control form-control-sm" min={1}
//                 value={form.max_attempts}
//                 onChange={e => setForm(p => ({ ...p, max_attempts: Number(e.target.value) }))} />
//             </div>
 
//             <div className="col-12">
//               <label className="form-label fw-600 small mb-1">Instructions <span className="text-muted">(optional)</span></label>
//               <textarea className="form-control form-control-sm" rows={2}
//                 value={form.instructions}
//                 onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
//                 placeholder="Instructions shown to students before they start…"
//                 style={{ resize: 'vertical', fontSize: '0.82rem' }} />
//             </div>
 
//             <div className="col-12 d-flex gap-4" style={{ fontSize: '0.8rem' }}>
//               <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
//                 <input type="checkbox" checked={form.shuffle_questions}
//                   onChange={e => setForm(p => ({ ...p, shuffle_questions: e.target.checked }))} />
//                 Shuffle questions
//               </label>
//               <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
//                 <input type="checkbox" checked={form.show_answers_after}
//                   onChange={e => setForm(p => ({ ...p, show_answers_after: e.target.checked }))} />
//                 Show answers after
//               </label>
//               <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
//                 <input type="checkbox" checked={form.is_auto_graded}
//                   onChange={e => setForm(p => ({ ...p, is_auto_graded: e.target.checked }))} />
//                 AI auto-grade
//               </label>
//             </div>
//           </div>
 
//           {/* ── AI Generate row ── */}
//           <div className="quiz-ai-gen-row mb-3">
//             <span className="fw-600 small">
//               <i className="bi bi-stars text-primary me-1" />AI Generate
//             </span>
//             <input type="number" className="form-control form-control-sm" style={{ width: 60 }}
//               min={1} max={20} value={genCount}
//               onChange={e => setGenCount(Number(e.target.value))} title="# of questions" />
//             <select className="form-select form-select-sm" style={{ width: 180 }}
//               value={genTypes} onChange={e => setGenTypes(e.target.value)}>
//               <option value="mcq">MCQ only</option>
//               <option value="short_answer">Short Answer only</option>
//               <option value="essay">Essay only</option>
//               <option value="mcq,short_answer">MCQ + Short Answer</option>
//               <option value="mcq,true_false">MCQ + True/False</option>
//               <option value="mcq,short_answer,essay">All types</option>
//             </select>
//             <button className="btn btn-sm btn-outline-primary"
//               onClick={() => generateWithAI(editId ?? undefined)}
//               disabled={generating}>
//               {generating
//                 ? <><span className="spinner-border spinner-border-sm me-1" />Generating…</>
//                 : <><i className="bi bi-magic me-1" />Generate</>}
//             </button>
//           </div>
 
//           {/* ── Questions — multistep ── */}
//           <div style={{ marginBottom: '0.75rem' }}>
//             <div className="d-flex align-items-center justify-content-between mb-2">
//               <span className="fw-600 small">
//                 Questions
//                 {questions.length > 0 && (
//                   <span className="badge bg-secondary-subtle text-secondary ms-2" style={{ fontSize: '0.65rem' }}>
//                     {questions.length}
//                   </span>
//                 )}
//               </span>
//               {questions.length > 0 && (
//                 <div className="d-flex align-items-center gap-2">
//                   {/* Step dots */}
//                   <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
//                     {questions.map((_, i) => (
//                       <button key={i}
//                         className={[
//                           'quiz-step-dot',
//                           i === currentQView ? 'active' : '',
//                           questions[i]?.body ? 'answered' : '',
//                         ].filter(Boolean).join(' ')}
//                         onClick={() => setCurrentQView(i)}
//                         title={`Question ${i + 1}`}
//                       />
//                     ))}
//                   </div>
//                   <span className="text-muted" style={{ fontSize: '0.72rem' }}>
//                     {currentQView !== null ? currentQView + 1 : '–'} / {questions.length}
//                   </span>
//                 </div>
//               )}
//             </div>
 
//             {questions.length === 0 ? (
//               <div className="text-center text-muted small py-3 border rounded-2">
//                 No questions yet. Add manually or use AI Generate above.
//               </div>
//             ) : currentQView !== null && questions[currentQView] ? (
//               <>
//                 {renderQuestionEditor(questions[currentQView], currentQView)}
//                 {/* Question nav */}
//                 <div className="learn-quiz-nav-row mt-2">
//                   <button className="btn btn-outline-secondary btn-sm"
//                     onClick={() => setCurrentQView(p => p !== null ? p - 1 : 0)}
//                     disabled={currentQView === 0}>
//                     <i className="bi bi-arrow-left me-1" />Prev
//                   </button>
//                   <button className="btn btn-outline-secondary btn-sm ms-auto"
//                     onClick={() => setCurrentQView(p => p !== null ? p + 1 : 0)}
//                     disabled={currentQView === questions.length - 1}>
//                     Next<i className="bi bi-arrow-right ms-1" />
//                   </button>
//                 </div>
//               </>
//             ) : null}
//           </div>
 
//           <button className="btn btn-sm btn-outline-secondary w-100 mb-3" onClick={addQuestion}>
//             <i className="bi bi-plus-circle me-1" />Add Question
//           </button>
 
//           {/* ── Save / Cancel ── */}
//           <div className="d-flex justify-content-end gap-2 pt-3"
//             style={{ borderTop: '1px solid var(--border, #e2e8f0)' }}>
//             <button className="btn btn-sm btn-outline-secondary"
//               onClick={() => { setOpen(false); resetForm(); }}>
//               Cancel
//             </button>
//             <button className="btn btn-sm btn-warning fw-600 text-dark" onClick={save} disabled={saving}>
//               {saving
//                 ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
//                 : <><i className="bi bi-check me-1" />{editId ? 'Update' : 'Create'} Assessment</>}
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



// v2
/* ── Assessment type metadata ─────────────────────────────── */
const ASSESSMENT_TYPES = [
  { value: 'classwork', label: 'Classwork', icon: 'bi-pencil'              },
  { value: 'homework',  label: 'Homework',  icon: 'bi-house'               },
  { value: 'exam',      label: 'Exam',      icon: 'bi-file-earmark-check'  },
] as const;
 
const AQTYPE_LABELS: Record<string, string> = {
  mcq:          'Multiple Choice',
  true_false:   'True / False',
  short_answer: 'Short Answer',
  essay:        'Essay',
  fill_blank:   'Fill in the Blank',
};
 
/* ═══════════════════════════════════════════════════════════
   LessonAssessmentPanel
   Self-contained assessment CRUD per lesson.
   Place inside the topic list, after "Add topic row".
   ═══════════════════════════════════════════════════════════ */
export function LessonAssessmentPanel({
  lessonId,
  courseId,
}: {
  lessonId: number;
  courseId: number;
}) {
  const [open,        setOpen]        = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [editId,      setEditId]      = useState<number | null>(null);
  const [generating,  setGenerating]  = useState(false);
  const [genCount,    setGenCount]    = useState(5);
  const [genTypes,    setGenTypes]    = useState('mcq,short_answer');
  const [currentQIdx, setCurrentQIdx] = useState(0);
 
  /* ── Empty form defaults ── */
  const emptyForm = {
    title:              '',
    assessment_type:    'classwork' as string,
    instructions:       '',
    total_marks:        100,
    pass_mark:          50,
    max_attempts:       2,
    time_limit_minutes: 0,
    due_date:           '',
    shuffle_questions:  false,
    show_answers_after: true,
    is_auto_graded:     true,
  };
  const [form,      setForm]      = useState(emptyForm);
  const [questions, setQuestions] = useState<any[]>([]);
 
  /* ── Load assessments from server ── */
  const load = useCallback(() => {
    if (!assessmentsApi?.getForLesson) return; // guard: api not wired yet
    setLoading(true);
    assessmentsApi.getForLesson(lessonId)
      .then(r => setAssessments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAssessments([]))           // never crash — just show empty
      .finally(() => setLoading(false));
  }, [lessonId]);
 
  useEffect(() => { if (open) load(); }, [open, load]);
 
  /* ── Form helpers ── */
  const resetForm = () => {
    setForm(emptyForm); setQuestions([]); setEditId(null); setCurrentQIdx(0);
  };
 
  const startEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      title:              a.title,
      assessment_type:    a.assessment_type,
      instructions:       a.instructions        || '',
      total_marks:        a.total_marks,
      pass_mark:          a.pass_mark,
      max_attempts:       a.max_attempts,
      time_limit_minutes: a.time_limit_minutes  || 0,
      due_date:           a.due_date ? a.due_date.split('T')[0] : '',
      shuffle_questions:  a.shuffle_questions,
      show_answers_after: a.show_answers_after,
      is_auto_graded:     a.is_auto_graded,
    });
    const qs = (a.questions || []).map((q: any) => ({
      ...q,
      options: q.options?.length
        ? q.options
        : [{ text: '', is_correct: false }, { text: '', is_correct: false }],
    }));
    setQuestions(qs);
    setCurrentQIdx(0);
    setOpen(true);
  };
 
  /* ── Question CRUD ── */
  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        body: '', question_type: 'mcq', marks: 10, partial_credit: false,
        options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
        correct_answer: '', explanation: '',
      },
    ]);
    setCurrentQIdx(questions.length); // jump to the new question
  };
 
  const removeQuestion = (i: number) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
    setCurrentQIdx(prev => Math.max(0, i === prev ? prev - 1 : prev < i ? prev : prev - 1));
  };
 
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
 
  /* ── Build API payload ── */
  const buildPayload = () => ({
    title:              form.title.trim() || 'Lesson Assessment',
    instructions:       form.instructions || undefined,
    assessment_type:    form.assessment_type,
    lesson_id:          lessonId,
    course_id:          courseId,
    total_marks:        form.total_marks,
    pass_mark:          form.pass_mark,
    max_attempts:       form.max_attempts,
    time_limit_minutes: form.time_limit_minutes || undefined,
    due_date:           form.due_date || undefined,
    shuffle_questions:  form.shuffle_questions,
    show_answers_after: form.show_answers_after,
    is_auto_graded:     form.is_auto_graded,
    questions: questions.map((q, i) => ({
      body:           q.body,
      question_type:  q.question_type,
      marks:          q.marks,
      partial_credit: q.partial_credit,
      order_index:    i,
      options:        q.question_type === 'mcq' ? q.options : undefined,
      correct_answer: q.question_type !== 'mcq' ? q.correct_answer : undefined,
      explanation:    q.explanation || undefined,
    })),
  });
 
  /* ── Save ── */
  const save = async () => {
    if (!form.title.trim())     { toast.error('Title is required'); return; }
    if (questions.length === 0) { toast.error('Add at least one question'); return; }
    setSaving(true);
    try {
      if (editId) {
        await assessmentsApi.update(editId, buildPayload());
      } else {
        await assessmentsApi.create(buildPayload());
      }
      toast.success(editId ? 'Assessment updated!' : 'Assessment created!');
      resetForm();
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };
 
  /* ── Delete ── */
  const del = async (id: number) => {
    if (!window.confirm('Remove this assessment?')) return;
    try {
      await assessmentsApi.delete(id);
      toast.success('Assessment removed');
      load();
    } catch { toast.error('Failed to remove'); }
  };
 
  /* ── AI generate ── */
  const generateWithAI = async () => {
    if (!editId) {
      toast.error('Save the assessment first, then use AI Generate');
      return;
    }
    setGenerating(true);
    try {
      const r = await assessmentsApi.aiGenerate(editId, {
        count: genCount,
        question_types: genTypes,
      });
      const generated = (r.data.questions || []).map((q: any) => ({
        ...q,
        options: q.options || [{ text: '', is_correct: false }, { text: '', is_correct: false }],
      }));
      setQuestions(prev => {
        const next = [...prev, ...generated];
        setCurrentQIdx(prev.length); // jump to first new question
        return next;
      });
      toast.success(`${generated.length} questions generated!`);
    } catch { toast.error('AI generation failed'); }
    finally { setGenerating(false); }
  };
 
  /* ── Render a single question editor ── */
  const renderQuestionEditor = (q: any, qi: number) => (
    <div className="quiz-question-editor">
      {/* Meta row */}
      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
        <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.65rem' }}>
          Q{qi + 1}
        </span>
        <select className="form-select form-select-sm" style={{ width: 170 }}
          value={q.question_type}
          onChange={e => updateQuestion(qi, { question_type: e.target.value })}>
          {Object.entries(AQTYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input type="number" className="form-control form-control-sm" style={{ width: 65 }}
          min={1} value={q.marks} title="Marks"
          onChange={e => updateQuestion(qi, { marks: Number(e.target.value) })} />
        <span className="text-muted small">mark{q.marks !== 1 ? 's' : ''}</span>
        <label className="d-flex align-items-center gap-1 mb-0 ms-auto"
          style={{ cursor: 'pointer', fontSize: '0.75rem' }}>
          <input type="checkbox" checked={q.partial_credit}
            onChange={e => updateQuestion(qi, { partial_credit: e.target.checked })} />
          Partial credit
        </label>
        <button className="btn btn-sm btn-outline-danger" onClick={() => removeQuestion(qi)}>
          <i className="bi bi-trash" />
        </button>
      </div>
 
      {/* Question body */}
      <textarea className="form-control form-control-sm mb-2" rows={2}
        placeholder="Question text…" value={q.body}
        onChange={e => updateQuestion(qi, { body: e.target.value })}
        style={{ fontSize: '0.82rem', resize: 'vertical' }} />
 
      {/* MCQ options */}
      {q.question_type === 'mcq' && (
        <div className="quiz-options-editor">
          {(q.options || []).map((opt: any, oi: number) => (
            <div key={oi} className="d-flex align-items-center gap-2 mb-1">
              <input type="checkbox" checked={opt.is_correct} title="Correct answer"
                onChange={e => updateOption(qi, oi, { is_correct: e.target.checked })} />
              <input className="form-control form-control-sm"
                placeholder={`Option ${oi + 1}`} value={opt.text}
                style={{ fontSize: '0.8rem' }}
                onChange={e => updateOption(qi, oi, { text: e.target.value })} />
              {q.options.length > 2 && (
                <button className="btn btn-sm btn-outline-danger p-0 px-1"
                  onClick={() => removeOption(qi, oi)}>
                  <i className="bi bi-dash" />
                </button>
              )}
            </div>
          ))}
          <button className="btn btn-sm btn-link p-0" style={{ fontSize: '0.75rem' }}
            onClick={() => addOption(qi)}>
            <i className="bi bi-plus me-1" />Add option
          </button>
        </div>
      )}
 
      {/* True / False */}
      {q.question_type === 'true_false' && (
        <div className="d-flex gap-2 mb-2">
          <select className="form-select form-select-sm" style={{ width: 120 }}
            value={q.correct_answer || 'True'}
            onChange={e => updateQuestion(qi, { correct_answer: e.target.value })}>
            <option value="True">True</option>
            <option value="False">False</option>
          </select>
          <span className="text-muted small align-self-center">= Correct answer</span>
        </div>
      )}
 
      {/* Short answer / fill blank */}
      {(q.question_type === 'short_answer' || q.question_type === 'fill_blank') && (
        <input className="form-control form-control-sm mb-2"
          placeholder="Expected answer (keyword match)…"
          value={q.correct_answer || ''} style={{ fontSize: '0.8rem' }}
          onChange={e => updateQuestion(qi, { correct_answer: e.target.value })} />
      )}
 
      {/* Essay — no correct_answer field */}
      {q.question_type === 'essay' && (
        <div className="text-muted small mb-2" style={{ fontSize: '0.78rem' }}>
          <i className="bi bi-info-circle me-1" />
          Essay answers are graded by AI or tutor.
        </div>
      )}
 
      {/* Explanation */}
      <input className="form-control form-control-sm"
        placeholder="Explanation (optional)…"
        value={q.explanation || ''} style={{ fontSize: '0.78rem' }}
        onChange={e => updateQuestion(qi, { explanation: e.target.value })} />
    </div>
  );
 
  const typeInfo = ASSESSMENT_TYPES.find(t => t.value === form.assessment_type);
 
  /* ── Render ── */
  return (
    <div className="lesson-assessment-section mt-3" style={{ background: 'var(--bg)' }}>
 
      {/* ── Section header — always visible ── */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className="bi bi-file-earmark-check text-warning" style={{ fontSize: '0.9rem' }} />
        <span className="fw-600 small">Lesson Assessments</span>
        {assessments.length > 0 && (
          <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>
            {assessments.length}
          </span>
        )}
        <button
          className="btn btn-sm btn-outline-warning ms-auto"
          style={{ fontSize: '0.72rem' }}
          onClick={() => {
            if (open && !editId) { setOpen(false); resetForm(); }
            else { resetForm(); setOpen(true); }
          }}
        >
          <i className={`bi ${open && !editId ? 'bi-chevron-up' : 'bi-plus-circle'} me-1`} />
          {open && !editId ? 'Close' : 'Add Assessment'}
        </button>
      </div>
 
      {/* ── Existing list ── */}
      {loading ? (
        <div className="text-muted small ps-1">
          <span className="spinner-border spinner-border-sm me-2" />Loading…
        </div>
      ) : (
        assessments.map(a => {
          const typeIcon = ASSESSMENT_TYPES.find(t => t.value === a.assessment_type)?.icon ?? 'bi-file-earmark';
          return (
            <div key={a.id}
              className="d-flex align-items-center gap-2 p-2 border rounded mb-1"
              style={{ fontSize: '0.82rem' }}>
              <i className={`bi ${typeIcon} text-warning`} />
              <div style={{ flex: 1 }}>
                <span className="fw-600">{a.title}</span>
                <span className="badge bg-secondary-subtle text-secondary ms-2"
                  style={{ fontSize: '0.62rem' }}>
                  {a.assessment_type}
                </span>
              </div>
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                {a.questions_count ?? 0}q · {a.total_marks}pts
              </span>
              <button className="btn btn-sm btn-outline-secondary p-0 px-2"
                title="Edit" onClick={() => startEdit(a)}>
                <i className="bi bi-pencil" />
              </button>
              <button className="btn btn-sm btn-outline-danger p-0 px-2"
                title="Remove" onClick={() => del(a.id)}>
                <i className="bi bi-trash" />
              </button>
            </div>
          );
        })
      )}
 
      {/* ── Create / Edit form ── */}
      {open && (
        <div className="assessment-builder-panel mt-2">
 
          {/* Panel header */}
          <div className="quiz-builder-head bg-white rounded-pill">
            <span className="fw-700" style={{ fontSize: '0.875rem' }}>
              <i className={`bi ${typeInfo?.icon ?? 'bi-file-earmark-check'} text-warning me-2`} />
              {editId ? 'Edit Assessment' : 'New Assessment'}
            </span>
            <button className="btn btn-sm btn-outline-secondary"
              onClick={() => { setOpen(false); resetForm(); }}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
 
          {/* ── Settings ── */}
          <div className="row g-2 mb-3">
            <div className="col-12 col-sm-6">
              <label className="form-label fw-600 small mb-1">Title *</label>
              <input className="form-control form-control-sm"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Week 1 Classwork" />
            </div>
            <div className="col-6 col-sm-3">
              <label className="form-label fw-600 small mb-1">Type</label>
              <select className="form-select form-select-sm"
                value={form.assessment_type}
                onChange={e => setForm(p => ({ ...p, assessment_type: e.target.value }))}>
                {ASSESSMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-sm-3">
              <label className="form-label fw-600 small mb-1">Due Date</label>
              <input type="date" className="form-control form-control-sm"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
 
            <div className="col-4">
              <label className="form-label fw-600 small mb-1">Total Marks</label>
              <input type="number" className="form-control form-control-sm" min={1}
                value={form.total_marks}
                onChange={e => setForm(p => ({ ...p, total_marks: Number(e.target.value) }))} />
            </div>
            <div className="col-4">
              <label className="form-label fw-600 small mb-1">Pass Mark</label>
              <input type="number" className="form-control form-control-sm" min={0}
                value={form.pass_mark}
                onChange={e => setForm(p => ({ ...p, pass_mark: Number(e.target.value) }))} />
            </div>
            <div className="col-4">
              <label className="form-label fw-600 small mb-1">Attempts</label>
              <input type="number" className="form-control form-control-sm" min={1}
                value={form.max_attempts}
                onChange={e => setForm(p => ({ ...p, max_attempts: Number(e.target.value) }))} />
            </div>
 
            <div className="col-12">
              <label className="form-label fw-600 small mb-1">
                Instructions <span className="text-muted">(optional)</span>
              </label>
              <textarea className="form-control form-control-sm" rows={2}
                value={form.instructions}
                onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                placeholder="Instructions shown to students before they start…"
                style={{ resize: 'vertical', fontSize: '0.82rem' }} />
            </div>
 
            <div className="col-12 d-flex gap-4 flex-wrap" style={{ fontSize: '0.8rem' }}>
              <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.shuffle_questions}
                  onChange={e => setForm(p => ({ ...p, shuffle_questions: e.target.checked }))} />
                Shuffle questions
              </label>
              <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.show_answers_after}
                  onChange={e => setForm(p => ({ ...p, show_answers_after: e.target.checked }))} />
                Show answers after
              </label>
              <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_auto_graded}
                  onChange={e => setForm(p => ({ ...p, is_auto_graded: e.target.checked }))} />
                AI auto-grade
              </label>
            </div>
          </div>
 
          {/* ── AI Generate row ── */}
          <div className="quiz-ai-gen-row mb-3">
            <span className="fw-600 small">
              <i className="bi bi-stars text-primary me-1" />AI Generate
            </span>
            <input type="number" className="form-control form-control-sm" style={{ width: 60 }}
              min={1} max={20} value={genCount}
              onChange={e => setGenCount(Number(e.target.value))}
              title="Number of questions" />
            <select className="form-select form-select-sm" style={{ width: 190 }}
              value={genTypes} onChange={e => setGenTypes(e.target.value)}>
              <option value="mcq">MCQ only</option>
              <option value="short_answer">Short Answer only</option>
              <option value="essay">Essay only</option>
              <option value="mcq,true_false">MCQ + True/False</option>
              <option value="mcq,short_answer">MCQ + Short Answer</option>
              <option value="mcq,short_answer,essay">All types</option>
            </select>
            <button className="btn btn-sm btn-outline-primary"
              onClick={generateWithAI} disabled={generating}>
              {generating
                ? <><span className="spinner-border spinner-border-sm me-1" />Generating…</>
                : <><i className="bi bi-magic me-1" />Generate</>}
            </button>
          </div>
 
          {/* ── Questions — multistep ── */}
          <div className="mb-2">
            {/* Step header */}
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-600 small">
                Questions
                {questions.length > 0 && (
                  <span className="badge bg-secondary-subtle text-secondary ms-2"
                    style={{ fontSize: '0.65rem' }}>
                    {questions.length}
                  </span>
                )}
              </span>
 
              {/* Dot navigation */}
              {questions.length > 0 && (
                <div className="d-flex align-items-center gap-2">
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {questions.map((q, i) => (
                      <button key={i}
                        className={[
                          'quiz-step-dot',
                          i === currentQIdx ? 'active' : '',
                          q.body ? 'answered' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => setCurrentQIdx(i)}
                        title={`Question ${i + 1}`}
                      />
                    ))}
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                    {currentQIdx + 1} / {questions.length}
                  </span>
                </div>
              )}
            </div>
 
            {/* Empty state */}
            {questions.length === 0 && (
              <div className="text-center text-muted small py-3 border rounded-2"
                style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-patch-question d-block mb-1" style={{ fontSize: '1.25rem' }} />
                No questions yet. Add one below or use AI Generate.
              </div>
            )}
 
            {/* Current question editor */}
            {questions.length > 0 && renderQuestionEditor(questions[currentQIdx], currentQIdx)}
 
            {/* Prev / Next nav */}
            {questions.length > 1 && (
              <div className="learn-quiz-nav-row mt-2">
                <button className="btn btn-outline-secondary btn-sm"
                  onClick={() => setCurrentQIdx(p => p - 1)}
                  disabled={currentQIdx === 0}>
                  <i className="bi bi-arrow-left me-1" />Prev
                </button>
                <button className="btn btn-outline-secondary btn-sm ms-auto"
                  onClick={() => setCurrentQIdx(p => p + 1)}
                  disabled={currentQIdx === questions.length - 1}>
                  Next<i className="bi bi-arrow-right ms-1" />
                </button>
              </div>
            )}
          </div>
 
          {/* Add question button */}
          <button className="btn btn-sm btn-outline-secondary mb-3 float-right" onClick={addQuestion}>
            <i className="bi bi-plus-circle me-1" />Add Question
          </button>
 
          {/* Save / Cancel */}
          <div className="d-flex justify-content-end gap-2 pt-3"
            style={{ borderTop: '1px solid var(--border, #e2e8f0)' }}>
            <button className="btn btn-sm btn-outline-secondary"
              onClick={() => { setOpen(false); resetForm(); }}>
              Cancel
            </button>
            <button className="btn btn-sm btn-warning fw-600 text-dark"
              onClick={save} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                : <><i className="bi bi-check me-1" />{editId ? 'Update' : 'Create'} Assessment</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
