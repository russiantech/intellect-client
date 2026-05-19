// src/components/auth/OAuthButtons.tsx
import { useEffect, useState } from 'react';
import { authApi } from '@/services/api';
import { useOAuthPopup } from '@/hooks/useOAuthPopup';

const META: Record<string, { label: string; icon: string; style: React.CSSProperties }> = {
  google: {
    label: 'Google',
    icon: 'bi-google',
    style: { background: '#fff', color: '#444', border: '1px solid #dadce0' },
  },
  github: {
    label: 'GitHub',
    icon: 'bi-github',
    style: { background: '#24292f', color: '#fff', border: '1px solid #24292f' },
  },
  facebook: {
    label: 'Facebook',
    icon: 'bi-facebook',
    style: { background: '#1877f2', color: '#fff', border: '1px solid #1877f2' },
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'bi-linkedin',
    style: { background: '#0a66c2', color: '#fff', border: '1px solid #0a66c2' },
  },
};

export default function OAuthButtons() {
  const [providers, setProviders] = useState<string[]>([]);
  const { openPopup } = useOAuthPopup();

  useEffect(() => {
    let mounted = true;
    authApi
      .getOAuthProviders()
      .then((res: any) => {
        if (!mounted) return;
        const list = res.data?.data?.map((p: any) => p.provider) || [];
        setProviders(list);
      })
      .catch(() => {
        if (mounted) setProviders([]);
      });
    return () => { mounted = false; };
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="d-flex align-items-center gap-2 mb-3">
        <hr className="flex-grow-1 opacity-25 m-0" />
        <span
          className="text-muted text-uppercase"
          style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
        >
          Or continue with
        </span>
        <hr className="flex-grow-1 opacity-25 m-0" />
      </div>

      <div className="d-flex flex-wrap justify-content-center gap-2">
        {providers.map((p) => {
          const m = META[p] || { label: p, icon: 'bi-box-arrow-in-right', style: {} };
          const isDark = p === 'github' || p === 'facebook' || p === 'linkedin';

          return (
            <button
              key={p}
              type="button"
              onClick={() => openPopup(p)}
              className="btn d-inline-flex align-items-center gap-2 fw-500"
              style={{
                fontSize: '0.82rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '0.375rem',
                transition: 'all 0.15s ease',
                flex: '1 1 auto',
                maxWidth: '132px',
                justifyContent: 'center',
                ...m.style,
              }}
              onMouseEnter={(e) => {
                if (!isDark) e.currentTarget.style.background = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                if (!isDark) e.currentTarget.style.background = '#fff';
              }}
            >
              <i className={`bi ${m.icon}`} style={{ fontSize: '0.95rem' }} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
