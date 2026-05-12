/**
 * resolveImage
 * ─────────────────────────────────────────────────────────────────────────────
 * Safely converts every possible image value from the API into a usable URL.
 *
 * Shapes handled:
 *   1. null / undefined / "default.svg"  → returns fallback (or null)
 *   2. Already an absolute URL           → returned as-is   (no double-prefix)
 *   3. Root-relative path (/uploads/…)   → API_BASE + path
 *   4. Bare filename ("abc.webp")        → API_BASE/uploads/<folder>/abc.webp
 *
 * @param image    Raw value from API (may be full URL, path, filename, or falsy)
 * @param fallback Value to return when image is absent/invalid
 * @param folder   Upload sub-folder used only for bare filenames, e.g. "avatars"
 *                 or "courses/thumbnails". Defaults to empty string.
 */

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api/v1', '') ??
  '';

export function resolveImage(
  image?: string | null,
  fallback?: string | null,
  folder = '',
): string | null {
  // ── 1. Missing / placeholder ──────────────────────────────────────────────
  if (!image || image === 'default.svg') return fallback ?? null;

  // ── 2. Already absolute (http / https) ───────────────────────────────────
  if (/^https?:\/\//i.test(image)) return image;

  // ── 3. Root-relative path ─────────────────────────────────────────────────
  if (image.startsWith('/uploads')) return `${API_BASE}${image}`;

  // ── 4. Bare filename ──────────────────────────────────────────────────────
  const prefix = folder ? `/uploads/${folder}/` : '/uploads/';
  return `${API_BASE}${prefix}${image}`;
  
}

export { API_BASE };
