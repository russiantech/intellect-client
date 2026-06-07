// // src/components/auth/OAuthButtons.tsx
// import { useEffect, useState } from 'react';
// import { authApi } from '@/services/api';
// import { useOAuthPopup } from '@/hooks/useOAuthPopup';

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
//   const { openPopup } = useOAuthPopup();

//   useEffect(() => {
//     let mounted = true;
//     authApi
//       .getOAuthProviders()
//       .then((res: any) => {
//         if (!mounted) return;
//         const list = res.data?.data?.map((p: any) => p.provider) || [];
//         setProviders(list);
//       })
//       .catch(() => {
//         if (mounted) setProviders([]);
//       });
//     return () => { mounted = false; };
//   }, []);

//   if (providers.length === 0) return null;

//   return (
//     <div className="mt-3">
//       <div className="d-flex align-items-center gap-2 mb-3">
//         <hr className="flex-grow-1 opacity-25 m-0" />
//         <span
//           className="text-muted text-uppercase"
//           style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
//         >
//           Or continue with
//         </span>
//         <hr className="flex-grow-1 opacity-25 m-0" />
//       </div>

//       <div className="d-flex flex-wrap justify-content-center gap-2">
//         {providers.map((p) => {
//           const m = META[p] || { label: p, icon: 'bi-box-arrow-in-right', style: {} };
//           const isDark = p === 'github' || p === 'facebook' || p === 'linkedin';

//           return (
//             <button
//               key={p}
//               type="button"
//               onClick={() => openPopup(p)}
//               className="btn d-inline-flex align-items-center gap-2 fw-500"
//               style={{
//                 fontSize: '0.82rem',
//                 padding: '0.4rem 0.85rem',
//                 borderRadius: '0.375rem',
//                 transition: 'all 0.15s ease',
//                 flex: '1 1 auto',
//                 maxWidth: '132px',
//                 justifyContent: 'center',
//                 ...m.style,
//               }}
//               onMouseEnter={(e) => {
//                 if (!isDark) e.currentTarget.style.background = '#f8f9fa';
//               }}
//               onMouseLeave={(e) => {
//                 if (!isDark) e.currentTarget.style.background = '#fff';
//               }}
//             >
//               <i className={`bi ${m.icon}`} style={{ fontSize: '0.95rem' }} />
//               <span>{m.label}</span>
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }




// v2
// src/components/auth/OAuthButtons.tsx

import { useEffect, useState } from 'react';
import { authApi } from '@/services/api';
import { useOAuthPopup } from '@/hooks/useOAuthPopup';

type AuthMode = 'signin' | 'signup';

interface Props {
  mode?: AuthMode;
}

interface ProviderItem {
  provider: string;
  name: string;
  enabled: boolean;
}

interface ProviderMeta {
  icon: string;
  color: string;
  hoverBg: string;
}

const META: Record<string, ProviderMeta> = {
  google: {
    icon: 'bi-google',
    color: '#DB4437',
    hoverBg: 'rgba(219, 68, 55, 0.08)',
  },

  github: {
    icon: 'bi-github',
    color: '#24292f',
    hoverBg: 'rgba(36, 41, 47, 0.08)',
  },

  facebook: {
    icon: 'bi-facebook',
    color: '#1877f2',
    hoverBg: 'rgba(24, 119, 242, 0.08)',
  },

  linkedin: {
    icon: 'bi-linkedin',
    color: '#0a66c2',
    hoverBg: 'rgba(10, 102, 194, 0.08)',
  },
};

export default function OAuthButtons({
  mode = 'signin',
}: Props) {
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { openPopup } = useOAuthPopup();

  useEffect(() => {
    let mounted = true;

    const fetchProviders = async () => {
      try {
        const res = await authApi.getOAuthProviders();
        // console.log('Fetched providers:', res.data);
        if (!mounted) return;

        setProviders(res?.data || []);

      } catch {
        if (mounted) setProviders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProviders();

    return () => {
      mounted = false;
    };
  }, []);

  if (!loading && providers.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      
      {/* Divider */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <hr className="flex-grow-1 opacity-25 m-0" />

        <span
          className="text-muted text-uppercase"
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
          }}
        >
          Or continue with
        </span>

        <hr className="flex-grow-1 opacity-25 m-0" />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="d-flex justify-content-center gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="placeholder-glow"
              style={{
                width: 44,
                height: 44,
              }}
            >
              <span
                className="placeholder rounded-circle col-12"
                style={{
                  width: 44,
                  height: 44,
                  display: 'block',
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap">
          {providers.map((provider) => {
            const meta = META[provider.provider] || {
              icon: 'bi-box-arrow-in-right',
              color: '#6c757d',
              hoverBg: 'rgba(108, 117, 125, 0.08)',
            };

            const isEnabled = provider.enabled;

            const label =
              mode === 'signup'
                ? `Continue with ${provider.name}`
                : `Sign in with ${provider.name}`;

            return (
              <button
                key={provider.provider}
                type="button"
                disabled={!isEnabled}
                aria-label={label}
                title={
                  isEnabled
                    ? label
                    : `${provider.name} authentication is currently unavailable`
                }
                onClick={() => {
                  if (!isEnabled) return;
                  openPopup(provider.provider);
                }}
                className="btn p-0 border-0 bg-transparent shadow-none"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.18s ease',
                  opacity: isEnabled ? 1 : 0.35,
                  cursor: isEnabled ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => {
                  if (!isEnabled) return;

                  e.currentTarget.style.background = meta.hoverBg;
                  e.currentTarget.style.transform =
                    'translateY(-1px) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform =
                    'translateY(0) scale(1)';
                }}
              >
                <i
                  className={`bi ${meta.icon}`}
                  style={{
                    fontSize: '1.35rem',
                    color: meta.color,
                    lineHeight: 1,
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}