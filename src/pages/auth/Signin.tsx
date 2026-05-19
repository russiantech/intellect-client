import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import OAuthButtons from '@/components/auth/OAuthButtons';

export default function Signin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || null;

  const [form, setForm] = useState({ identifier: '', password: '', remember_me: false });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.identifier || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const res = await authApi.signin(form);
      login(res.data);
      const user = res.data.user;
      const dest = from || (
        user.primary_role === 'admin' || user.primary_role === 'super_admin' ? '/admin'
        : user.primary_role === 'tutor' ? '/tutor'
        : user.primary_role === 'creator' ? '/creator'
        : user.primary_role === 'partner' ? '/partner'
        : '/dashboard'
      );
      navigate(dest, { replace: true });
      toast.success(`Welcome back, ${user.name || user.username}!`);
    } catch (err: any) {
      const detail =
        err.response?.data?.message
        || err.response?.data?.detail
        || err.response?.data?.errors?.detail
        || (typeof err.message === 'string' ? err.message : JSON.stringify(err.message))
        || 'Sign in failed';
      toast.error(detail);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-layout">
      {/* Left panel */}
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="mb-5">
            <h5 className="display-3 text-white fw-bold" style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem' }}>
              <img src="/assets/images/logos/favicon.svg" alt="Intellect Logo" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
              Intellect</h5>
            <p className="text-white opacity-75" style={{ fontSize: '0.875rem' }}>Your Digital Learning Companion</p>
          </div>
          <p className="text-white lh-lg mb-5 opacity-75" style={{ maxWidth: 400 }}>
            Building a future where learning fits seamlessly into everyday life.
            Empowering individuals to acquire skills on their own terms.
          </p>
          <div className="d-flex flex-column gap-3">
            {[
              { icon: 'bi-play-circle', text: 'Video, PDF, PPT & more content types' },
              { icon: 'bi-robot', text: 'AI-powered learning assistant' },
              { icon: 'bi-award', text: 'Auto-generated certificates' },
              { icon: 'bi-people', text: 'Live instructor-led sessions' },
            ].map(item => (
              <div key={item.text} className="d-flex align-items-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`bi ${item.icon} text-white`} />
                </div>
                <span className="text-white opacity-75" style={{ fontSize: '0.875rem' }}>{item.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Link to="/about" className="btn btn-white btn-outline-white border text-white">Learn More</Link>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div>
          <Link to="/" className="nav-logo d-inline-flex mb-5" style={{ fontSize: '1.6rem' }}>
            <img src="/assets/images/logos/favicon.svg" alt="Intellect Logo" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
            Intellect
          </Link>

          <div className="mb-4">
            <h4 className="fw-bold mb-1">Welcome back</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              New here? <Link to="/auth/signup" className="fw-600 border pe-2 rounded-pill">Create an account</Link>
            </p>
          </div>

          <OAuthButtons mode="signin" />

          <form onSubmit={handleSubmit} noValidate className="mt-2">
            <div className="mb-3 filled form-group">
              <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Email, Username or Phone</label>
              <div className="position-relative">
                <i className="bi bi-person position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                <input
                  type="text" className="form-control" placeholder="you@example.com or chrisjames"
                  value={form.identifier} onChange={e => set('identifier', e.target.value)}
                  style={{ paddingLeft: '2.5rem' }} autoComplete="username"
                />
              </div>
            </div>

            <div className="mb-3 filled form-group">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-600 mb-0" style={{ fontSize: '0.8rem' }}>Password</label>
                <Link to="/auth/forgot-password" className="text-muted" style={{ fontSize: '0.75rem' }}>Forgot password?</Link>
              </div>
              <div className="position-relative">
                <i className="bi bi-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                <input
                  type={showPw ? 'text' : 'password'} className="form-control" placeholder="Your password"
                  value={form.password} onChange={e => set('password', e.target.value)}
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="nav-icon-btn" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                  <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </div>

            <div className="mb-4 form-check">
              <input type="checkbox" className="form-check-input" id="remember"
                checked={form.remember_me} onChange={e => set('remember_me', e.target.checked)} />
              <label className="form-check-label" htmlFor="remember" style={{ fontSize: '0.8rem' }}>Remember me</label>
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 fw-600" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm me-2" />Signing in…</> : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-4 text-muted" style={{ fontSize: '0.75rem' }}>
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-primary">Terms</a> and{' '}
            <a href="/privacy" className="text-primary">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}