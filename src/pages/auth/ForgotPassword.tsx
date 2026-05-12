// import { useState } from 'react';
// import { Link } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { authApi } from '@/services/api';
// import AuthShell from '@/components/auth/AuthShell';

// export default function ForgotPassword() {
//   const [email, setEmail] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [sent, setSent] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!email) return toast.error('Please enter your email');
//     setLoading(true);
//     try {
//       await authApi.forgotPassword(email);
//       setSent(true);
//     } catch { toast.error('Something went wrong'); }
//     finally { setLoading(false); }
//   };

//   return (
//     <AuthShell>
//       <div>
//         <Link to="/" className="nav-logo d-inline-flex mb-5" style={{ fontSize: '1.4rem' }}>
//           <img src="/assets/images/logos/favicon.svg" alt="Intellect Logo" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
//           Intellect
//         </Link>
//         {sent ? (
//           <div className="text-center">
//             <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--primary-light)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//               <i className="bi bi-envelope text-primary" style={{ fontSize: '1.8rem' }} />
//             </div>
//             <h4 className="fw-bold mb-2">Check your inbox</h4>
//             <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>If <strong>{email}</strong> is registered, you'll receive a reset link shortly.</p>
//             <Link to="/auth/signin" className="btn btn-primary w-100 py-2">Back to Sign In</Link>
//           </div>
//         ) : (
//           <>
//             <h4 className="fw-bold mb-1">Forgot password?</h4>
//             <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Enter your email and we'll send a reset link.</p>
//             <form onSubmit={handleSubmit}>
//               <div className="mb-4">
//                 <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Email Address</label>
//                 <div className="position-relative">
//                   <i className="bi bi-envelope position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
//                   <input type="email" className="form-control" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: '2.5rem' }} required />
//                 </div>
//               </div>
//               <button type="submit" className="btn btn-primary w-100 py-2 fw-600" disabled={loading}>
//                 {loading ? <><span className="spinner-border spinner-border-sm me-2" />Sending…</> : 'Send Reset Link'}
//               </button>
//               <div className="text-center mt-3">
//                 <Link to="/auth/signin" className="text-muted" style={{ fontSize: '0.8rem' }}>
//                   <i className="bi bi-arrow-left me-1" />Back to Sign In
//                 </Link>
//               </div>
//             </form>
//           </>
//         )}
//       </div>
//     </AuthShell>
//   );
// }

// // export function ResetPassword() {
// //   const [params] = useSearchParams();
// //   const token = params.get('token') || '';
// //   const [form, setForm] = useState({ new_password: '', confirm: '' });
// //   const [loading, setLoading] = useState(false);
// //   const [done, setDone] = useState(false);
// //   const [showPw, setShowPw] = useState(false);

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (form.new_password !== form.confirm) return toast.error('Passwords do not match');
// //     if (form.new_password.length < 8) return toast.error('Password must be at least 8 characters');
// //     setLoading(true);
// //     try {
// //       await authApi.resetPassword({ token, new_password: form.new_password });
// //       setDone(true);
// //       toast.success('Password reset successfully!');
// //     } catch (err: any) { toast.error(err.response?.data?.detail || 'Reset failed'); }
// //     finally { setLoading(false); }
// //   };

// //   return (
// //     <AuthShell>
// //       <div>
// //         <Link to="/" className="nav-logo d-inline-flex mb-5" style={{ fontSize: '1.4rem' }}>
// //           <img src="/assets/images/logos/favicon.svg" alt="Intellect Logo" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
// //           Intellect
// //         </Link>
// //         {done ? (
// //           <div className="text-center">
// //             <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#d1fae5', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
// //               <i className="bi bi-check-circle text-success" style={{ fontSize: '2rem' }} />
// //             </div>
// //             <h4 className="fw-bold mb-2">Password Reset!</h4>
// //             <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Your password has been changed. You can now sign in with your new password.</p>
// //             <Link to="/auth/signin" className="btn btn-primary w-100 py-2">Sign In Now</Link>
// //           </div>
// //         ) : (
// //           <>
// //             <h4 className="fw-bold mb-1">Reset your password</h4>
// //             <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Choose a strong password for your account.</p>
// //             <form onSubmit={handleSubmit}>
// //               <div className="mb-3">
// //                 <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>New Password</label>
// //                 <div className="position-relative">
// //                   <i className="bi bi-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
// //                   <input type={showPw ? 'text' : 'password'} className="form-control" placeholder="Min 8 characters"
// //                     value={form.new_password} onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))} style={{ paddingLeft: '2.5rem' }} required />
// //                 </div>
// //               </div>
// //               <div className="mb-4">
// //                 <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Confirm Password</label>
// //                 <div className="position-relative">
// //                   <i className="bi bi-shield-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
// //                   <input type={showPw ? 'text' : 'password'} className="form-control" placeholder="Repeat password"
// //                     value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} style={{ paddingLeft: '2.5rem' }} required />
// //                 </div>
// //               </div>
// //               <div className="form-check mb-4">
// //                 <input type="checkbox" className="form-check-input" id="showpw2" onChange={e => setShowPw(e.target.checked)} />
// //                 <label className="form-check-label" htmlFor="showpw2" style={{ fontSize: '0.8rem' }}>Show passwords</label>
// //               </div>
// //               <button type="submit" className="btn btn-primary w-100 py-2 fw-600" disabled={loading || !token}>
// //                 {loading ? <><span className="spinner-border spinner-border-sm me-2" />Resetting…</> : 'Reset Password'}
// //               </button>
// //             </form>
// //           </>
// //         )}
// //       </div>
// //     </AuthShell>
// //   );
// // }

// // export default ForgotPassword;


// v2
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import AuthShell from '@/components/auth/AuthShell';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email');

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());

      // Store session for the reset page (consistent with signup flow)
      sessionStorage.setItem('reset_data', JSON.stringify(res.data));
      setSent(true);

      // Small delay so the user sees the "Check your inbox" state, then navigate
      setTimeout(() => navigate('/auth/reset-password'), 1200);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div>
        <Link to="/" className="nav-logo d-inline-flex mb-5" style={{ fontSize: '1.4rem' }}>
          <img src="/assets/images/logos/favicon.svg" alt="Intellect Logo" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
          Intellect
        </Link>

        {sent ? (
          <div className="text-center">
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--primary-light)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-envelope text-primary" style={{ fontSize: '1.8rem' }} />
            </div>
            <h4 className="fw-bold mb-2">Check your inbox</h4>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
              If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
            </p>
            <div className="spinner-border spinner-border-sm text-primary" />
          </div>
        ) : (
          <>
            <h4 className="fw-bold mb-1">Forgot password?</h4>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
              Enter your email and we'll send a reset code.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Email Address</label>
                <div className="position-relative">
                  <i className="bi bi-envelope position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-100 py-2 fw-600" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-2" />Sending…</> : 'Send Reset Code'}
              </button>
              <div className="text-center mt-3">
                <Link to="/auth/signin" className="text-muted" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-arrow-left me-1" />Back to Sign In
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
