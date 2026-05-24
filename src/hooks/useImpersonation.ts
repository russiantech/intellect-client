// src/hooks/useImpersonation.ts
/**
 * useImpersonation — Admin user impersonation hook
 * 
 * Security:
 * - Only available to users with the 'super_admin' role
 * - Stores original token in localStorage for recovery
 * - Shows persistent banner when impersonating
 * - One-click revert to admin account
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'impersonation_original_token';
const STORAGE_USER = 'impersonation_original_user';
const ACCESS_TOKEN_KEY = 'access_token';

interface ImpersonationState {
  isImpersonating: boolean;
  targetUser: {
    id: number;
    name: string;
    email: string;
    username: string;
    roles: string[];
    primary_role: string;
  } | null;
  originalUser: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export function useImpersonation() {
  const auth = useAuth();
  const { user } = auth;
  const navigate = useNavigate();

  // Defensive: AuthContext may or may not expose setToken
  const authSetToken = (auth as any).setToken;

  const [state, setState] = useState<ImpersonationState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedUser = localStorage.getItem(STORAGE_USER);
    if (stored && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return {
          isImpersonating: true,
          targetUser: null,
          originalUser: parsed,
        };
      } catch { /* ignore */ }
    }
    return {
      isImpersonating: false,
      targetUser: null,
      originalUser: null,
    };
  });

  useEffect(() => {
    if (user && localStorage.getItem(STORAGE_KEY)) {
      setState(prev => ({
        ...prev,
        isImpersonating: true,
        targetUser: {
          id: user.id,
          name: user.name ?? '',
          email: user.email,
          username: user.username,
          roles: user.roles,
          primary_role: user.primary_role,
        },
      }));
    }
  }, [user]);

  /** Role-based gate: super_admin only */
  const canImpersonate = useCallback((): boolean => {
    return user?.roles?.includes('super_admin') ?? false;
  }, [user]);

  const impersonate = useCallback(async (targetUserId: number) => {
    if (!canImpersonate()) {
      toast.error('You do not have permission to impersonate users');
      return false;
    }

    const originalToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!originalToken) {
      toast.error('No active session token found');
      return false;
    }

    try {
      const originalUser = {
        id: user!.id,
        name: user!.name ?? '',
        email: user!.email,
      };

      const res = await api.post(`/auth/impersonate/${targetUserId}`);
      const { token: impersonationToken, target_user } = res.data;

      localStorage.setItem(STORAGE_KEY, originalToken);
      localStorage.setItem(STORAGE_USER, JSON.stringify(originalUser));
      localStorage.setItem(ACCESS_TOKEN_KEY, impersonationToken);

      if (typeof authSetToken === 'function') {
        authSetToken(impersonationToken);
      }

      setState({
        isImpersonating: true,
        targetUser: target_user,
        originalUser,
      });

      toast.success(`Now viewing as ${target_user.name} (${target_user.email})`);

      const role = target_user.primary_role;
      const dest = role === 'super_admin' || role === 'admin' ? '/admin'
        : role === 'tutor' ? '/tutor'
        : role === 'creator' ? '/creator'
        : role === 'partner' ? '/partner'
        : '/dashboard';

      navigate(dest);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Impersonation failed';
      toast.error(msg);
      return false;
    }
  }, [canImpersonate, user, authSetToken, navigate]);

  const revert = useCallback(() => {
    const originalToken = localStorage.getItem(STORAGE_KEY);
    const originalUserStr = localStorage.getItem(STORAGE_USER);

    if (!originalToken) {
      toast.error('No original session found');
      return;
    }

    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, originalToken);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_USER);

      if (typeof authSetToken === 'function') {
        authSetToken(originalToken);
      }

      setState({
        isImpersonating: false,
        targetUser: null,
        originalUser: null,
      });

      const originalUser = originalUserStr ? JSON.parse(originalUserStr) : null;
      toast.success(`Reverted to admin: ${originalUser?.name || 'Admin'}`);
      navigate('/admin');
    } catch {
      toast.error('Failed to revert. Please log in again.');
    }
  }, [authSetToken, navigate]);

  return {
    ...state,
    canImpersonate,
    impersonate,
    revert,
  };
}