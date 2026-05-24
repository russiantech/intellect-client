// src/components/shared/ImpersonationBanner.tsx
/**
 * ImpersonationBanner — Persistent banner when admin is impersonating
 * Shows target user info + revert button
 * Fixed to top of viewport, high z-index
 */
import { useImpersonation } from '@/hooks/useImpersonation';
// import './ImpersonationBanner.css';
import '@/styles/components/shared/ImpersonationBanner.css';

export default function ImpersonationBanner() {
  const { isImpersonating, targetUser, originalUser, revert } = useImpersonation();

  if (!isImpersonating || !targetUser || !originalUser) return null;

  return (
    <div className="impersonation-banner" role="alert" aria-live="polite">
      <div className="impersonation-banner-content">
        <div className="impersonation-banner-icon">
          <i className="bi bi-incognito" />
        </div>
        <div className="impersonation-banner-text">
          <span className="impersonation-banner-label">
            Impersonating
          </span>
          <span className="impersonation-banner-target">
            {targetUser.name} <span className="text-muted">({targetUser.email})</span>
          </span>
          <span className="impersonation-banner-role">
            Role: {targetUser.primary_role}
          </span>
        </div>
        <button
          className="btn btn-sm btn-light impersonation-banner-revert"
          onClick={revert}
          title="Revert to your admin account"
        >
          <i className="bi bi-arrow-counterclockwise" />
          <span>Back to {originalUser.name}</span>
        </button>
      </div>
    </div>
  );
}

