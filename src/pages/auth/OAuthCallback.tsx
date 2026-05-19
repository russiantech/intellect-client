import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api';

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    const error = params.get('error');

    if (error) {
      toast.error(decodeURIComponent(error));
      navigate('/auth/signin', { replace: true });
      return;
    }

    if (!access || !refresh) {
      toast.error('Authentication failed. Missing tokens.');
      navigate('/auth/signin', { replace: true });
      return;
    }

    // Temporarily prime the token so getMe can use it
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);

    authApi
      .getMe()
      .then((res) => {
        login({
          access_token: access,
          refresh_token: refresh,
        //   token_type: 'bearer',
          user: res.data,
        });
        toast.success('Signed in successfully!');
        const user = res.data;
        const dest =
          user.primary_role === 'admin' || user.primary_role === 'super_admin' ? '/admin'
          : user.primary_role === 'tutor' ? '/tutor'
          : user.primary_role === 'creator' ? '/creator'
          : user.primary_role === 'partner' ? '/partner'
          : '/dashboard';
        navigate(dest, { replace: true });
      })
      .catch((err: any) => {
        const detail =
          err.response?.data?.message || err.response?.data?.detail || 'Failed to complete sign in';
        toast.error(detail);
        navigate('/auth/signin', { replace: true });
      });
  }, [params, navigate, login]);

  return (
    <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
      <div className="spinner-border text-primary mb-3" role="status" />
      <p className="text-muted" style={{ fontSize: '0.875rem' }}>Completing sign in…</p>
    </div>
  );
}