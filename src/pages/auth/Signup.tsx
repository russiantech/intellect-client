// pages/auth/Signup.tsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import OAuthButtons from '@/components/auth/OAuthButtons';

export default function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: params.get('email') || '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Full name is required');
    if (!form.username.trim()) return toast.error('Username is required');
    if (!form.email.trim()) return toast.error('Email is required');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 4) return toast.error('Password must be at least 4 characters');

    setLoading(true);
    try {
      const res = await authApi.signup({
        name: form.name,
        username: form.username,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });

      sessionStorage.setItem('verification_data', JSON.stringify(res.data));

      toast.success('Verification code sent to your email!');
      navigate('/auth/verify-signup');
    } catch (err: any) {
      const detail =
        err.response?.data?.message
        || err.response?.data?.detail
        || (typeof err.message === 'string' ? err.message : JSON.stringify(err.message))
        || 'Registration failed';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* ── Left panel ── */}
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h5 className="fw-bold mb-4" style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', color: '#fff' }}>
            <img src="/assets/images/logos/favicon.svg" alt="" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
            Intellect
          </h5>
          <p className="text-white opacity-75 lh-lg mb-5" style={{ maxWidth: 400 }}>
            Join thousands of learners and creators building their future on Intellect.
          </p>
          <div className="d-flex flex-column gap-3">
            {[
              { icon: 'bi-book', text: 'Access hundreds of courses' },
              { icon: 'bi-pencil-square', text: 'Create and sell your own courses' },
              { icon: 'bi-graph-up', text: 'Track your learning progress' },
              { icon: 'bi-patch-check', text: 'Earn verified certificates' },
            ].map(item => (
              <div key={item.text} className="d-flex align-items-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`bi ${item.icon} text-white`} />
                </div>
                <span className="text-white opacity-75" style={{ fontSize: '0.875rem' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div>
          <Link to="/" className="nav-logo d-inline-flex mb-4" style={{ fontSize: '1.4rem' }}>
            <img src="/assets/images/logos/favicon.svg" alt="" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
            Intellect
          </Link>

          <div className="mb-4">
            <h4 className="fw-bold mb-1">Create your account</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              Already have one?{' '}
              <Link to="/auth/signin" className="fw-600 border pe-2 rounded-pill">Sign in</Link>
            </p>
          </div>
          
          <form onSubmit={handleSubmit} noValidate className="mt-2">
            <div className="row">
              {/* Full name */}
              <div className="col-12 mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Full Name</label>
                <div className="position-relative">
                  <i className="bi bi-person position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type="text" className="form-control" placeholder="Chris James"
                    value={form.name} onChange={e => set('name', e.target.value)}
                    style={{ paddingLeft: '2.5rem' }} required
                  />
                </div>
              </div>

              {/* Username + Phone */}
              <div className="col-sm-6 mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Username</label>
                <div className="position-relative">
                  <i className="bi bi-at position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type="text" className="form-control" placeholder="chrisjames"
                    value={form.username} onChange={e => set('username', e.target.value.toLowerCase())}
                    style={{ paddingLeft: '2.5rem' }} required
                  />
                </div>
              </div>
              <div className="col-sm-6 mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Phone <span className="text-muted fw-normal">(optional)</span></label>
                <div className="position-relative">
                  <i className="bi bi-telephone position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type="tel" className="form-control" placeholder="+234…"
                    value={form.phone} onChange={e => set('phone', e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="col-12 mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Email Address</label>
                <div className="position-relative">
                  <i className="bi bi-envelope position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type="email" className="form-control" placeholder="you@example.com"
                    value={form.email} onChange={e => set('email', e.target.value)}
                    style={{ paddingLeft: '2.5rem' }} required
                  />
                </div>
              </div>

              {/* Password + Confirm */}
              <div className="col-sm-6 mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Password</label>
                <div className="position-relative">
                  <i className="bi bi-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type={showPw ? 'text' : 'password'} className="form-control" placeholder="Min 4 chars"
                    value={form.password} onChange={e => set('password', e.target.value)}
                    style={{ paddingLeft: '2.5rem' }} required
                  />
                </div>
              </div>
              <div className="col-sm-6 mb-3">
                <label className="form-label fw-600" style={{ fontSize: '0.8rem' }}>Confirm Password</label>
                <div className="position-relative">
                  <i className="bi bi-shield-lock position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2 }} />
                  <input
                    type={showPw ? 'text' : 'password'} className="form-control" placeholder="Repeat password"
                    value={form.confirm} onChange={e => set('confirm', e.target.value)}
                    style={{ paddingLeft: '2.5rem' }} required
                  />
                </div>
              </div>
            </div>

            <div className="form-check mb-3">
              <input type="checkbox" className="form-check-input" id="showpw" onChange={e => setShowPw(e.target.checked)} />
              <label className="form-check-label" htmlFor="showpw" style={{ fontSize: '0.8rem' }}>Show passwords</label>
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 fw-600" disabled={loading}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Creating account…</>
                : 'Create Account'}
            </button>
          </form>
              
            <OAuthButtons />

          <p className="text-muted text-center mt-3" style={{ fontSize: '0.75rem' }}>
            By signing up, you agree to our{' '}
            <a href="/terms" className="text-primary">Terms</a> and{' '}
            <a href="/privacy" className="text-primary">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}