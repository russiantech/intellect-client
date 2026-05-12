/// <reference types="vite/client" />
/**
 * ui.tsx — Shared UI primitives for Intellect LMS
 *
 * CourseCard  → src/components/CourseCard.tsx
 * Avatar      → src/components/Avatar.tsx
 * resolveImage → src/utils/resolveImage.ts
 *
 * Both are re-exported here so existing import paths that reference
 * ui.tsx keep working without changes across the rest of the codebase.
 */

import { Certificate } from '@/types';
import { Link } from 'react-router-dom';
// import { useState, useMemo } from 'react';

// ── Re-exports for backward compatibility ────────────────────────────────────
export { resolveImage }    from '@/utils/resolveImage';
export { CourseCard }      from '@/components/shared/CourseCard';
export { Avatar }          from '@/components/shared/Avatar';


// ── PAGE TITLE ───────────────────────────────────────────────────────────────
export function PageTitle({ title, subtitle, crumbs }: {
  title: string;
  subtitle?: string;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="page-title-container">
      <div className="row align-items-center">
        <div className="col">
          <h1 className="mb-1">{title}</h1>
          {subtitle && (
            <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>{subtitle}</p>
          )}
          {crumbs && (
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb pt-1 mb-0">
                {crumbs.map((c, i) => {
                  const isLast = i === crumbs.length - 1;
                  return (
                    <li
                      key={i}
                      className={`breadcrumb-item${isLast ? ' active' : ''}`}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {!isLast && c.href
                        ? <Link to={c.href}>{c.label}</Link>
                        : c.label}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}


// ── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 20 : size === 'lg' ? 48 : 32;
  return (
    <div className="d-flex justify-content-center align-items-center py-4">
      <div
        className="spinner-border text-primary"
        style={{ width: s, height: s }}
        role="status"
      >
        <span className="visually-hidden">Loading…</span>
      </div>
    </div>
  );
}


// ── EMPTY STATE ──────────────────────────────────────────────────────────────
export function Empty({ icon = 'bi-inbox', title = 'Nothing here yet', subtitle = '', action }: {
  icon?: string;
  title?: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void; href?: string };
}) {
  return (
    <div className="text-center py-5">
      <i className={`bi ${icon} text-muted`} style={{ fontSize: '3rem' }} />
      <h6 className="mt-3 mb-1">{title}</h6>
      {subtitle && (
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>{subtitle}</p>
      )}
      {action && (
        action.href
          ? <Link to={action.href} className="btn btn-primary btn-sm mt-2">{action.label}</Link>
          : <button className="btn btn-primary btn-sm mt-2" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}


// ── STAT CARD ────────────────────────────────────────────────────────────────
export function StatCard({
  icon, label, value, color = 'blue', suffix = '', trend,
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'teal';
  suffix?: string;
  trend?: number;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <i className={`bi ${icon}`} />
      </div>
      <div>
        <div className="stat-value">
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
        <div className="stat-label">{label}</div>
        {trend !== undefined && (
          <div
            className="d-flex align-items-center gap-1 mt-1"
            style={{ fontSize: '0.75rem', color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}
          >
            <i className={`bi bi-arrow-${trend >= 0 ? 'up' : 'down'}-short`} />
            {Math.abs(trend)}% this month
          </div>
        )}
      </div>
    </div>
  );
}


// ── MODAL ────────────────────────────────────────────────────────────────────
export function Modal({
  show, onClose, title, children, size = 'md', footer,
}: {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
        <div className={`modal-dialog modal-${size} modal-dialog-centered modal-dialog-scrollable`}>
          <div
            className="modal-content"
            style={{ borderRadius: 'var(--radius-lg)', border: 'none', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="modal-header border-bottom" style={{ padding: '1.25rem 1.5rem' }}>
              <h5 className="modal-title fw-700">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>{children}</div>
            {footer && (
              <div className="modal-footer border-top" style={{ padding: '1rem 1.5rem' }}>
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


// ── STATUS BADGE ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    published: 'success', active: 'success', approved: 'success',
    completed: 'success', issued: 'success',
    pending: 'warning', draft: 'secondary', unpublished: 'secondary', suspended: 'warning',
    rejected: 'danger', failed: 'danger', terminated: 'danger',
  };
  return (
    <span
      className={`badge bg-${colors[status] || 'secondary'}`}
      style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
    >
      {status}
    </span>
  );
}


// ── CERTIFICATE CARD ─────────────────────────────────────────────────────────
export function CertCard({ cert }: { cert: Certificate }) {
  return (
    <div className="certificate-card">
      <div className="text-primary mb-2" style={{ fontSize: '2.5rem' }}>
        <i className="bi bi-award-fill" />
      </div>
      <h6 className="fw-700 mb-1">{cert.course?.title || 'Course Completion'}</h6>
      <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
        Certificate No: {cert.cert_number}
      </p>
      <p className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>
        Issued: {new Date(cert.issued_at).toLocaleDateString()}
      </p>
      <div className="d-flex gap-2 justify-content-center">
        {cert.cert_url && (
          <a
            href={`/api/v1/certificates/${cert.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-primary btn-icon-start"
          >
            <i className="bi bi-download" /> Download
          </a>
        )}
        <button className="btn btn-sm btn-outline-secondary btn-icon-start">
          <i className="bi bi-share" /> Share
        </button>
      </div>
    </div>
  );
}


// ── SEARCH INPUT ─────────────────────────────────────────────────────────────
export function SearchInput({
  value, onChange, placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="position-relative">
      <i
        className="bi bi-search position-absolute"
        style={{
          left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', zIndex: 2,
        }}
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-control"
        style={{ paddingLeft: '2.25rem', borderRadius: 999 }}
      />
    </div>
  );
}


// ── RATING STARS ─────────────────────────────────────────────────────────────
export function RatingStars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="d-inline-flex gap-1" style={{ color: '#f0ad4e' }}>
      {Array.from({ length: max }).map((_, i) => (
        <i
          key={i}
          className={`bi ${
            i < Math.floor(rating)
              ? 'bi-star-fill'
              : i < rating
              ? 'bi-star-half'
              : 'bi-star'
          }`}
          style={{ fontSize: '0.8rem' }}
        />
      ))}
    </span>
  );
}
