
// import { useState } from 'react';
// import { Link, useSearchParams } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { authApi } from '@/services/api';
// import AuthShell from '@/components/auth/AuthShell';


// export default function ResetPassword() {
//   const [params] = useSearchParams();
//   const token = params.get('token') || '';
//   const [form, setForm] = useState({ new_password: '', confirm: '' });
//   const [loading, setLoading] = useState(false);
//   const [done, setDone] = useState(false);
//   const [showPw, setShowPw] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (form.new_password !== form.confirm) return toast.error('Passwords do not match');
//     if (form.new_password.length < 8) return toast.error('Password must be at least 8 characters');
//     setLoading(true);
//     try {
//       await authApi.resetPassword({ token, new_password: form.new_password });
//       setDone(true);
//       toast.success('Password reset successfully!');
//     } catch (err: any) { toast.error(err.response?.data?.detail || 'Reset failed'); }
//     finally { setLoading(false); }
//   };

//   return (
//     <AuthShell>
//       <div>
//         <Link to="/" className="nav-logo d-inline-flex mb-5" style={{ fontSize: '1.4rem' }}>
//           <img src="/assets/images/logos/favicon.svg" alt="Intellect Logo" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
//           Intellect
//         </Link>
//         {done ? (
//           <div className="text-center">
//             <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#d1fae5', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//               <i className="bi bi-check-circle text-success" style={{ fontSize: '2rem' }} />
//             </div>
//             <h4 className="fw-bold mb-2">Password Reset!</h4>
//             <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Your password has been changed. You can now sign in with your new password.</p>
//             <Link to="/auth/signin" className="btn btn-primary w-100 py-2">Sign In Now</Link>
//           </div>
//         ) : (
//           <>
//             <h4 className="fw-bold mb-1">Reset your password</h4>
//             <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Choose a strong password for your account.</p>
//             <form onSubmit={handleSubmit}>
//               <div className="mb-3">
//                 <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>New Password</label>
//                 <div className="position-relative">
//                   <i className="bi bi-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
//                   <input type={showPw ? 'text' : 'password'} className="form-control" placeholder="Min 8 characters"
//                     value={form.new_password} onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))} style={{ paddingLeft: '2.5rem' }} required />
//                 </div>
//               </div>
//               <div className="mb-4">
//                 <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Confirm Password</label>
//                 <div className="position-relative">
//                   <i className="bi bi-shield-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
//                   <input type={showPw ? 'text' : 'password'} className="form-control" placeholder="Repeat password"
//                     value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} style={{ paddingLeft: '2.5rem' }} required />
//                 </div>
//               </div>
//               <div className="form-check mb-4">
//                 <input type="checkbox" className="form-check-input" id="showpw2" onChange={e => setShowPw(e.target.checked)} />
//                 <label className="form-check-label" htmlFor="showpw2" style={{ fontSize: '0.8rem' }}>Show passwords</label>
//               </div>
//               <button type="submit" className="btn btn-primary w-100 py-2 fw-600" disabled={loading || !token}>
//                 {loading ? <><span className="spinner-border spinner-border-sm me-2" />Resetting…</> : 'Reset Password'}
//               </button>
//             </form>
//           </>
//         )}
//       </div>
//     </AuthShell>
//   );
// }




// v2
// pages/auth/ResetPassword.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import OTPInput from '@/components/auth/OTPInput';
import AuthShell from '@/components/auth/AuthShell';

interface ResetSession {
  token: string;
  email: string;
  expires_in_seconds: number;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ResetSession | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  // ── Load session from sessionStorage ──────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('reset_data');
    if (!raw) {
      navigate('/auth/forgot-password');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const sessionData = parsed.data ?? parsed;
      if (!sessionData?.token) {
        sessionStorage.removeItem('reset_data');
        navigate('/auth/forgot-password');
        return;
      }
      setSession(sessionData);
      setTimeLeft(sessionData.expires_in_seconds ?? 900);
    } catch {
      sessionStorage.removeItem('reset_data');
      navigate('/auth/forgot-password');
    }
  }, [navigate]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0) {
      sessionStorage.removeItem('reset_data');
      toast.error('Reset session expired. Please start again.');
      navigate('/auth/forgot-password');
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
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 4) return toast.error('Password must be at least 4 characters');

    setLoading(true);
    try {
      await authApi.resetPassword({
        token: session.token,
        email_code: code,
        new_password: newPassword,
      });
      sessionStorage.removeItem('reset_data');
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!session || resending) return;
    setResending(true);
    try {
      await authApi.resendResetCode({ token: session.token });
      setTimeLeft(900);
      setCode('');
      toast.success('New reset code sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  if (!session) return null;

  const canResend = timeLeft <= 840; // enable after first 60 s

  return (
    <AuthShell>
      <div>
        <Link to="/" className="nav-logo d-inline-flex mb-5" style={{ fontSize: '1.4rem' }}>
          <img src="/assets/images/logos/favicon.svg" alt="" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
          Intellect
        </Link>

        {done ? (
          <div className="text-center">
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#d1fae5', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-check-circle text-success" style={{ fontSize: '2rem' }} />
            </div>
            <h4 className="fw-bold mb-2">Password Reset!</h4>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
              Your password has been changed. You can now sign in with your new password.
            </p>
            <Link to="/auth/signin" className="btn btn-primary w-100 py-2">Sign In Now</Link>
          </div>
        ) : (
          <>
            <h4 className="fw-bold mb-1">Reset your password</h4>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
              Enter the 6-digit code sent to <strong>{session.email}</strong> and choose a new password.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Reset Code</label>
                <OTPInput
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                  mode="alphanumeric"
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>New Password</label>
                <div className="position-relative">
                  <i className="bi bi-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Min 4 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Confirm Password</label>
                <div className="position-relative">
                  <i className="bi bi-shield-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>

              <div className="form-check mb-4">
                <input type="checkbox" className="form-check-input" id="showpw" onChange={e => setShowPw(e.target.checked)} />
                <label className="form-check-label" htmlFor="showpw" style={{ fontSize: '0.8rem' }}>Show passwords</label>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-600"
                disabled={loading || code.length !== 6 || !newPassword || !confirmPassword}
              >
                {loading ? <><span className="spinner-border spinner-border-sm me-2" />Resetting…</> : 'Reset Password'}
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
                      : `Resend available in ${60 - (900 - timeLeft)}s`}
                </button>
              </div>

              <div className="text-center mt-2">
                <span
                  className={`badge rounded-pill px-3 py-2 ${timeLeft < 60 ? 'bg-danger' : 'bg-warning text-dark'}`}
                  style={{ fontSize: '0.78rem' }}
                >
                  <i className="bi bi-clock me-1" />
                  Expires in {formatTime(timeLeft)}
                </span>
              </div>

              <div className="text-center mt-3">
                <Link to="/auth/forgot-password" className="text-muted" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-arrow-left me-1" />Back to Forgot Password
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
