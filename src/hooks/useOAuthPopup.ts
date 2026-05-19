// src/hooks/useOAuthPopup.ts
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api';

export interface OAuthPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: any;
}

const API_ORIGIN = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : window.location.origin;

export function useOAuthPopup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const popupRef = useRef<Window | null>(null);
  const pollingRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    popupRef.current = null;
  }, []);

  const closePopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    cleanup();
  }, [cleanup]);

  const openPopup = useCallback(async (provider: string) => {
    // Prevent multiple popups
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const width = Math.min(500, window.innerWidth - 20);
    const height = Math.min(700, window.innerHeight - 40);
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Open blank popup IMMEDIATELY inside user gesture
    const popup = window.open(
      'about:blank',
      `intellect_oauth_${provider}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site, or use email sign-in.');
      return;
    }

    popupRef.current = popup;

    // Poll for popup closure (user closed manually)
    pollingRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        cleanup();
      }
    }, 500);

    try {
      const res = await authApi.getOAuthUrl(provider);
      const authUrl = res.data?.data?.authorization_url;

      if (authUrl) {
        popup.location.href = authUrl;
      } else {
        popup.close();
        cleanup();
        toast.error('Failed to get authorization URL');
      }
    } catch (err: any) {
      popup.close();
      cleanup();
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        'Failed to initialize OAuth';
      toast.error(msg);
    }
  }, [cleanup]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Strict origin check
      if (event.origin !== API_ORIGIN) return;

      if (event.data?.type === 'INTELLECT_OAUTH_SUCCESS') {
        const payload: OAuthPayload = event.data.payload;
        closePopup();
        login(payload);

        const user = payload.user;
        const dest =
          user.primary_role === 'admin' || user.primary_role === 'super_admin' ? '/admin'
          : user.primary_role === 'tutor' ? '/tutor'
          : user.primary_role === 'creator' ? '/creator'
          : user.primary_role === 'partner' ? '/partner'
          : '/dashboard';

        navigate(dest, { replace: true });
        toast.success(`Welcome${user.name ? `, ${user.name}` : ' back'}!`);
      }

      if (event.data?.type === 'INTELLECT_OAUTH_ERROR') {
        closePopup();
        toast.error(event.data.payload?.message || 'OAuth sign in failed');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      cleanup();
    };
  }, [login, navigate, closePopup, cleanup]);

  return { openPopup, closePopup };
}



// // v2
// // src/hooks/useOAuthPopup.ts
// import { useEffect, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { useAuth } from '@/context/AuthContext';
// import { authApi } from '@/services/api';

// export interface OAuthPayload {
//   access_token: string;
//   refresh_token: string;
//   token_type: string;
//   user: any;
// }

// export function useOAuthPopup() {
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const popupRef = useRef<Window | null>(null);
//   const pollingRef = useRef<number | null>(null);

//   const cleanup = useCallback(() => {
//     if (pollingRef.current) {
//       window.clearInterval(pollingRef.current);
//       pollingRef.current = null;
//     }
//     popupRef.current = null;
//   }, []);

//   const closePopup = useCallback(() => {
//     if (popupRef.current && !popupRef.current.closed) {
//       popupRef.current.close();
//     }
//     cleanup();
//   }, [cleanup]);

//   const openPopup = useCallback(async (provider: string) => {
//     if (popupRef.current && !popupRef.current.closed) {
//       popupRef.current.focus();
//       return;
//     }

//     // Responsive sizing: generous padding on desktop, edge-to-edge on small screens
//     const screenW = window.screen.availWidth;
//     const screenH = window.screen.availHeight;
//     const isMobile = screenW < 768;

//     // const width = isMobile ? screenW : Math.min(520, Math.round(screenW * 0.45));
//     // const height = isMobile ? screenH : Math.min(720, Math.round(screenH * 0.85));

//     const width = isMobile ? screenW : Math.min(480, Math.round(screenW * 0.38));
//     const height = isMobile ? screenH : Math.min(640, Math.round(screenH * 0.75));

//     const left = isMobile ? 0 : Math.round((screenW - width) / 2);
//     const top = isMobile ? 0 : Math.round((screenH - height) / 2);

//     const features = [
//       `width=${width}`,
//       `height=${height}`,
//       `left=${left}`,
//       `top=${top}`,
//       'resizable=yes',
//       'scrollbars=yes',
//       'status=no',
//       'toolbar=no',
//       'menubar=no',
//       'location=no',
//       'directories=no',
//     ].join(',');

//     const popup = window.open(
//       'about:blank',
//       `intellect_oauth_${provider}_${Date.now()}`,
//       features
//     );

//     if (!popup) {
//       toast.error('Popup blocked. Please allow popups for this site.');
//       return;
//     }

//     popupRef.current = popup;

//     // Poll for manual close
//     pollingRef.current = window.setInterval(() => {
//       if (popupRef.current?.closed) cleanup();
//     }, 500);

//     try {
//       const res = await authApi.getOAuthUrl(provider);
//       const authUrl = res.data?.data?.authorization_url;

//       if (authUrl) {
//         popup.location.href = authUrl;
//       } else {
//         popup.close();
//         cleanup();
//         toast.error('Failed to get authorization URL');
//       }
//     } catch (err: any) {
//       popup.close();
//       cleanup();
//       const msg =
//         err?.response?.data?.message ||
//         err?.response?.data?.detail ||
//         'Failed to initialize OAuth';
//       toast.error(msg);
//     }
//   }, [cleanup]);

//   useEffect(() => {
//     const handleMessage = (event: MessageEvent) => {
//       if (event.origin !== window.location.origin) return;

//       if (event.data?.type === 'INTELLECT_OAUTH_SUCCESS') {
//         const payload: OAuthPayload = event.data.payload;
//         closePopup();
//         login(payload);

//         const user = payload.user;
//         const dest =
//           user.primary_role === 'admin' || user.primary_role === 'super_admin' ? '/admin'
//           : user.primary_role === 'tutor' ? '/tutor'
//           : user.primary_role === 'creator' ? '/creator'
//           : user.primary_role === 'partner' ? '/partner'
//           : '/dashboard';

//         navigate(dest, { replace: true });
//         toast.success(`Welcome${user.name ? `, ${user.name}` : ' back'}!`);
//       }

//       if (event.data?.type === 'INTELLECT_OAUTH_ERROR') {
//         closePopup();
//         toast.error(event.data.payload?.message || 'OAuth sign in failed');
//       }
//     };

//     window.addEventListener('message', handleMessage);
//     return () => {
//       window.removeEventListener('message', handleMessage);
//       cleanup();
//     };
//   }, [login, navigate, closePopup, cleanup]);

//   return { openPopup, closePopup };
// }



// // v3
// // src/hooks/useOAuthPopup.ts
// import { useEffect, useRef, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { useAuth } from '@/context/AuthContext';
// import { authApi } from '@/services/api';

// export interface OAuthPayload {
//   access_token: string;
//   refresh_token: string;
//   token_type: string;
//   user: any;
// }

// export function useOAuthPopup() {
//   const { login } = useAuth();
//   const navigate = useNavigate();
//   const popupRef = useRef<Window | null>(null);
//   const pollingRef = useRef<number | null>(null);

//   const cleanup = useCallback(() => {
//     if (pollingRef.current) {
//       window.clearInterval(pollingRef.current);
//       pollingRef.current = null;
//     }
//     popupRef.current = null;
//   }, []);

//   const closePopup = useCallback(() => {
//     if (popupRef.current && !popupRef.current.closed) {
//       popupRef.current.close();
//     }
//     cleanup();
//   }, [cleanup]);

//   const openPopup = useCallback(async (provider: string) => {
//     if (popupRef.current && !popupRef.current.closed) {
//       popupRef.current.focus();
//       return;
//     }

//     // ── Responsive popup sizing ───────────────────────────────────────
//     const screenW = window.screen.availWidth;
//     const screenH = window.screen.availHeight;
//     const vw = window.innerWidth;

//     // Mobile/narrow: nearly full screen so it feels like a native flow
//     // Desktop: compact centered dialog, phone-sized for clean provider UI
//     const isNarrow = vw < 640;
//     const width  = isNarrow ? screenW - 16 : Math.min(480, Math.round(screenW * 0.4));
//     const height = isNarrow ? screenH - 40 : Math.min(640, Math.round(screenH * 0.78));
//     const left   = isNarrow ? 8 : Math.round((screenW - width) / 2);
//     const top    = isNarrow ? 20 : Math.round((screenH - height) / 2);

//     const features = [
//       `width=${width}`,
//       `height=${height}`,
//       `left=${left}`,
//       `top=${top}`,
//       'resizable=yes',
//       'scrollbars=yes',
//       'status=no',
//       'toolbar=no',
//       'menubar=no',
//       'location=no',
//       'directories=no',
//       'titlebar=yes',
//     ].join(',');

//     const popup = window.open(
//       'about:blank',
//       `intellect_oauth_${provider}_${Date.now()}`,
//       features
//     );

//     if (!popup) {
//       toast.error('Popup blocked. Please allow popups for this site.');
//       return;
//     }

//     popupRef.current = popup;

//     // Poll for manual close
//     pollingRef.current = window.setInterval(() => {
//       if (popupRef.current?.closed) cleanup();
//     }, 500);

//     try {
//       const res = await authApi.getOAuthUrl(provider);
//       const authUrl = res.data?.data?.authorization_url;

//       if (authUrl) {
//         popup.location.href = authUrl;
//       } else {
//         popup.close();
//         cleanup();
//         toast.error('Failed to get authorization URL');
//       }
//     } catch (err: any) {
//       popup.close();
//       cleanup();
//       const msg =
//         err?.response?.data?.message ||
//         err?.response?.data?.detail ||
//         'Failed to initialize OAuth';
//       toast.error(msg);
//     }
//   }, [cleanup]);

//   useEffect(() => {
//     const handleMessage = (event: MessageEvent) => {
//       if (event.origin !== window.location.origin) return;

//       if (event.data?.type === 'INTELLECT_OAUTH_SUCCESS') {
//         const payload: OAuthPayload = event.data.payload;
//         closePopup();
//         login(payload);

//         const user = payload.user;
//         const dest =
//           user.primary_role === 'admin' || user.primary_role === 'super_admin' ? '/admin'
//           : user.primary_role === 'tutor' ? '/tutor'
//           : user.primary_role === 'creator' ? '/creator'
//           : user.primary_role === 'partner' ? '/partner'
//           : '/dashboard';

//         navigate(dest, { replace: true });
//         toast.success(`Welcome${user.name ? `, ${user.name}` : ' back'}!`);
//       }

//       if (event.data?.type === 'INTELLECT_OAUTH_ERROR') {
//         closePopup();
//         toast.error(event.data.payload?.message || 'OAuth sign in failed');
//       }
//     };

//     window.addEventListener('message', handleMessage);
//     return () => {
//       window.removeEventListener('message', handleMessage);
//       cleanup();
//     };
//   }, [login, navigate, closePopup, cleanup]);

//   return { openPopup, closePopup };
// }
