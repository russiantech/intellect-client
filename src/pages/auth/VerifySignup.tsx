// pages/auth/VerifySignup.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import OTPInput from '@/components/auth/OTPInput';

// Shape of the full API response stored in sessionStorage
interface VerificationApiResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  data: {
    token: string;
    email: string;
    expires_in_seconds: number;
  };
}

export default function VerifySignup() {
  const navigate = useNavigate();
  const [session, setSession] = useState<VerificationApiResponse['data'] | null>(null);
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // ── Load session from sessionStorage ──────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('verification_data');
    if (!raw) {
      navigate('/auth/signup');
      return;
    }
    try {
      const parsed: VerificationApiResponse = JSON.parse(raw);
      // The API response wraps the real data under `.data`
      const sessionData = parsed.data ?? parsed as any;
      if (!sessionData?.token) {
        sessionStorage.removeItem('verification_data');
        navigate('/auth/signup');
        return;
      }
      setSession(sessionData);
      setTimeLeft(sessionData.expires_in_seconds ?? 600);
    } catch {
      sessionStorage.removeItem('verification_data');
      navigate('/auth/signup');
    }
  }, [navigate]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0) {
      sessionStorage.removeItem('verification_data');
      toast.error('Verification session expired. Please sign up again.');
      navigate('/auth/signup');
      return;
    }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, navigate]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || code.length !== 6) return;

    setLoading(true);
    try {
      await authApi.verifySignup({ token: session.token, email_code: code });
      sessionStorage.removeItem('verification_data');
      toast.success('Email verified! You can now sign in.');
      navigate('/auth/signin');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!session || resending) return;
    setResending(true);
    try {
      await authApi.resendVerificationCode({ token: session.token });
      setTimeLeft(600);
      setCode('');
      toast.success('New verification code sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to resend code. Try again.');
    } finally {
      setResending(false);
    }
  };

  if (!session) return null;

  const canResend = timeLeft <= 540; // enable after first 60 s

  return (
    <div className="auth-layout">
      {/* ── Left panel ── */}
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h5 className="fw-bold mb-4" style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', color: '#fff' }}>
            <img src="/assets/images/logos/favicon.svg" alt="" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
            Intellect
          </h5>
          <p className="text-white opacity-75 mb-4">Your Digital Learning Companion</p>

          <div className="d-flex align-items-start gap-3 p-4 rounded-3 mb-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <i className="bi bi-envelope-check text-white" style={{ fontSize: '1.6rem', flexShrink: 0, marginTop: '0.15rem' }} />
            <p className="text-white opacity-75 mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              We sent a 6-digit code to{' '}
              <strong className="opacity-100">{session.email}</strong>.{' '}
              Enter it on the right to activate your account.
            </p>
          </div>

          <div className="d-flex align-items-start gap-3 p-4 rounded-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <i className="bi bi-shield-check text-white" style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: '0.1rem' }} />
            <p className="text-white opacity-75 mb-0" style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
              The code expires in{' '}
              <strong className="opacity-100">{formatTime(timeLeft)}</strong>.
              If you didn't get it, check your spam folder or request a new code.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div>
          <Link to="/" className="nav-logo d-inline-flex mb-5" style={{ fontSize: '1.4rem' }}>
            <img src="/assets/images/logos/favicon.svg" alt="" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
            Intellect
          </Link>

          <div className="text-center mb-4">
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--primary-light)',
              margin: '0 auto 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="bi bi-envelope-open text-primary" style={{ fontSize: '1.8rem' }} />
            </div>
            <h4 className="fw-bold mb-1">Verify your email</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              Enter the 6-digit code sent to <strong>{session.email}</strong>
            </p>
            <span
              className={`badge rounded-pill px-3 py-2 mt-1 ${timeLeft < 60 ? 'bg-danger' : 'bg-warning text-dark'}`}
              style={{ fontSize: '0.78rem' }}
            >
              <i className="bi bi-clock me-1" />
              Expires in {formatTime(timeLeft)}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <OTPInput
              value={code}
              onChange={setCode}
              disabled={loading}
              mode="alphanumeric"
            />

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-600"
              disabled={loading || code.length !== 6}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Verifying…</>
                : 'Verify Account'}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link p-0 text-muted"
                style={{ fontSize: '0.8rem' }}
                onClick={handleResend}
                disabled={resending || !canResend}
              >
                {resending
                  ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: '0.7rem', height: '0.7rem' }} />Resending…</>
                  : canResend
                    ? "Didn't receive a code? Resend"
                    : `Resend available in ${60 - (600 - timeLeft)}s`}
              </button>
            </div>

            <div className="text-center mt-3">
              <Link to="/auth/signup" className="text-muted" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-arrow-left me-1" />Back to Sign Up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}