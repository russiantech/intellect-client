import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { assessmentsApi } from '@/services/api';
import { Assessment, Question } from '@/types';
import { Spinner, PageTitle } from '@/components/shared/index';

export default function TakeAssessment() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!assessmentId) return;
    assessmentsApi.get(Number(assessmentId))
      .then(r => {
        const a: Assessment = r.data;
        setAssessment(a);
        if (a.time_limit_minutes) {
          setTimeLeft(a.time_limit_minutes * 60);
        }
      })
      .catch(() => toast.error('Assessment not found'))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, submitted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const unanswered = assessment.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0 && !window.confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) return;

    setSubmitting(true);
    try {
      const payload = {
        assessment_id: assessment.id,
        answers: assessment.questions.map(q => ({
          question_id: q.id,
          response: answers[q.id] || '',
        })),
      };
      const res = await assessmentsApi.submit(payload);
      setResult(res.data);
      setSubmitted(true);
      toast.success('Assessment submitted!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!assessment) return (
    <div className="text-center py-5">
      <i className="bi bi-exclamation-circle text-muted" style={{ fontSize: '3rem' }} />
      <h5 className="mt-3">Assessment not found</h5>
      <Link to="/my-assessments" className="btn btn-primary mt-3">Back to Assessments</Link>
    </div>
  );

  // Results view
  if (submitted && result) {
    return (
      <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="card p-5 text-center">
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: result.passed ? '#d1fae5' : '#fee2e2', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`bi ${result.passed ? 'bi-trophy-fill text-success' : 'bi-x-circle-fill text-danger'}`} style={{ fontSize: '2.5rem' }} />
          </div>
          <h3 className="fw-bold mb-2">{result.passed ? 'Well done!' : 'Keep practicing!'}</h3>
          <div className="mb-4">
            <div style={{ fontSize: '3rem', fontWeight: 900, color: result.passed ? 'var(--success)' : 'var(--danger)' }}>
              {result.percentage?.toFixed(0)}%
            </div>
            <div className="text-muted">Score: {result.score} / {assessment.total_marks}</div>
            <div className="mt-2">
              <span className={`badge ${result.passed ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                {result.passed ? '✓ Passed' : '✗ Failed'}
              </span>
            </div>
          </div>

          {/* Score bar */}
          <div className="mb-4">
            <div className="progress" style={{ height: 12 }}>
              <div
                className={`progress-bar ${result.passed ? 'bg-success' : 'bg-danger'}`}
                style={{ width: `${result.percentage}%`, borderRadius: 999 }}
              />
            </div>
            <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: '0.75rem' }}>
              <span>0%</span>
              <span>Pass mark: {assessment.pass_mark}%</span>
              <span>100%</span>
            </div>
          </div>

          {result.ai_feedback && (
            <div className="card p-3 mb-4 text-start" style={{ background: 'var(--bg)' }}>
              <div className="fw-700 mb-1" style={{ fontSize: '0.8rem' }}><i className="bi bi-robot me-1 text-primary" />AI Feedback</div>
              <p className="mb-0 text-muted" style={{ fontSize: '0.875rem' }}>{result.ai_feedback}</p>
            </div>
          )}

          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link to="/my-assessments" className="btn btn-outline-secondary btn-icon-start">
              <i className="bi bi-arrow-left" /> All Assessments
            </Link>
            <Link to="/my-courses" className="btn btn-primary btn-icon-start">
              <i className="bi bi-book" /> My Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const questions = assessment.shuffle_questions
    ? [...assessment.questions].sort(() => Math.random() - 0.5)
    : assessment.questions;

  const currentQuestion = questions[currentQ];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div className="card mb-4 p-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h5 className="fw-bold mb-0">{assessment.title}</h5>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
              <span className="badge bg-primary-light text-primary me-2" style={{ textTransform: 'capitalize' }}>{assessment.assessment_type}</span>
              {assessment.total_marks} marks · Pass: {assessment.pass_mark}%
            </div>
          </div>
          {timeLeft !== null && (
            <div className={`d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-700 ${timeLeft < 60 ? 'bg-danger text-white' : timeLeft < 300 ? 'bg-warning' : 'bg-light'}`}
              style={{ fontSize: '1.25rem', minWidth: 90, justifyContent: 'center' }}>
              <i className="bi bi-clock" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="d-flex justify-content-between mb-1 text-muted" style={{ fontSize: '0.75rem' }}>
            <span>{answeredCount} of {questions.length} answered</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="progress" style={{ height: 6 }}>
            <div className="progress-bar bg-success" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Question panel */}
        <div className="col-lg-8">
          <div className="card p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge bg-primary" style={{ minWidth: 32 }}>{currentQ + 1}</span>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>of {questions.length} · {currentQuestion?.marks} mark{currentQuestion?.marks !== 1 ? 's' : ''}</span>
            </div>

            <h6 className="fw-700 mb-4" style={{ fontSize: '1rem', lineHeight: 1.6 }}>
              {currentQuestion?.body}
            </h6>

            {/* MCQ */}
            {currentQuestion?.question_type === 'mcq' && currentQuestion.options && (
              <div className="d-flex flex-column gap-2">
                {currentQuestion.options.map((opt, i) => (
                  <label
                    key={i}
                    className={`d-flex align-items-center gap-3 p-3 rounded-3 cursor-pointer ${answers[currentQuestion.id] === opt ? 'bg-primary-light' : 'bg-light'}`}
                    style={{ cursor: 'pointer', border: `2px solid ${answers[currentQuestion.id] === opt ? 'var(--primary)' : 'transparent'}`, transition: 'var(--transition)' }}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQuestion.id}`}
                      value={opt}
                      checked={answers[currentQuestion.id] === opt}
                      onChange={() => handleAnswer(currentQuestion.id, opt)}
                      className="form-check-input mt-0"
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* True/False */}
            {currentQuestion?.question_type === 'true_false' && (
              <div className="d-flex gap-3">
                {['True', 'False'].map(opt => (
                  <label
                    key={opt}
                    className={`flex-1 p-3 text-center rounded-3 cursor-pointer fw-600 ${answers[currentQuestion.id] === opt ? 'bg-primary text-white' : 'bg-light'}`}
                    style={{ cursor: 'pointer', border: `2px solid ${answers[currentQuestion.id] === opt ? 'var(--primary)' : 'var(--border)'}`, transition: 'var(--transition)' }}
                  >
                    <input type="radio" name={`q-${currentQuestion.id}`} value={opt} checked={answers[currentQuestion.id] === opt} onChange={() => handleAnswer(currentQuestion.id, opt)} className="visually-hidden" />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {/* Short answer */}
            {currentQuestion?.question_type === 'short_answer' && (
              <textarea
                className="form-control"
                rows={4}
                placeholder="Type your answer here…"
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
              />
            )}

            {/* Essay */}
            {currentQuestion?.question_type === 'essay' && (
              <textarea
                className="form-control"
                rows={8}
                placeholder="Write your essay response here…"
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleAnswer(currentQuestion.id, e.target.value)}
              />
            )}

            {/* Navigation */}
            <div className="d-flex justify-content-between mt-4">
              <button
                className="btn btn-outline-secondary btn-icon-start"
                onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
                disabled={currentQ === 0}
              >
                <i className="bi bi-chevron-left" /> Previous
              </button>

              {currentQ < questions.length - 1 ? (
                <button
                  className="btn btn-primary btn-icon-start"
                  onClick={() => setCurrentQ(p => p + 1)}
                >
                  Next <i className="bi bi-chevron-right" />
                </button>
              ) : (
                <button
                  className="btn btn-success btn-icon-start fw-700"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Submitting…</> : <><i className="bi bi-check-circle" /> Submit Assessment</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question navigator */}
        <div className="col-lg-4">
          <div className="card p-3">
            <h6 className="fw-700 mb-3">Questions</h6>
            <div className="d-flex flex-wrap gap-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  className={`btn btn-sm ${i === currentQ ? 'btn-primary' : answers[q.id] ? 'btn-success' : 'btn-outline-secondary'}`}
                  style={{ width: 36, height: 36, padding: 0, borderRadius: 6 }}
                  onClick={() => setCurrentQ(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 d-flex flex-column gap-1" style={{ fontSize: '0.75rem' }}>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--primary)' }} />
                <span className="text-muted">Current</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--success)' }} />
                <span className="text-muted">Answered ({answeredCount})</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 14, height: 14, borderRadius: 3, border: '1px solid var(--border)' }} />
                <span className="text-muted">Unanswered ({questions.length - answeredCount})</span>
              </div>
            </div>

            {/* Submit from sidebar too */}
            <button
              className="btn btn-success w-100 mt-3 fw-600 btn-icon-start"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-circle" />}
              Submit ({answeredCount}/{questions.length})
            </button>
          </div>

          {assessment.description && (
            <div className="card p-3 mt-3">
              <h6 className="fw-700 mb-2" style={{ fontSize: '0.85rem' }}>Instructions</h6>
              <p className="text-muted mb-0" style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>{assessment.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
