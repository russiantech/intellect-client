/**
 * Avatar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone avatar component with:
 *  • resolveImage for safe URL handling
 *  • useMemo fallback URL (stable across renders)
 *  • Shimmer wave skeleton while image loads
 *  • Graceful error fallback to ui-avatars.com
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { resolveImage } from '@/utils/resolveImage';   // adjust path as needed

// ── Types ─────────────────────────────────────────────────────────────────────
interface AvatarProps {
  /** Raw image value from API — may be full URL, path, filename, or undefined */
  image?: string | null;
  /** Display name — used for ui-avatars fallback initials */
  name?: string;
  /** Pixel size (renders as a square). Default: 40 */
  size?: number;
  /** Optional click handler */
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  /** Extra CSS class applied to the <img> */
  className?: string;
  /** Upload sub-folder, e.g. "avatars". Default: "avatars" */
  folder?: string;
}

// ── Wave skeleton styles (injected once, no extra CSS file needed) ─────────────
const SKELETON_STYLE: React.CSSProperties = {
  display: 'inline-block',
  borderRadius: '50%',
  background:
    'linear-gradient(90deg, var(--skeleton-base, #e9ecef) 25%, var(--skeleton-shine, #f8f9fa) 50%, var(--skeleton-base, #e9ecef) 75%)',
  backgroundSize: '200% 100%',
  animation: 'avatarShimmer 1.4s ease-in-out infinite',
  flexShrink: 0,
};

// Inject the keyframe once into the document head.
if (typeof document !== 'undefined' && !document.getElementById('__avatar-shimmer-kf')) {
  const style = document.createElement('style');
  style.id = '__avatar-shimmer-kf';
  style.textContent = `
    @keyframes avatarShimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

// ── Component ─────────────────────────────────────────────────────────────────
export const Avatar: React.FC<AvatarProps> = ({
  image,
  name,
  size = 40,
  onClick,
  className = '',
  folder = 'avatars',
}) => {
  // ── Fallback URL (stable — only recalculates when name/size change) ─────
  const fallback = useMemo(
    () =>
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&size=${size * 2}&background=4A90D9&color=fff&bold=true`,
    [name, size],
  );

  // ── Resolved initial src ─────────────────────────────────────────────────
  const initialSrc = useMemo(
    () => resolveImage(image, fallback, folder) ?? fallback,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [image, folder], // fallback intentionally omitted — stable memo above covers it
  );

  const [src, setSrc] = useState<string>(initialSrc);
  const [loaded, setLoaded] = useState(false);
  const failedRef = useRef(false);  // prevent infinite error loops

  // Re-sync if the image prop changes (e.g. user updates profile picture)
  const prevImageRef = useRef(image);
  if (prevImageRef.current !== image) {
    prevImageRef.current = image;
    failedRef.current = false;
    setSrc(resolveImage(image, fallback, folder) ?? fallback);
    setLoaded(false);
  }

  const handleError = useCallback(() => {
    if (!failedRef.current) {
      failedRef.current = true;
      setSrc(fallback);
    }
  }, [fallback]);

  const handleLoad = useCallback(() => setLoaded(true), []);

  // ── Shared layout styles ─────────────────────────────────────────────────
  const sharedStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : undefined,
  };

  return (
    <span style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      {/* Wave skeleton — visible until image loads */}
      {!loaded && (
        <span
          aria-hidden="true"
          style={{ ...SKELETON_STYLE, width: size, height: size, position: 'absolute', inset: 0 }}
        />
      )}

      <img
        src={src}
        alt={name || 'User avatar'}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        onClick={onClick}
        style={{
          ...sharedStyle,
          objectFit: 'cover',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
    </span>
  );
};

export default Avatar;
