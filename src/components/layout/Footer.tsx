import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: 'var(--foreground)', borderTop: '1px solid var(--border)', padding: '2rem 1.5rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="row g-4">
          <div className="col-lg-4">
            <Link to="/" className="nav-logo d-inline-flex mb-3" style={{ fontSize: '1.25rem', textDecoration: 'none' }}>
              <img src="/assets/images/logos/favicon.ico" alt="Intellect Logo" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />
              Intellect
            </Link>
            <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
              Your Digital Learning Companion — empowering learners and creators to grow, connect, and succeed.
            </p>
            <div className="d-flex gap-2 mt-3">
              {[
                { icon: 'bi-twitter-x', href: '#' },
                { icon: 'bi-linkedin', href: '#' },
                { icon: 'bi-whatsapp', href: 'https://chat.whatsapp.com/J5PdJfWKh8w7Kkv613ekXZ' },
                { icon: 'bi-facebook', href: '#' },
              ].map(s => (
                <Link key={s.icon} to={s.href} className="nav-icon-btn" style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--text-muted)', transition: 'var(--transition)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-light)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}>
                  <i className={`bi ${s.icon}`} style={{ fontSize: '0.875rem' }} />
                </Link>
              ))}
            </div>
          </div>

          <div className="col-6 col-lg-2">
            <h6 className="fw-700 mb-3" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Learn</h6>
            <div className="d-flex flex-column gap-2">
              {[
                { to: '/explore', label: 'All Courses' },
                { to: '/paths', label: 'Learning Paths' },
                { to: '/instructors', label: 'Instructors' },
                { to: '/my-courses', label: 'My Courses' },
                { to: '/my-certificates', label: 'Certificates' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="text-muted" style={{ fontSize: '0.85rem', textDecoration: 'none', transition: 'var(--transition)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="col-6 col-lg-2">
            <h6 className="fw-700 mb-3" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Create</h6>
            <div className="d-flex flex-column gap-2">
              {[
                { to: '/creator', label: 'Creator Studio' },
                { to: '/creator/courses/new', label: 'Create Course' },
                { to: '/creator/earnings', label: 'Earnings' },
                { to: '/creator/students', label: 'My Students' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="text-muted" style={{ fontSize: '0.85rem', textDecoration: 'none', transition: 'var(--transition)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="col-6 col-lg-2">
            <h6 className="fw-700 mb-3" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Company</h6>
            <div className="d-flex flex-column gap-2">
              {[
                { to: '/about', label: 'About Intellect' },
                { to: '/instructors', label: 'Our Team' },
                { to: 'mailto:hello@intellect.ng', label: 'Contact' },
                { to: '#!', label: 'Privacy Policy' },
                { to: '#', label: 'Terms of Service' },
              ].map(l => (
                <Link key={l.label} to={l.to} className="text-muted" style={{ fontSize: '0.85rem', textDecoration: 'none', transition: 'var(--transition)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="col-6 col-lg-2">
            <h6 className="fw-700 mb-3" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Get Started</h6>
            <div className="d-flex flex-column gap-2">
              <Link to="/auth/signup" className="btn btn-primary btn-sm fw-600">Create Account</Link>
              <Link to="/auth/signin" className="btn btn-outline-secondary btn-sm">Sign In</Link>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <i className="bi bi-shield-check me-1 text-success" />SSL Secured
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <i className="bi bi-lock me-1 text-primary" />Privacy Protected
              </div>
            </div>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border)', margin: '2rem 0 1.5rem' }} />

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
            © {year} <Link to="https://techa.salesnet.ng" className="text-primary btn-sm fw-600"> Intellect • Techa </Link>. All rights reserved.
          </p>
          <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
            Built with <i className="bi bi-heart-fill text-danger" style={{ fontSize: '0.7rem' }} /> for learning - 
            <Link to="https://techa.salesnet.ng" className="text-primary btn-sm fw-600">Russian Developers</Link>.
          </p>
        </div>
      </div>
    </footer>
  );
}
