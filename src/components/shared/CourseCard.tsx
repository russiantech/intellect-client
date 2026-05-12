/**
 * CourseCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone course card with:
 *  • resolveImage for safe thumbnail + creator avatar URLs
 *  • Wave shimmer skeleton for thumbnails while loading
 *  • useMemo / useCallback throughout for render stability
 *  • Zero changes to external API / CSS class names
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { resolveImage } from '@/utils/resolveImage';   // adjust path as needed
import type { Course } from '@/types';                  // adjust path as needed

// ── Shimmer keyframe (injected once) ─────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('__coursecard-shimmer-kf')) {
  const s = document.createElement('style');
  s.id = '__coursecard-shimmer-kf';
  s.textContent = `
    @keyframes courseCardShimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .course-card-img-shimmer {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        var(--skeleton-base,  #e9ecef) 25%,
        var(--skeleton-shine, #f8f9fa) 50%,
        var(--skeleton-base,  #e9ecef) 75%
      );
      background-size: 200% 100%;
      animation: courseCardShimmer 1.4s ease-in-out infinite;
    }
  `;
  document.head.appendChild(s);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface CourseCardProps {
  course: Course;
  /** Optional enroll callback. Receives the course id. */
  onEnroll?: (id: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const CourseCard: React.FC<CourseCardProps> = ({ course, onEnroll: _onEnroll }) => {
  // ── Derived URLs ──────────────────────────────────────────────────────────
  const thumbnailSrc = useMemo(
    // () => resolveImage(course.thumbnail, null, 'courses/thumbnails'),
    () => resolveImage(course.thumbnail, null,),
    [course.thumbnail],
  );

  const creatorFallback = useMemo(
    () =>
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        course.creator?.name || 'I',
      )}&size=48&background=4A90D9&color=fff&bold=true`,
    [course.creator?.name],
  );

  const initialAvatarSrc = useMemo(
    () => resolveImage(course.creator?.image, creatorFallback, 'avatars') ?? creatorFallback,
    [course.creator?.image, creatorFallback],
  );

  // ── Image state ───────────────────────────────────────────────────────────
  const [thumbSrc, setThumbSrc]       = useState<string | null>(thumbnailSrc);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [avatarSrc, setAvatarSrc]     = useState<string>(initialAvatarSrc);

  const thumbFailedRef  = useRef(false);
  const avatarFailedRef = useRef(false);

  const handleThumbError = useCallback(() => {
    if (!thumbFailedRef.current) {
      thumbFailedRef.current = true;
      setThumbSrc(null);           // fall through to placeholder
    }
  }, []);

  const handleThumbLoad  = useCallback(() => setThumbLoaded(true), []);

  const handleAvatarError = useCallback(() => {
    if (!avatarFailedRef.current) {
      avatarFailedRef.current = true;
      setAvatarSrc(creatorFallback);
    }
  }, [creatorFallback]);

  // ── Course link ───────────────────────────────────────────────────────────
  const courseLink = useMemo(
    () => `/courses/${course.slug || course.id}`,
    [course.slug, course.id],
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="course-card">

      {/* ── Thumbnail ──────────────────────────────────────────────────── */}
      <Link to={courseLink} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Wave shimmer — shown until thumb loads or on error */}
          {thumbSrc && !thumbLoaded && (
            <div className="course-card-img-shimmer" aria-hidden="true" />
          )}

          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt={course.title}
              className="course-card-img"
              onError={handleThumbError}
              onLoad={handleThumbLoad}
              style={{
                opacity: thumbLoaded ? 1 : 0,
                transition: 'opacity 0.25s ease',
              }}
            />
          ) : (
            /* Static placeholder when no thumbnail is available */
            <div className="course-card-img-placeholder">
              <i className="bi bi-play-circle" />
            </div>
          )}
        </div>
      </Link>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="course-card-body">

        {/* Level + Featured badges */}
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className={`badge-level ${course.level}`}>
            {course.level}
          </span>
          {course.featured && (
            <span className="badge bg-warning text-dark" style={{ fontSize: '0.6rem' }}>
              Featured
            </span>
          )}
        </div>

        {/* Title */}
        <Link to={courseLink} className="text-decoration-none">
          <h6 className="course-card-title truncate-2">{course.title}</h6>
        </Link>

        {/* Short description */}
        {course.short_description && (
          <p
            className="text-muted truncate-2"
            style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}
          >
            {course.short_description}
          </p>
        )}

        {/* Creator */}
        {course.creator && (
          <div className="d-flex align-items-center gap-2 mb-2">
            <img
              src={avatarSrc}
              alt={course.creator.name}
              onError={handleAvatarError}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {course.creator.name}
            </span>
          </div>
        )}

        {/* Meta row */}
        <div className="course-card-meta">
          <span>
            <i className="bi bi-book me-1" />
            {course.lessons_count}
          </span>
          <span>
            <i className="bi bi-people me-1" />
            {course.enrolled_count}
          </span>
          {course.avg_rating != null && (
            <span>
              <i className="bi bi-star-fill me-1 text-warning" />
              {course.avg_rating}
            </span>
          )}
        </div>

        {/* Enrollment progress */}
        {course.is_enrolled && (
          <div className="mt-auto">
            <div
              className="d-flex justify-content-between mb-1"
              style={{ fontSize: '0.75rem' }}
            >
              <span className="text-muted">Progress</span>
              <span className="text-primary fw-600">{course.progress_pct}%</span>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                style={{ width: `${course.progress_pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="course-card-footer">
        <div>
          {course.fee > 0 ? (
            <span className="fw-700 text-primary">₦{course.fee.toLocaleString()}</span>
          ) : (
            <span className="badge bg-success text-white" style={{ fontSize: '0.75rem' }}>
              Free
            </span>
          )}
        </div>

        {course.is_enrolled ? (
          <Link
            to={`/learn/${course.slug}`}
            className="btn btn-sm btn-primary btn-icon-start"
            style={{ borderRadius: 999 }}
          >
            <i className="bi bi-play-fill" /> Continue
          </Link>
        ) : (
          <Link
            to={courseLink}
            className="btn btn-sm btn-outline-primary"
            style={{ borderRadius: 999 }}
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
};

export default CourseCard;
