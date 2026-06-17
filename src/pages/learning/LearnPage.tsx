
// v5 — quiz/assessment sidebar indicators · isCreator quiz notice · AI panel flex fix
import {
  useState, useEffect, useRef, useCallback, type KeyboardEvent,
} from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { coursesApi, enrollmentsApi, aiApi, quizzesApi, projectsApi } from '@/services/api';
import { Course, Topic, TopicContent } from '@/types';
import { Spinner } from '@/components/shared/index';
import '@/styles/pages/learning/LearnPage.css';
import { usePageMeta } from '@/hooks/usePageMeta';

/* ═══════════════════════════════════════════════════════════
   Types
  ═══════════════════════════════════════════════════════════ */
  
interface AiMsg { role: 'user' | 'assistant'; content: string; }

/* ═══════════════════════════════════════════════════════════
   Secure blob fetching
   ═══════════════════════════════════════════════════════════ */
async function fetchSecureBlob(url: string): Promise<string> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to load media (${res.status})`);
  return URL.createObjectURL(await res.blob());
}

function useSecureMedia(serverUrl: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!serverUrl) { setBlobUrl(null); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    fetchSecureBlob(serverUrl)
      .then(blob => {
        if (cancelled) { URL.revokeObjectURL(blob); return; }
        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = blob;
        setBlobUrl(blob);
      })
      .catch(e => { if (!cancelled) setError(e.message ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [serverUrl]);

  useEffect(() => () => { if (prevUrl.current) URL.revokeObjectURL(prevUrl.current); }, []);
  return { blobUrl, loading, error };
}

/* ═══════════════════════════════════════════════════════════
   Video resume helpers
   ═══════════════════════════════════════════════════════════ */
const VID_KEY = (id: number) => `vid_pos_${id}`;
function saveVideoPosition(id: number, t: number) {
  try { if (t > 2) localStorage.setItem(VID_KEY(id), String(Math.floor(t))); } catch { /* noop */ }
}
function loadVideoPosition(id: number): number {
  try { return Number(localStorage.getItem(VID_KEY(id))) || 0; } catch { return 0; }
}

/* ═══════════════════════════════════════════════════════════
   SecureVideoPlayer
   media-shield has pointer-events:none so native video
   controls remain fully interactive.
   ═══════════════════════════════════════════════════════════ */
interface SecureVideoPlayerProps {
  serverUrl: string;
  topicId:   number;
  onProgress?: (pct: number) => void;
}
function SecureVideoPlayer({ serverUrl, topicId, onProgress }: SecureVideoPlayerProps) {
  const { blobUrl, loading, error } = useSecureMedia(serverUrl);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumed   = useRef(false);
  const maxPct    = useRef(0);

  useEffect(() => { resumed.current = false; maxPct.current = 0; }, [topicId]);

  const handleMetadata = useCallback(() => {
    if (resumed.current || !videoRef.current) return;
    const saved = loadVideoPosition(topicId);
    if (saved > 0) { videoRef.current.currentTime = saved; resumed.current = true; }
  }, [topicId]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    if (pct > maxPct.current) { maxPct.current = pct; onProgress?.(pct); }
    saveVideoPosition(topicId, v.currentTime);
  }, [topicId, onProgress]);

  const startSaveTimer = useCallback(() => {
    if (saveTimer.current) clearInterval(saveTimer.current);
    saveTimer.current = setInterval(() => {
      if (videoRef.current) saveVideoPosition(topicId, videoRef.current.currentTime);
    }, 5000);
  }, [topicId]);

  const stopSaveTimer = useCallback(() => {
    if (saveTimer.current) { clearInterval(saveTimer.current); saveTimer.current = null; }
    if (videoRef.current) saveVideoPosition(topicId, videoRef.current.currentTime);
  }, [topicId]);

  const handleEnded = useCallback(() => {
    stopSaveTimer();
    onProgress?.(100);
    try { localStorage.removeItem(VID_KEY(topicId)); } catch { /* noop */ }
  }, [topicId, stopSaveTimer, onProgress]);

  useEffect(() => () => { if (saveTimer.current) clearInterval(saveTimer.current); }, []);

  if (loading) return (
    <div className="media-loading">
      <span className="spinner-border spinner-border-sm text-primary" /> Loading video…
    </div>
  );
  if (error) return (
    <div className="media-loading" style={{ flexDirection: 'column', gap: '.5rem' }}>
      <i className="bi bi-exclamation-circle text-danger" style={{ fontSize: '1.5rem' }} />
      <span style={{ fontSize: '.82rem' }}>Could not load video. Please try again.</span>
    </div>
  );
  if (!blobUrl) return null;

  return (
    <div className="learn-video-wrap">
      <div className="media-shield" style={{ pointerEvents: 'none' }} aria-hidden="true" />
      <video
        ref={videoRef}
        src={blobUrl}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        playsInline
        onLoadedMetadata={handleMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={startSaveTimer}
        onPause={stopSaveTimer}
        onEnded={handleEnded}
        onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SecureImage
   ═══════════════════════════════════════════════════════════ */
function SecureImage({ serverUrl, alt }: { serverUrl: string; alt?: string }) {
  const { blobUrl, loading, error } = useSecureMedia(serverUrl);
  if (loading) return (
    <div className="media-loading" style={{ aspectRatio: '16/9' }}>
      <span className="spinner-border spinner-border-sm text-primary" /> Loading image…
    </div>
  );
  if (error || !blobUrl) return null;
  return (
    <div className="learn-image-wrap" aria-label={alt}>
      <div className="media-shield" style={{ pointerEvents: 'none' }} aria-hidden="true" />
      <img
        src={blobUrl} alt={alt || ''} draggable={false}
        onDragStart={e => e.preventDefault()}
        onContextMenu={e => e.preventDefault()}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SecurePdf
   ═══════════════════════════════════════════════════════════ */
function SecurePdf({ serverUrl, title, onViewed }: { serverUrl: string; title?: string; onViewed?: () => void }) {
  const { blobUrl, loading, error } = useSecureMedia(serverUrl);
  useEffect(() => {
    if (!blobUrl) return;
    const t = setTimeout(() => onViewed?.(), 15000);
    return () => clearTimeout(t);
  }, [blobUrl, onViewed]);

  if (loading) return (
    <div className="media-loading">
      <span className="spinner-border spinner-border-sm text-primary" /> Loading PDF…
    </div>
  );
  if (error || !blobUrl) return (
    <div className="media-loading">
      <i className="bi bi-file-earmark-pdf text-danger" style={{ fontSize: '1.5rem' }} /> Could not load PDF.
    </div>
  );
  return (
    <div className="learn-pdf-wrap">
      <iframe
        src={blobUrl}
        className="learn-pdf-viewer"
        title={title || 'PDF Document'}
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AudioPlayer
   ═══════════════════════════════════════════════════════════ */
function AudioPlayer({ serverUrl, onProgress }: { serverUrl: string; onProgress?: (pct: number) => void }) {
  const { blobUrl, loading } = useSecureMedia(serverUrl);
  const audioRef = useRef<HTMLAudioElement>(null);
  const maxPct   = useRef(0);

  const handleTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const pct = (a.currentTime / a.duration) * 100;
    if (pct > maxPct.current) { maxPct.current = pct; onProgress?.(pct); }
  }, [onProgress]);

  if (loading) return (
    <div className="media-loading">
      <span className="spinner-border spinner-border-sm text-primary" /> Loading audio…
    </div>
  );
  if (!blobUrl) return null;
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <audio ref={audioRef} controls className="w-100"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => onProgress?.(100)}>
        <source src={blobUrl} />
      </audio>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TextContent — auto-consumed after 3 s
   ═══════════════════════════════════════════════════════════ */
function TextContent({ content, onConsumed }: { content: TopicContent; onConsumed?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onConsumed?.(), 3000);
    return () => clearTimeout(t);
  }, [content.id, onConsumed]);
  return <div className="learn-prose" dangerouslySetInnerHTML={{ __html: content.body || '' }} />;
}

/* ═══════════════════════════════════════════════════════════
   renderContent — full-width + consumption tracking
   ═══════════════════════════════════════════════════════════ */
export function renderContent(content: TopicContent, onConsumed?: () => void) {
  const serverUrl = content.url ||
    (content.file_path
      ? `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/uploads/courses/content/${content.file_path}`
      : null);

  switch (content.content_type) {
    case 'video':
      return serverUrl
        ? <SecureVideoPlayer key={content.id} serverUrl={serverUrl} topicId={content.id}
            onProgress={pct => { if (pct >= 80) onConsumed?.(); }} />
        : null;
    case 'pdf':
      return serverUrl
        ? <SecurePdf key={content.id} serverUrl={serverUrl} title={content.title} onViewed={onConsumed} />
        : null;
    case 'image':
      return serverUrl
        ? <SecureImage key={content.id} serverUrl={serverUrl} alt={content.title} />
        : null;
    case 'ppt':
      return serverUrl ? (
        <div key={content.id} className="learn-file-card">
          <i className="bi bi-file-earmark-slides text-danger learn-file-icon" />
          <div className="learn-file-info">
            <div className="learn-file-name">{content.title || 'Presentation'}</div>
            <div className="learn-file-type">PowerPoint / Slides</div>
          </div>
          <button className="btn btn-sm btn-primary ms-auto"
            onClick={() => {
              fetchSecureBlob(serverUrl).then(blob => {
                const a = document.createElement('a');
                a.href = blob; a.download = content.title || 'presentation.pptx'; a.click();
                setTimeout(() => URL.revokeObjectURL(blob), 10000);
              }).catch(() => toast.error('Download failed'));
              onConsumed?.();
            }}>
            <i className="bi bi-download me-1" /> Download
          </button>
        </div>
      ) : null;
    case 'audio':
      return serverUrl
        ? <AudioPlayer key={content.id} serverUrl={serverUrl}
            onProgress={pct => { if (pct >= 80) onConsumed?.(); }} />
        : null;
    case 'text':
      return <TextContent key={content.id} content={content} onConsumed={onConsumed} />;
    default:
      return serverUrl ? (
        <div key={content.id} style={{ marginBottom: '1.25rem' }}>
          <button className="btn btn-outline-primary"
            onClick={() => {
              fetchSecureBlob(serverUrl).then(blob => {
                const a = document.createElement('a');
                a.href = blob; a.download = content.title || 'file'; a.click();
                setTimeout(() => URL.revokeObjectURL(blob), 10000);
              }).catch(() => toast.error('Download failed'));
              onConsumed?.();
            }}>
            <i className="bi bi-file-earmark me-1" />Open {content.title || 'File'}
          </button>
        </div>
      ) : null;
  }
}

/* ═══════════════════════════════════════════════════════════
   InlineQuizPlayer
   isCreator prop: when true and no quiz exists, renders a
   subtle notice prompting the creator to add one.
   Non-creators see nothing when there is no quiz.
   ═══════════════════════════════════════════════════════════ */
interface InlineQuizPlayerProps {
  topicId:          number;
  courseId:         number;
  isCreator?:       boolean;
  onQuizCompleted?: () => void;
}

// v2
function InlineQuizPlayer({ topicId, courseId, isCreator, onQuizCompleted }: InlineQuizPlayerProps) {
  const [quiz,         setQuiz]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [answers,      setAnswers]      = useState<Record<number, string>>({});
  const [submitting,   setSubmitting]   = useState(false);
  const [attempt,      setAttempt]      = useState<any | null>(null);
  const [started,      setStarted]      = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [currentQ,     setCurrentQ]     = useState(0);   // ← multistep index
 
  useEffect(() => {
    setLoading(true);
    setQuiz(null); setAttempt(null); setStarted(false);
    setAnswers({}); setAttemptCount(0); setCurrentQ(0);
 
    quizzesApi.getForTopic(topicId)
      .then(r => {
        const q = r.data?.quiz ?? (r.data?.id ? r.data : null);
        setQuiz(q ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [topicId]);
 
  const handleAnswer = (questionId: number, value: string) =>
    setAnswers(prev => ({ ...prev, [questionId]: value }));
 
  const handleMultiToggle = (questionId: number, option: string) => {
    setAnswers(prev => {
      const current: string[] = (() => {
        try { return JSON.parse(prev[questionId] || '[]'); } catch { return []; }
      })();
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: JSON.stringify(updated) };
    });
  };
 
  const submit = async () => {
    if (!quiz) return;
    const questions: any[] = quiz.questions || [];
    const unanswered = questions.filter(q => !answers[q.id]);
    if (
      unanswered.length > 0 &&
      !window.confirm(`${unanswered.length} question(s) unanswered. Submit anyway?`)
    ) return;
 
    setSubmitting(true);
    try {
      const res = await quizzesApi.submitAttempt(quiz.id, {
        answers: questions.map(q => ({
          question_id: q.id,
          response:    answers[q.id] ?? '',
        })),
      });
      const att      = res.data;
      const newCount = attemptCount + 1;
      setAttempt(att);
      setAttemptCount(newCount);
 
      if (att.passed) {
        toast.success(`Quiz passed! Score: ${att.pct?.toFixed(0)}%`);
        onQuizCompleted?.();
      } else {
        const maxAttempts = quiz.max_attempts ?? 0;
        const remaining   = maxAttempts > 0 ? maxAttempts - newCount : -1;
        if (remaining === 0) {
          toast.error('Maximum attempts reached.');
          onQuizCompleted?.();
        } else {
          toast(`Score: ${att.pct?.toFixed(0)}% — need ${quiz.pass_score}% to pass.`, { icon: '📊' });
        }
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || e.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };
 
  const retry = () => { setAttempt(null); setAnswers({}); setStarted(true); setCurrentQ(0); };
 
  if (loading) return null;
 
  if (!quiz) {
    if (!isCreator) return null;
    return (
      <div className="learn-no-quiz-notice text-danger">
        <i className="bi bi-patch-question" />
        <span>
          No quiz has been added for this topic yet.
          <Link
            className="btn btn-sm btn-outline-primary ms-2"
            to={`/creator/courses/${courseId}/edit`}
            style={{ fontSize: '0.75rem' }}
          >
            Create Quiz
          </Link>
        </span>
      </div>
    );
  }
 
  const questions: any[] = quiz.questions || [];
  const maxAttempts       = quiz.max_attempts ?? 0;
  const canRetry          = attempt && !attempt.passed &&
    (maxAttempts === 0 || attemptCount < maxAttempts);
  const answeredCount     = questions.filter(q => answers[q.id]).length;
 
  /* ── Render a single question ── */
  const renderQuestion = (q: any) => (
    <div className="learn-quiz-question" key={q.id}>
      <div className="learn-quiz-q-header">
        <span className="learn-quiz-q-num">{currentQ + 1}</span>
        <span className="learn-quiz-q-text">{q.body}</span>
        <span className="learn-quiz-q-pts">{q.marks}pt{q.marks !== 1 ? 's' : ''}</span>
      </div>
 
      {/* MCQ */}
      {q.question_type === 'mcq' && (q.options || []).map((opt: any, oi: number) => {
        const optText = typeof opt === 'string' ? opt : (opt?.text ?? String(oi));
        return (
          <label key={oi} className={`learn-quiz-option ${answers[q.id] === optText ? 'selected' : ''}`}>
            <input type="radio" name={`q_${q.id}`} value={optText}
              checked={answers[q.id] === optText}
              onChange={() => handleAnswer(q.id, optText)} />
            {optText}
          </label>
        );
      })}
 
      {/* Multi-select */}
      {q.question_type === 'multi_select' && (q.options || []).map((opt: any, oi: number) => {
        const optText = typeof opt === 'string' ? opt : (opt?.text ?? String(oi));
        const selected: string[] = (() => {
          try { return JSON.parse(answers[q.id] || '[]'); } catch { return []; }
        })();
        return (
          <label key={oi} className={`learn-quiz-option ${selected.includes(optText) ? 'selected' : ''}`}>
            <input type="checkbox" checked={selected.includes(optText)}
              onChange={() => handleMultiToggle(q.id, optText)} />
            {optText}
          </label>
        );
      })}
 
      {/* True / False */}
      {q.question_type === 'true_false' && ['True', 'False'].map(opt => (
        <label key={opt} className={`learn-quiz-option ${answers[q.id] === opt ? 'selected' : ''}`}>
          <input type="radio" name={`q_${q.id}`} value={opt}
            checked={answers[q.id] === opt}
            onChange={() => handleAnswer(q.id, opt)} />
          {opt}
        </label>
      ))}
 
      {/* Short answer / fill blank */}
      {(q.question_type === 'short_answer' || q.question_type === 'fill_blank') && (
        <input className="form-control mt-2" placeholder="Your answer…"
          value={answers[q.id] || ''}
          onChange={e => handleAnswer(q.id, e.target.value)} />
      )}
 
      {/* Essay */}
      {q.question_type === 'essay' && (
        <textarea className="form-control mt-2" rows={4} placeholder="Write your response…"
          value={answers[q.id] || ''}
          onChange={e => handleAnswer(q.id, e.target.value)} />
      )}
    </div>
  );
 
  return (
    <div className="learn-quiz-panel">
      <div className="learn-quiz-header">
        <i className="bi bi-patch-question-fill me-2" />
        <span>{quiz.title}</span>
        {quiz.required_for_completion && (
          <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '.65rem' }}>
            Required to complete
          </span>
        )}
      </div>
 
      {/* ── Intro ── */}
      {!started && !attempt && (
        <div className="learn-quiz-intro">
          {quiz.instructions && (
            <p className="text-muted" style={{ fontSize: '.88rem' }}>{quiz.instructions}</p>
          )}
          <div className="d-flex gap-3 align-items-center flex-wrap"
            style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
            <span><i className="bi bi-list-ol me-1" />{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            <span><i className="bi bi-trophy me-1" />Pass: {quiz.pass_score}%</span>
            <span>
              <i className="bi bi-arrow-repeat me-1" />
              {maxAttempts > 0 ? `${maxAttempts} attempt${maxAttempts > 1 ? 's' : ''}` : 'Unlimited attempts'}
            </span>
          </div>
          <button className="btn btn-primary mt-3" onClick={() => { setStarted(true); setCurrentQ(0); }}>
            <i className="bi bi-play-fill me-1" />Start Quiz
          </button>
        </div>
      )}
 
      {/* ── Multistep quiz body ── */}
      {started && !attempt && questions.length > 0 && (
        <div className="learn-quiz-body">
 
          {/* Progress strip */}
          <div className="learn-quiz-step-bar">
            <div className="learn-quiz-step-dots">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  className={[
                    'quiz-step-dot',
                    i === currentQ ? 'active' : '',
                    answers[q.id]  ? 'answered' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setCurrentQ(i)}
                  title={`Question ${i + 1}`}
                  aria-label={`Go to question ${i + 1}`}
                />
              ))}
            </div>
            <span className="learn-quiz-step-counter">
              {currentQ + 1} / {questions.length}
              {answeredCount > 0 && (
                <span className="ms-2 text-success" style={{ fontSize: '.72rem' }}>
                  ({answeredCount} answered)
                </span>
              )}
            </span>
          </div>
 
          {/* One question at a time */}
          {renderQuestion(questions[currentQ])}
 
          {/* Navigation row */}
          <div className="learn-quiz-nav-row">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setCurrentQ(p => p - 1)}
              disabled={currentQ === 0}
            >
              <i className="bi bi-arrow-left me-1" />Previous
            </button>
 
            {currentQ < questions.length - 1 ? (
              <button
                className="btn btn-primary btn-sm ms-auto"
                onClick={() => setCurrentQ(p => p + 1)}
              >
                Next<i className="bi bi-arrow-right ms-1" />
              </button>
            ) : (
              <button
                className="btn btn-success fw-600 btn-sm ms-auto"
                onClick={submit}
                disabled={submitting}
              >
                {submitting
                  ? <><span className="spinner-border spinner-border-sm me-2" />Submitting…</>
                  : <><i className="bi bi-send me-1" />Submit Quiz</>}
              </button>
            )}
          </div>
        </div>
      )}
 
      {/* ── Result ── */}
      {attempt && (
        <div className="learn-quiz-result">
          <div className={`learn-quiz-result-badge ${attempt.passed ? 'passed' : 'failed'}`}>
            <i className={`bi ${attempt.passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-2`} />
            {attempt.passed ? 'Passed!' : 'Not passed'}
            {attempt.pct != null && <span className="ms-2">{attempt.pct.toFixed(0)}%</span>}
          </div>
 
          {attempt.ai_feedback && (
            <div className="learn-quiz-feedback">
              <i className="bi bi-robot me-1 text-primary" /><strong>AI Feedback:</strong>
              <p className="mt-1 mb-0" style={{ fontSize: '.85rem', whiteSpace: 'pre-wrap' }}>
                {attempt.ai_feedback}
              </p>
            </div>
          )}
          {attempt.tutor_feedback && (
            <div className="learn-quiz-feedback">
              <i className="bi bi-person-badge me-1 text-success" /><strong>Tutor Feedback:</strong>
              <p className="mt-1 mb-0" style={{ fontSize: '.85rem' }}>{attempt.tutor_feedback}</p>
            </div>
          )}
 
          {/* Per-question breakdown */}
          {quiz.show_correct_after && (attempt.result_detail || []).length > 0 && (
            <div className="learn-quiz-breakdown">
              {attempt.result_detail.map((item: any, i: number) => {
                const q = questions.find((qq: any) => qq.id === item.question_id);
                // Normalise: backend may return response as null/undefined for blank
                const responseDisplay = item.response !== null && item.response !== undefined && item.response !== ''
                  ? item.response
                  : '(blank)';
                return (
                  <div
                    key={item.question_id}
                    className={[
                      'learn-quiz-breakdown-item',
                      item.is_correct === true  ? 'correct' :
                      item.is_correct === false ? 'wrong'   : 'pending',
                    ].join(' ')}
                  >
                    <div className="d-flex align-items-start gap-2">
                      <span className="learn-quiz-q-num">{i + 1}</span>
                      <div className="flex-1">
                        <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{q?.body}</div>
                        <div className="mt-1" style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                          Your answer: <strong>{responseDisplay}</strong>
                        </div>
                        {item.correct_answer && item.is_correct === false && (
                          <div style={{ fontSize: '.78rem', color: 'var(--success, #22c55e)' }}>
                            Correct: <strong>{item.correct_answer}</strong>
                          </div>
                        )}
                        {item.explanation && (
                          <div className="mt-1" style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {item.explanation}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '.75rem', flexShrink: 0 }}>
                        {item.is_correct === null ? '⏳' : item.is_correct ? '✅' : '❌'}
                        {item.points_earned != null && ` ${item.points_earned}pt`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
 
          {canRetry && (
            <button className="btn btn-outline-primary btn-sm mt-3" onClick={retry}>
              <i className="bi bi-arrow-counterclockwise me-1" />Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   ProjectSubmissionPanel
   ═══════════════════════════════════════════════════════════ */
function ProjectSubmissionPanel({ courseId }: { courseId: number }) {
  const [brief,    setBrief]    = useState<any | null>(null);
  const [existing, setExisting] = useState<any | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [title,    setTitle]    = useState('');
  const [note,     setNote]     = useState('');
  const [url,      setUrl]      = useState('');
  const [file,     setFile]     = useState<File | null>(null);
  const [saving,   setSaving]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const subsPromise =
      projectsApi.mySubmissions?.(courseId) ??
      (projectsApi as any).mine?.(courseId) ??
      Promise.resolve({ data: [] });

    Promise.all([
      projectsApi.listForCourse(courseId).catch(() => ({ data: [] })),
      subsPromise.catch(() => ({ data: [] })),
    ]).then(([briefsRes, subsRes]) => {
      if (cancelled) return;
      const briefs: any[] = briefsRes.data || [];
      const subs: any[]   = subsRes.data   || [];
      const activeBrief   = briefs.find((b: any) => b.is_active !== false) ?? briefs[0] ?? null;
      setBrief(activeBrief);
      if (activeBrief) {
        setExisting(subs.find((s: any) => s.project_id === activeBrief.id) ?? null);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [courseId]);
  /*
  const submit = async () => {
    if (!brief)        { toast.error('No project brief found'); return; }
    if (!title.trim()) { toast.error('Project title is required'); return; }
    if (!url.trim() && !file) { toast.error('Provide a URL or upload a file'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      if (note) fd.append('note', note);
      if (url)  fd.append('external_url', url);
      if (file) fd.append('file', file);
      const res = await projectsApi.submit(brief.id, fd);
      setExisting(res.data);
      setExpanded(false);
      toast.success('Project submitted!');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Submission failed');
    } finally { setSaving(false); }
  };
  */

  const submit = async () => {
  if (!brief)        { toast.error('No project brief found'); return; }
  if (!title.trim()) { toast.error('Project title is required'); return; }
  if (!url.trim() && !file) { toast.error('Provide a URL or upload a file'); return; }
 
  setSaving(true);
  try {
    const fd = new FormData();
    fd.append('project_id', String(brief.id));   // ← brief id goes in BODY
    fd.append('title', title);
    if (note) fd.append('note', note);
    if (url)  fd.append('external_url', url);
    if (file) fd.append('file', file);
 
    // courseId (the prop) goes in the URL path — matches /projects/course/{course_id}
    const res = await projectsApi.submit(courseId, fd);
    setExisting(res.data);
    setExpanded(false);
    toast.success('Project submitted!');
  } catch (e: any) {
    toast.error(e.response?.data?.detail || e.response?.data?.message || 'Submission failed');
  } finally { setSaving(false); }
};

  if (loading || !brief) return null;

  const statusColor: Record<string, string> = {
    pending:   'secondary',
    reviewing: 'info',
    ai_graded: 'primary',
    returned:  'success',
    resubmit:  'warning',
  };

  return (
    <div className="learn-project-panel">
      <div className="learn-project-header">
        <i className="bi bi-folder2-open me-2 text-primary" />
        <div style={{ flex: 1 }}>
          <strong>{brief.title}</strong>
          {brief.description && (
            <p className="mb-0 mt-1" style={{ fontSize: '.83rem', color: 'var(--text-muted)' }}>
              {brief.description}
            </p>
          )}
          {brief.rubric && (
            <details className="mt-1" style={{ fontSize: '.78rem' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--primary)' }}>View rubric</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: '.5rem' }}>
                {brief.rubric}
              </pre>
            </details>
          )}
        </div>
      </div>

      {existing ? (
        <div className="mt-2">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="fw-600">{existing.title}</span>
            <span className={`badge bg-${statusColor[existing.status] ?? 'secondary'}`} style={{ fontSize: '.7rem' }}>
              {(existing.status ?? '').replace('_', ' ')}
            </span>
          </div>
          {existing.ai_feedback && (
            <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: '.82rem' }}>
              <i className="bi bi-robot me-1" /><strong>AI Feedback:</strong> {existing.ai_feedback}
            </div>
          )}
          {existing.tutor_feedback && (
            <div className="alert alert-success py-2 px-3 mb-2" style={{ fontSize: '.82rem' }}>
              <i className="bi bi-person-badge me-1" /><strong>Tutor:</strong> {existing.tutor_feedback}
            </div>
          )}
          {existing.score != null && (
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
              Score: <strong>{existing.score} / {existing.max_score ?? 100}</strong>
            </div>
          )}
        </div>
      ) : (
        <>
          {!expanded && (
            <button className="btn btn-outline-primary btn-sm mt-2" onClick={() => setExpanded(true)}>
              <i className="bi bi-upload me-1" />Submit Your Project
            </button>
          )}
          {expanded && (
            <div className="mt-3">
              <div className="mb-2">
                <label className="form-label fw-600 small mb-1">Project Title *</label>
                <input className="form-control form-control-sm" placeholder="e.g. My Portfolio Website"
                  value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="mb-2">
                <label className="form-label fw-600 small mb-1">Description / Notes</label>
                <textarea className="form-control form-control-sm" rows={3}
                  placeholder="Describe your project, approach, or reflection…"
                  value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div className="mb-2">
                <label className="form-label fw-600 small mb-1">
                  Project URL <span className="text-muted">(GitHub, live site, Figma, etc.)</span>
                </label>
                <input className="form-control form-control-sm" placeholder="https://…"
                  value={url} onChange={e => setUrl(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-600 small mb-1">
                  Or Upload File
                  {brief.allowed_formats && <span className="text-muted ms-1">({brief.allowed_formats})</span>}
                </label>
                <div>
                  <button className="btn btn-sm btn-outline-secondary"
                    onClick={() => fileRef.current?.click()}>
                    <i className="bi bi-paperclip me-1" />{file ? file.name : 'Choose file…'}
                  </button>
                  <input ref={fileRef} type="file" hidden
                    onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setExpanded(false)}>
                  Cancel
                </button>
                <button className="btn btn-sm btn-success fw-600" onClick={submit} disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-1" />Submitting…</>
                    : <><i className="bi bi-send me-1" />Submit Project</>}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sidebar topic pill badges
   Extracted to a pure component to keep SidebarTimeline lean.
   ═══════════════════════════════════════════════════════════ */
function TopicBadges({ topic }: { topic: any }) {
  return (
    <>
      {topic.has_quiz && (
        <span className="topic-badge topic-badge--quiz" title="Has quiz">Quiz</span>
      )}
      {topic.has_assessment && (
        <span className="topic-badge topic-badge--assessment" title="Has assessment">Test</span>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   LearnPage
   ═══════════════════════════════════════════════════════════ */
export default function LearnPage() {
  const { slug }        = useParams<{ slug: string }>();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const { user }        = useAuth();

  /* Free-preview: /learn/{slug}?preview=true&topic={id} */
  const previewTopicId = Number(searchParams.get('topic')) || null;
  const isPreviewMode  = searchParams.has('preview') && previewTopicId !== null;

  const [course,          setCourse]          = useState<Course | null>(null);
  const [activeTopic,     setActiveTopic]     = useState<Topic | null>(null);
  const [topicContent,    setTopicContent]    = useState<any>(null);
  const [loading,         setLoading]         = useState(true);

  /* ── Page meta ──────────────────────────────────────────────────────────
   * Auth-gated learning page: noindex so search engines don't crawl it.
   * Title updates reactively as the student moves between topics, giving
   * the browser tab a live label (useful when the student has many tabs).
   * No OG / schema needed — this page is never publicly shareable.
   * ─────────────────────────────────────────────────────────────────────*/
  usePageMeta({
    title:  course
      ? activeTopic
        ? `${activeTopic.title} — ${course.title}`
        : course.title
      : null,
    robots: 'noindex, nofollow',
  });
  const [contentLoading,  setContentLoading]  = useState(false);
  const [openLessons,     setOpenLessons]     = useState<Set<number>>(new Set([0]));
  const [completedTopics, setCompletedTopics] = useState<Set<number>>(new Set());
  /* consumedTopics pre-seeded from completedTopics — revisiting
     a finished topic never re-triggers the 80% gate.             */
  const [consumedTopics,  setConsumedTopics]  = useState<Set<number>>(new Set());
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [aiOpen,          setAiOpen]          = useState(false);
  const [aiMessages,      setAiMessages]      = useState<AiMsg[]>([]);
  const [aiInput,         setAiInput]         = useState('');
  const [aiLoading,       setAiLoading]       = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  /* Creator: can manage this course (owns it or is admin/super_admin) */
  const isCreator = !!(
    course &&
    user &&
    (
      user.id === (course as any).creator_id ||
      user.roles?.includes('admin') ||
      user.roles?.includes('super_admin')
    )
  );

  useEffect(() => {
    document.body.style.overflow = (sidebarOpen || aiOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, aiOpen]);

  useEffect(() => {
    if (!slug) return;
    coursesApi.get(slug)
      .then(r => {
        const c: Course = r.data;
        const allTopics: any[] = (c.lessons ?? []).flatMap((l: any) => l.topics ?? []);

        /* Enrollment / preview guard */
        if (!c.is_enrolled) {
          if (isPreviewMode && previewTopicId) {
            const ok = allTopics.find((t: any) => t.id === previewTopicId && t.is_free_preview);
            if (!ok) { navigate(`/courses/${slug}`); return; }
          } else {
            navigate(`/courses/${slug}`); return;
          }
        }

        setCourse(c);

        /* Completed topics — check all field shapes the backend may use */
        const done = new Set<number>();
        (c.lessons ?? []).forEach((l: any) =>
          (l.topics ?? []).forEach((t: any) => {
            if (t.is_completed || t.completed || t.user_completed) done.add(t.id);
          })
        );
        const cp = c as any;
        if (Array.isArray(cp.my_progress?.completed_topic_ids))
          (cp.my_progress.completed_topic_ids as number[]).forEach(id => done.add(id));
        if (Array.isArray(cp.completed_topic_ids))
          (cp.completed_topic_ids as number[]).forEach(id => done.add(id));

        setCompletedTopics(done);
        setConsumedTopics(new Set(done)); // pre-seed so done topics are never re-gated

        /* Initial active topic */
        if (isPreviewMode && previewTopicId) {
          const t = allTopics.find((t: any) => t.id === previewTopicId);
          if (t) {
            setActiveTopic(t);
            fetchTopicContent(c.id, t.id);
            const li = (c.lessons ?? []).findIndex((l: any) =>
              (l.topics ?? []).some((tp: any) => tp.id === previewTopicId)
            );
            if (li !== -1) setOpenLessons(new Set([li]));
          }
        } else if (c.lessons && c.lessons.length > 0 && c.lessons[0].topics?.length > 0) {
          const first = c.lessons[0].topics?.[0];
          if (first) {
            setActiveTopic(first);
            fetchTopicContent(c.id, first.id);
          }
        }
      })
      .catch(() => navigate('/explore'))
      .finally(() => setLoading(false));
  }, [slug]);

  const fetchTopicContent = async (courseId: number, topicId: number) => {
    setContentLoading(true); setTopicContent(null);
    try {
      const res = await coursesApi.getTopicContent(courseId, topicId);
      setTopicContent(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load content');
    } finally { setContentLoading(false); }
  };

  const handleTopicClick = (topic: Topic) => {
    if (!course) return;
    if (isPreviewMode && !course.is_enrolled && !(topic as any).is_free_preview) {
      toast.error('Enroll to access this topic');
      return;
    }
    setActiveTopic(topic);
    fetchTopicContent(course.id, topic.id);
    setSidebarOpen(false);
  };

  const markConsumed = useCallback(() => {
    if (activeTopic) setConsumedTopics(prev => new Set([...prev, activeTopic.id]));
  }, [activeTopic]);

  /* isReadyToComplete — short-circuits for already-completed topics */
  const isReadyToComplete = (() => {
    if (!activeTopic)                         return false;
    if (completedTopics.has(activeTopic.id))  return true;   // already done
    const contents: TopicContent[] = topicContent?.contents ?? [];
    if (contents.length === 0)                return true;   // empty state
    const needsConsumption = contents.some(c =>
      ['video', 'audio', 'pdf'].includes(c.content_type)
    );
    if (needsConsumption && !consumedTopics.has(activeTopic.id)) return false;
    return true;
  })();

  const markComplete = async (topicId: number) => {
    if (!course) return;
    if (!isReadyToComplete) {
      toast.error('Please finish the content before marking complete.');
      return;
    }
    try {
      const res    = await enrollmentsApi.markProgress(topicId, true);
      const newPct = res.data.progress_pct ?? 0;
      setCompletedTopics(prev => new Set([...prev, topicId]));
      setConsumedTopics(prev  => new Set([...prev, topicId]));
      setCourse(prev => prev ? { ...prev, progress_pct: newPct } : prev);
      toast.success(`Progress: ${newPct}%`);
      if (newPct >= 100) toast.success('🎉 Course completed! Certificate issued!', { duration: 5000 });
      // Auto-advance to next topic
      for (const lesson of course.lessons || []) {
        const idx = lesson.topics.findIndex((t: any) => t.id === topicId);
        if (idx !== -1 && idx < lesson.topics.length - 1) {
          handleTopicClick(lesson.topics[idx + 1]); return;
        }
      }
    } catch { toast.error('Could not save progress'); }
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg: AiMsg = { role: 'user', content: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);
    try {
      const res = await aiApi.chat({ message: aiInput, history: aiMessages, course_id: course?.id });
      setAiMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setAiMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setAiLoading(false);
      setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleAiKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendAiMessage();
  };

  const toggleLesson = (idx: number) =>
    setOpenLessons(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });

  if (loading) return <Spinner />;
  if (!course)  return null;

  const progress    = course.progress_pct ?? 0;
  const allTopics   = (course.lessons ?? []).flatMap((l: any) => l.topics ?? []);
  const totalTopics = allTopics.length;
  const lastTopic   = allTopics[allTopics.length - 1];
  const isLastTopic = activeTopic?.id === lastTopic?.id;
  const isCourseDone= completedTopics.size >= totalTopics && totalTopics > 0;

  /* ── Sidebar timeline ── */
  const SidebarTimeline = () => (
    <div className="learn-lesson-list">
      {(course.lessons ?? []).map((lesson: any, li: number) => {
        const isOpen    = openLessons.has(li);
        const hasActive = lesson.topics?.some((t: any) => t.id === activeTopic?.id);
        return (
          <div key={lesson.id}
            className={`lesson-group${isOpen ? ' open' : ''}${hasActive ? ' has-active' : ''}`}>
            <div className="lesson-group-header" onClick={() => toggleLesson(li)}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && toggleLesson(li)}
              aria-expanded={isOpen}>
              <span className="lesson-num-circle" aria-hidden="true">{li + 1}</span>
              <span className="lesson-group-title">{lesson.title}</span>
              <i className="bi bi-chevron-down lesson-group-chevron" aria-hidden="true" />
            </div>
            {isOpen && (
              <div className="topic-timeline" role="list">
                {(lesson.topics ?? []).map((topic: any, ti: number) => {
                  const isDone   = completedTopics.has(topic.id);
                  const isActive = activeTopic?.id === topic.id;
                  const isLast   = ti === lesson.topics.length - 1;
                  const isLocked = isPreviewMode && !course.is_enrolled && !topic.is_free_preview;
                  return (
                    <div key={topic.id}
                      className={`topic-row${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}${isLocked ? ' is-locked' : ''}`}
                      onClick={() => handleTopicClick(topic)}
                      role="listitem" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleTopicClick(topic)}
                      aria-current={isActive ? 'true' : undefined}>
                      <div className="topic-track" aria-hidden="true">
                        <div className="topic-dot" />
                        {!isLast && <div className="topic-line" />}
                      </div>
                      <div className="topic-label">
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          <span>
                            {ti + 1}. {topic.title}
                          </span>
                          {isDone && (
                            <i className="bi bi-check-circle-fill"
                              style={{ color: 'var(--success, #22c55e)', fontSize: '.7rem' }} />
                          )}
                          {isLocked && (
                            <i className="bi bi-lock-fill"
                              style={{ color: 'var(--text-muted)', fontSize: '.7rem' }} />
                          )}
                          {/* ── Quiz / Assessment indicator badges ── */}
                          <TopicBadges topic={topic} />
                        </div>
                        {topic.duration_minutes != null && (
                          <div className="topic-duration">
                            <i className="bi bi-clock me-1" />{topic.duration_minutes}m
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  /* ── AI panel inner — flex column so input stays pinned at bottom ── */
  const AiPanelInner = () => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="ai-messages" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {aiMessages.length === 0 && (
          <div className="ai-empty">
            <i className="bi bi-chat-square-dots" />
            <p>Ask me anything about this course or topic!</p>
          </div>
        )}
        {aiMessages.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>{m.content}</div>
        ))}
        {aiLoading && (
          <div className="ai-msg assistant">
            <span className="spinner-grow spinner-grow-sm text-primary me-1" />Thinking…
          </div>
        )}
        <div ref={aiEndRef} />
      </div>
      <div className="ai-input-row"
        style={{ flexShrink: 0, padding: '.75rem', borderTop: '1px solid var(--border, #e5e7eb)' }}>
        <input type="text" className="form-control form-control-sm" placeholder="Ask a question…"
          value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={handleAiKey} />
        <button className="btn btn-sm btn-primary" onClick={sendAiMessage}
          disabled={aiLoading} aria-label="Send">
          <i className="bi bi-send" />
        </button>
      </div>
    </div>
  );

  const contents: TopicContent[] = topicContent?.contents ?? [];
  const hasMedia = contents.some(c => ['video', 'audio', 'pdf'].includes(c.content_type));

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <>
      <div className={`learn-drawer-overlay${sidebarOpen || aiOpen ? ' show' : ''}`}
        onClick={() => { setSidebarOpen(false); setAiOpen(false); }} aria-hidden="true" />

      <div className={`learn-root${aiOpen ? ' ai-open' : ''}`}>

        {/* Mobile top-bar */}
        <div className="learn-topbar">
          <div className="learn-topbar-left">
            <button className="learn-topbar-back"
              onClick={() => navigate(`/courses/${course.slug}`)} aria-label="Back">
              <i className="bi bi-arrow-left" />
            </button>
            <span className="learn-topbar-title">{course.title}</span>
          </div>
          <div className="learn-topbar-actions">
            <button className={`learn-topbar-btn${sidebarOpen ? ' active' : ''}`}
              onClick={() => { setSidebarOpen(p => !p); setAiOpen(false); }}>
              <i className="bi bi-list-ul" /> Content
            </button>
            <button className={`learn-topbar-btn${aiOpen ? ' active' : ''}`}
              onClick={() => { setAiOpen(p => !p); setSidebarOpen(false); }}>
              <i className="bi bi-robot" /> AI
            </button>
          </div>
        </div>

        {/* Left sidebar */}
        <aside className={`learn-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Course content">
          <div className="learn-drawer-header">
            <span className="learn-drawer-header-title">Content</span>
            <button className="learn-drawer-close" onClick={() => setSidebarOpen(false)} aria-label="Close">
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="learn-sidebar-info">
            <Link to={`/courses/${course.slug}`} className="learn-sidebar-back">
              <i className="bi bi-arrow-left" /> Back to course
            </Link>
            <p className="learn-sidebar-course-title">{course.title}</p>
            {!isPreviewMode && (
              <>
                <div className="learn-progress-bar-wrap">
                  <div className="learn-progress-bar-fill" style={{ width: `${progress}%` }}
                    role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} />
                </div>
                <span className="learn-progress-label">{progress}% complete</span>
              </>
            )}
          </div>
          <SidebarTimeline />
        </aside>

        {/* Main content */}
        <main className="learn-main">
          <div className="learn-content-scroll">
            <div className="learn-content-inner">
              {activeTopic ? (
                <>
                  {/* Preview banner */}
                  {isPreviewMode && !course.is_enrolled && (
                    <div className="d-flex align-items-center gap-2 mb-3 px-3 py-2 rounded-2"
                      style={{
                        background: 'var(--primary-soft, #dbeafe)',
                        color: 'var(--primary, #2563eb)',
                        fontSize: '.85rem',
                      }}>
                      <i className="bi bi-eye-fill" />
                      <span>You are viewing a <strong>free preview</strong>.</span>
                      <Link to={`/courses/${course.slug}`}
                        className="btn btn-sm btn-primary ms-auto" style={{ fontSize: '.78rem' }}>
                        Enroll Now
                      </Link>
                    </div>
                  )}

                  <div className="learn-topic-header">
                    <div>
                      <h4 className="learn-topic-title">{activeTopic.title}</h4>
                      {activeTopic.duration_minutes != null && (
                        <div className="learn-topic-meta">
                          <i className="bi bi-clock" />{activeTopic.duration_minutes} min
                        </div>
                      )}
                    </div>
                    <div className="learn-topic-actions">
                      <button className={`btn btn-sm${aiOpen ? ' btn-primary' : ' btn-outline-primary'}`}
                        onClick={() => setAiOpen(p => !p)}>
                        <i className="bi bi-robot me-1" /> Ask AI
                      </button>
                    </div>
                  </div>

                  {contentLoading ? <Spinner /> : (
                    <>
                      {/* Content or curating state */}
                      {contents.length === 0 ? (
                        <div className="learn-curating-state">
                          <i className="bi bi-tools" />
                          <h5>Content Coming Soon</h5>
                          <p>
                            We're currently curating the best content for you.
                            <br />Kindly check back later.
                          </p>
                        </div>
                      ) : (
                        contents.map((c: TopicContent) => renderContent(c, markConsumed))
                      )}

                      {activeTopic.description && (
                        <div className="learn-desc-card">
                          <h6>About this topic</h6>
                          <p>{activeTopic.description}</p>
                        </div>
                      )}

                      {/* Inline quiz — hidden in preview mode.
                          isCreator prop gates the "no quiz yet" notice. */}
                      {!isPreviewMode && course && (
                        <InlineQuizPlayer
                          topicId={activeTopic.id}
                          courseId={course.id}
                          isCreator={isCreator}
                          onQuizCompleted={markConsumed}
                        />
                      )}

                      {/* Mark Complete — hidden in preview mode */}
                      {!isPreviewMode && (
                        <div className="learn-complete-row">
                          {completedTopics.has(activeTopic.id) ? (
                            <div className="learn-done-badge">
                              <i className="bi bi-check-circle-fill" /> Topic completed!
                            </div>
                          ) : (
                            <div className="d-flex align-items-center gap-3 flex-wrap">
                              <button
                                className={`btn btn-success${!isReadyToComplete ? ' opacity-50' : ''}`}
                                onClick={() => markComplete(activeTopic.id)}
                                title={!isReadyToComplete ? 'Finish the content first' : 'Mark as complete'}
                              >
                                <i className="bi bi-check-circle me-1" /> Mark as Complete
                              </button>
                              {hasMedia && !consumedTopics.has(activeTopic.id) && (
                                <span className="text-muted" style={{ fontSize: '.78rem' }}>
                                  <i className="bi bi-info-circle me-1" />
                                  Watch / listen to at least 80% to unlock
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Project submission — enrolled users, last topic or course complete */}
                      {!isPreviewMode && (isLastTopic || isCourseDone) && course && (
                        <ProjectSubmissionPanel courseId={course.id} />
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="learn-empty-state" style={{ minHeight: '60vh' }}>
                  <i className="bi bi-play-circle" />
                  <h5>Select a topic to start learning</h5>
                  <p>Choose a topic from the sidebar to begin.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right AI panel — flex column keeps input pinned at bottom */}
        <aside className="learn-ai-panel"
          style={{ display: 'flex', flexDirection: 'column' }}
          aria-label="AI assistant" aria-hidden={!aiOpen}>
          <div className="ai-panel-header" style={{ flexShrink: 0 }}>
            <div className="ai-panel-title"><i className="bi bi-robot" /> Intellect AI</div>
            <button className="btn btn-sm btn-outline-secondary"
              onClick={() => setAiOpen(false)} aria-label="Close AI">
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <AiPanelInner />
        </aside>
      </div>
    </>
  );
}
