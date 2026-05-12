
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* logo */}
          
          <h5 className="display-3 text-white fw-bold mb-4" style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem' }}>
            <img src="/assets/images/logos/favicon.svg" alt="Intellect Logo" style={{ width: '2rem', height: '2rem', marginRight: '0.5rem' }} />Intellect
            </h5>
          <p className="text-white opacity-75 mb-4">Your Digital Learning Companion</p>
          <p className="text-white opacity-75" style={{ fontSize: '0.875rem', maxWidth: 360 }}>
            Don't worry — it happens to the best of us. We'll help you get back in safely.
          </p>
        </div>
      </div>
      <div className="auth-right">{children}</div>
    </div>
  );
}





