// src/components/auth/OAuthModal.tsx
import { useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  providerName: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
}

export default function OAuthModal({ isOpen, providerName, iframeRef, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
        animation: 'oauthFadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: 'min(640px, calc(100vh - 2rem))',
          background: '#fff',
          borderRadius: 'clamp(0px, 2vw, 12px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'oauthSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            borderBottom: '1px solid #e9ecef',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--primary, #0d6efd)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="bi bi-shield-lock-fill text-white" style={{ fontSize: '0.75rem' }} />
            </div>
            <span
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#212529',
                textTransform: 'capitalize',
              }}
            >
              {providerName} Sign In
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              borderRadius: '0.375rem',
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" style={{ fontSize: '1.125rem' }} />
          </button>
        </div>

        {/* Iframe container */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <iframe
            ref={iframeRef}
            title={`${providerName} OAuth`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
          />
          {/* Loading overlay until iframe loads */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              transition: 'opacity 0.3s',
              pointerEvents: 'none',
            }}
            id="oauth-loading-overlay"
          >
            <div
              className="spinner-border text-primary"
              style={{ width: '1.5rem', height: '1.5rem' }}
              role="status"
            />
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.875rem',
                color: '#6c757d',
              }}
            >
              Connecting to {providerName}…
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.625rem 1rem',
            borderTop: '1px solid #e9ecef',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#adb5bd' }}>
            Secure login via OAuth 2.0. You can close this window at any time.
          </p>
        </div>
      </div>

      {/* Keyframe animations (inline for portability) */}
      <style>{`
        @keyframes oauthFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes oauthSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}


// // v2
// // src/components/auth/OAuthButtons.tsx
// import { useEffect, useState } from 'react';
// import { authApi } from '@/services/api';
// import { useOAuthPopup } from '@/hooks/useOAuthPopup';
// import OAuthModal from './OAuthModal';
// import "@/styles/components/auth/oauth-modal.css"

// const META: Record<string, { label: string; icon: string; style: React.CSSProperties }> = {
//   google: {
//     label: 'Google',
//     icon: 'bi-google',
//     style: { background: '#fff', color: '#444', border: '1px solid #dadce0' },
//   },
//   github: {
//     label: 'GitHub',
//     icon: 'bi-github',
//     style: { background: '#24292f', color: '#fff', border: '1px solid #24292f' },
//   },
//   facebook: {
//     label: 'Facebook',
//     icon: 'bi-facebook',
//     style: { background: '#1877f2', color: '#fff', border: '1px solid #1877f2' },
//   },
//   linkedin: {
//     label: 'LinkedIn',
//     icon: 'bi-linkedin',
//     style: { background: '#0a66c2', color: '#fff', border: '1px solid #0a66c2' },
//   },
// };

// export default function OAuthButtons() {
//   const [providers, setProviders] = useState<string[]>([]);
//   const { openPopup, isOpen, close, providerName } = useOAuthPopup();

//   useEffect(() => {
//     authApi
//       .getOAuthProviders()
//       .then((res: any) => {
//         const list = res.data?.data?.map((p: any) => p.provider) || [];
//         setProviders(list);
//       })
//       .catch(() => setProviders([]));
//   }, []);

//   if (providers.length === 0) return null;

//   return (
//     <>
//       <div className="mt-3">
//         <div className="d-flex align-items-center gap-2 mb-3">
//           <hr className="flex-grow-1 opacity-25 m-0" />
//           <span
//             className="text-muted text-uppercase"
//             style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
//           >
//             Or continue with
//           </span>
//           <hr className="flex-grow-1 opacity-25 m-0" />
//         </div>

//         <div className="d-flex flex-wrap justify-content-center gap-2">
//           {providers.map((p) => {
//             const m = META[p] || { label: p, icon: 'bi-box-arrow-in-right', style: {} };
//             const isDark = p === 'github' || p === 'facebook' || p === 'linkedin';

//             return (
//               <button
//                 key={p}
//                 type="button"
//                 onClick={() => openPopup(p)}
//                 className="btn d-inline-flex align-items-center gap-2 fw-500"
//                 style={{
//                   fontSize: '0.82rem',
//                   padding: '0.4rem 0.85rem',
//                   borderRadius: '0.375rem',
//                   transition: 'all 0.15s ease',
//                   flex: '1 1 auto',
//                   maxWidth: '132px',
//                   justifyContent: 'center',
//                   ...m.style,
//                 }}
//                 onMouseEnter={(e) => {
//                   if (!isDark) e.currentTarget.style.background = '#f8f9fa';
//                 }}
//                 onMouseLeave={(e) => {
//                   if (!isDark) e.currentTarget.style.background = '#fff';
//                 }}
//               >
//                 <i className={`bi ${m.icon}`} style={{ fontSize: '0.95rem' }} />
//                 <span>{m.label}</span>
//               </button>
//             );
//           })}
//         </div>
//       </div>

//       <OAuthModal
//         isOpen={isOpen}
//         providerName={providerName}
//         onClose={close}
//       />
//     </>
//   );
// }