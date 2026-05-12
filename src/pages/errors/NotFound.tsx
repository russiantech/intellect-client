import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="text-center py-5 fade-in" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '8rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-heading)', lineHeight: 1, opacity: 0.15 }}>404</div>
      <div className="mt-n4 mb-3" style={{ marginTop: '-2rem' }}>
        <i className="bi bi-compass text-primary" style={{ fontSize: '3.5rem' }} />
      </div>
      <h3 className="fw-bold mb-2">Page not found</h3>
      <p className="text-muted mb-4" style={{ maxWidth: 380 }}>
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div className="d-flex gap-3 flex-wrap justify-content-center">
        <button className="btn btn-outline-secondary btn-icon-start" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left" /> Go Back
        </button>
        <Link to="/" className="btn btn-primary btn-icon-start">
          <i className="bi bi-house" /> Go Home
        </Link>
      </div>
    </div>
  );
}
