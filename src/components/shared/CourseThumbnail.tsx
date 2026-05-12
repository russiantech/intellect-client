// // src/components/shared/CourseThumbnail.tsx
// import { useState } from 'react';

// interface CourseThumbnailProps {
//   thumbnail?: string | null;
//   size?: number;
//   aspectRatio?: number;  // height / width, default 0.75 (52/72, 36/48)
//   borderRadius?: number;
//   className?: string;
// }

// export function CourseThumbnail({ 
//   thumbnail, 
//   size = 72, 
//   aspectRatio = 0.75,
//   borderRadius = 8,
//   className = ''
// }: CourseThumbnailProps) {
//   const [error, setError] = useState(false);

//   const width = size;
//   const height = size * aspectRatio;

//   if (!thumbnail || error) {
//     return (
//       <div 
//         className={className}
//         style={{ 
//           width, 
//           height, 
//           borderRadius, 
//           background: 'var(--primary-light)', 
//           display: 'flex', 
//           alignItems: 'center', 
//           justifyContent: 'center', 
//           flexShrink: 0,
//           overflow: 'hidden'
//         }}
//       >
//         <i className="bi bi-play-circle text-primary" style={{ fontSize: `${width * 0.3}px` }} />
//       </div>
//     );
//   }

//   return (
//     <img 
//       src={`/uploads/courses/thumbnails/${thumbnail}`} 
//       alt="" 
//       onError={() => setError(true)}
//       className={className}
//       style={{ 
//         width, 
//         height, 
//         borderRadius, 
//         objectFit: 'cover', 
//         flexShrink: 0,
//         display: 'block'
//       }} 
//     />
//   );
// }



// v2
/**
 * CourseThumbnail.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact thumbnail used in tables, lists, and modals.
 * Uses resolveImage so it handles every URL shape from the API correctly:
 *   • Full absolute URL  → used as-is          (no double-prefix)
 *   • Root-relative path → API_BASE prepended
 *   • Bare filename      → API_BASE/uploads/courses/thumbnails/<file>
 *   • null / undefined   → placeholder shown immediately
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { resolveImage } from '@/utils/resolveImage';  // adjust path as needed

// ── Shimmer keyframe (injected once, no extra CSS file) ───────────────────────
if (typeof document !== 'undefined' && !document.getElementById('__thumb-shimmer-kf')) {
  const s = document.createElement('style');
  s.id = '__thumb-shimmer-kf';
  s.textContent = `
    @keyframes thumbShimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(s);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface CourseThumbnailProps {
  /** Raw thumbnail value from API — full URL, path, filename, or nullish */
  thumbnail?: string | null;
  /** Width in px. Height is derived via aspectRatio. Default: 72 */
  size?: number;
  /** height ÷ width ratio. Default: 0.75 (4:3) */
  aspectRatio?: number;
  borderRadius?: number;
  className?: string;
}

// ── Shared container style helper ─────────────────────────────────────────────
function containerStyle(
  width: number,
  height: number,
  borderRadius: number,
): React.CSSProperties {
  return {
    width,
    height,
    borderRadius,
    flexShrink: 0,
    overflow: 'hidden',
    display: 'block',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CourseThumbnail({
  thumbnail,
  size = 72,
  aspectRatio = 0.75,
  borderRadius = 8,
  className = '',
}: CourseThumbnailProps) {
  const width  = size;
  const height = Math.round(size * aspectRatio);

  // ── Resolve URL (handles all shapes; never double-prefixes) ──────────────
  const resolvedSrc = useMemo(
    () => resolveImage(thumbnail, null, 'courses/thumbnails'),
    [thumbnail],
  );

  const [imgSrc, setImgSrc]   = useState<string | null>(resolvedSrc);
  const [loaded, setLoaded]   = useState(false);
  const failedRef             = useRef(false);

  const handleError = useCallback(() => {
    if (!failedRef.current) {
      failedRef.current = true;
      setImgSrc(null);     // fall through to placeholder
    }
  }, []);

  const handleLoad = useCallback(() => setLoaded(true), []);

  // ── Placeholder (no thumbnail, or image failed to load) ──────────────────
  if (!imgSrc) {
    return (
      <div
        className={className}
        style={{
          ...containerStyle(width, height, borderRadius),
          background: 'var(--primary-light, #ede9fe)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i
          className="bi bi-play-circle text-primary"
          style={{ fontSize: `${Math.round(width * 0.3)}px` }}
        />
      </div>
    );
  }

  // ── Image (with wave shimmer until loaded) ────────────────────────────────
  return (
    <div
      className={className}
      style={{ ...containerStyle(width, height, borderRadius), position: 'relative' }}
    >
      {/* Wave shimmer overlay — hidden once image fires onLoad */}
      {!loaded && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, var(--skeleton-base, #e9ecef) 25%, var(--skeleton-shine, #f8f9fa) 50%, var(--skeleton-base, #e9ecef) 75%)',
            backgroundSize: '200% 100%',
            animation: 'thumbShimmer 1.4s ease-in-out infinite',
          }}
        />
      )}

      <img
        src={imgSrc}
        alt=""
        onError={handleError}
        onLoad={handleLoad}
        style={{
          width,
          height,
          objectFit: 'cover',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
    </div>
  );
}

export default CourseThumbnail;