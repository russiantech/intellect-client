/**
 * usePageMeta.ts
 *
 * A single reusable hook that manages all <head> meta tags for SEO,
 * social sharing, and browser UX in a SPA context.
 *
 * Covers:
 *   - <title> + <meta name="title">
 *   - <meta name="description">
 *   - <meta name="keywords">
 *   - <meta name="robots">
 *   - <meta name="author">
 *   - <link rel="canonical">
 *   - Open Graph (og:*) — Facebook, LinkedIn, WhatsApp previews
 *   - Twitter Card (twitter:*) — X/Twitter previews
 *   - JSON-LD structured data (schema.org typed objects)
 *
 * All tags are created on first use and cleaned up on unmount so
 * navigating between pages never leaves stale head content.
 *
 * ─────────────────────────────────────────────────────────────────
 * Usage
 * ─────────────────────────────────────────────────────────────────
 *
 * // Static page
 * usePageMeta({ title: 'About Us' });
 *
 * // Dynamic course page
 * usePageMeta({
 *   title:       course?.title,
 *   description: course?.short_description,
 *   image:       course?.thumbnail,
 *   keywords:    [...(course?.categories?.map(c => c.title) ?? []), 'online course', INTELLECT],
 *   author:      course?.creator?.name,
 *   type:        'course',
 *   schema:      course ? { '@graph': [buildCourseSchema(course), buildBreadcrumbSchema([...])] } : null,
 * });
 *
 * // Instructor profile
 * usePageMeta({
 *   title:  instructor?.name,
 *   schema: instructor ? buildPersonSchema(instructor) : null,
 * });
 *
 * // Auth-gated learning page (noindex)
 * usePageMeta({
 *   title:  activeTopic ? `${activeTopic.title} — ${course?.title}` : course?.title,
 *   robots: 'noindex, nofollow',
 * });
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';

/* ──────────────────────────────────────────────────────────────
   Constants — exported so pages can reference INTELLECT without
   repeating the string literal and risking future drift.
   ────────────────────────────────────────────────────────────── */

export const INTELLECT      = 'Intellect';
export const INTELLECT_URL  = typeof window !== 'undefined' ? window.location.origin : 'https://intellect.com';
export const TWITTER_HANDLE = '@IntellectHQ'; // ← update to real handle

const DEFAULT_IMG = `${INTELLECT_URL}/assets/images/logos/og-default.png`;

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

export interface PageMetaOptions {
  /** Page-specific title. Rendered as "<title> | Intellect". Pass null/undefined while loading. */
  title?: string | null;

  /** Short plain-text description (≤ 160 chars ideal). Used for meta description + OG + Twitter. */
  description?: string | null;

  /** Absolute or relative URL of the representative image (OG / Twitter card). */
  image?: string | null;

  /** Keyword array — joined into a comma-separated meta keywords string. */
  keywords?: string[] | null;

  /** Author name (creator / instructor). */
  author?: string | null;

  /** robots directive. Default: "index, follow". Use "noindex, nofollow" for auth-gated pages. */
  robots?: string;

  /**
   * OG type. Defaults to "website".
   * "course" is not a standard OG type — we map it to "website" + schema.org JSON-LD instead.
   */
  type?: 'website' | 'article' | 'course';

  /**
   * Pre-built JSON-LD object to inject as <script type="application/ld+json">.
   * Use the exported builders below or pass any valid schema.org object.
   */
  schema?: Record<string, unknown> | null;

  /**
   * Canonical URL override. Defaults to window.location.href (pathname only, no search params).
   * Pass an explicit value if the canonical differs (e.g. for paginated or query-param pages).
   */
  canonical?: string | null;
}

/* ──────────────────────────────────────────────────────────────
   Internal DOM helpers
   ────────────────────────────────────────────────────────────── */

function ensureMeta(selector: string, createElement: () => HTMLMetaElement): HTMLMetaElement {
  return (document.head.querySelector(selector) as HTMLMetaElement) ?? (() => {
    const el = createElement();
    document.head.appendChild(el);
    return el;
  })();
}

function setMeta(name: string, content: string): HTMLMetaElement {
  const el = ensureMeta(`meta[name="${name}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute('name', name);
    return m;
  });
  el.setAttribute('content', content);
  return el;
}

function setProperty(property: string, content: string): HTMLMetaElement {
  const el = ensureMeta(`meta[property="${property}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute('property', property);
    return m;
  });
  el.setAttribute('content', content);
  return el;
}

function setCanonical(href: string): HTMLLinkElement {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

function setJsonLd(data: Record<string, unknown>): HTMLScriptElement {
  let el = document.head.querySelector('script[data-rh="ld"]') as HTMLScriptElement;
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('data-rh', 'ld');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
  return el;
}

function removeJsonLd(): void {
  document.head.querySelector('script[data-rh="ld"]')?.remove();
}

function removeCanonical(): void {
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

/** Resolve a possibly-relative image path to an absolute URL for OG/Twitter. */
function resolveOgImage(image?: string | null): string {
  if (!image) return DEFAULT_IMG;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/')) return `${INTELLECT_URL}${image}`;
  return `${INTELLECT_URL}/${image}`;
}

/** Truncate a string to maxLen, trimming cleanly at a word boundary. */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).replace(/\s\S*$/, '') + '…';
}

/** Strip HTML tags from a string for use in plain-text meta fields. */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/* ──────────────────────────────────────────────────────────────
   Public schema builders
   ────────────────────────────────────────────────────────────── */

/**
 * schema.org/Course — for CourseDetail pages.
 * Includes pricing (Offer), ratings, level, language, categories.
 */
export function buildCourseSchema(course: {
  title:              string;
  slug:               string;
  short_description?: string | null;
  description?:       string | null;
  thumbnail?:         string | null;
  creator?:           { name: string } | null;
  avg_rating?:        number | null;
  enrolled_count?:    number | null;
  duration_weeks?:    number | null;
  lang?:              string | null;
  level?:             string | null;
  fee?:               number | null;
  payment_type?:      string | null;
  categories?:        { title: string }[] | null;
}): Record<string, unknown> {
  const url  = `${INTELLECT_URL}/courses/${course.slug}`;
  const desc = stripHtml(course.short_description || course.description || '');

  const schema: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'Course',
    name:         course.title,
    url,
    ...(desc && { description: desc }),
    ...(course.thumbnail && { image: resolveOgImage(course.thumbnail) }),
    provider: {
      '@type': 'Organization',
      name:    INTELLECT,
      sameAs:  INTELLECT_URL,
    },
    ...(course.creator?.name && {
      author: { '@type': 'Person', name: course.creator.name },
    }),
    ...(course.duration_weeks && { timeRequired: `P${course.duration_weeks}W` }),
    ...(course.lang           && { inLanguage: course.lang }),
    ...(course.level          && { educationalLevel: course.level }),
    ...(course.categories?.length && {
      about: course.categories.map(c => ({ '@type': 'Thing', name: c.title })),
    }),
  };

  if (course.avg_rating != null && course.enrolled_count != null && course.enrolled_count > 0) {
    schema['aggregateRating'] = {
      '@type':      'AggregateRating',
      ratingValue:  course.avg_rating.toFixed(1),
      ratingCount:  course.enrolled_count,
      bestRating:   '5',
      worstRating:  '1',
    };
  }

  if (course.payment_type === 'free' || !course.fee) {
    schema['offers'] = {
      '@type':        'Offer',
      price:          '0',
      priceCurrency:  'NGN',
      availability:   'https://schema.org/InStock',
      category:       'free',
    };
  } else if (course.fee) {
    schema['offers'] = {
      '@type':        'Offer',
      price:          String(course.fee),
      priceCurrency:  'NGN',
      availability:   'https://schema.org/InStock',
      url,
    };
  }

  return schema;
}

/**
 * schema.org/ItemList — for LearningPath (PathDetail) pages.
 * Lists contained courses as numbered ListItems.
 */
export function buildPathSchema(path: {
  title:           string;
  slug:            string;
  description?:    string | null;
  thumbnail?:      string | null;
  courses_count?:  number | null;
  courses?:        { title: string; slug: string }[] | null;
}): Record<string, unknown> {
  const url  = `${INTELLECT_URL}/paths/${path.slug}`;
  const desc = stripHtml(path.description || '');

  return {
    '@context':   'https://schema.org',
    '@type':      'ItemList',
    name:         path.title,
    url,
    ...(desc && { description: desc }),
    ...(path.thumbnail && { image: resolveOgImage(path.thumbnail) }),
    ...(path.courses?.length && {
      itemListElement: path.courses.map((c, i) => ({
        '@type':   'ListItem',
        position:  i + 1,
        name:      c.title,
        url:       `${INTELLECT_URL}/courses/${c.slug}`,
      })),
    }),
    numberOfItems: path.courses_count ?? path.courses?.length ?? 0,
  };
}

/**
 * schema.org/Person — for InstructorProfile pages.
 * Includes name, job title, location, social profiles, expertise topics.
 */
export function buildPersonSchema(instructor: {
  name:       string;
  username:   string;
  title?:     string | null;
  image?:     string | null;
  city?:      string | null;
  country?:   string | null;
  about?:     string | null;
  creator_bio?: string | null;
  expertise?: string | null;
  socials?:   Record<string, string> | null;
}): Record<string, unknown> {
  const url  = `${INTELLECT_URL}/instructors/${instructor.username}`;
  const desc = stripHtml(instructor.creator_bio || instructor.about || '');

  // Map known social keys to schema.org sameAs URLs
  const sameAs: string[] = Object.entries(instructor.socials ?? {})
    .filter(([, v]) => v)
    .map(([, v]) => {
      const norm = v.trim();
      return /^https?:\/\//i.test(norm) ? norm : `https://${norm}`;
    });

  const expertise = (instructor.expertise || '')
    .split(/[,;|]+/).map(s => s.trim()).filter(Boolean);

  return {
    '@context':  'https://schema.org',
    '@type':     'Person',
    name:        instructor.name,
    url,
    ...(instructor.title  && { jobTitle: instructor.title }),
    ...(instructor.image  && { image: resolveOgImage(instructor.image) }),
    ...(desc              && { description: desc }),
    ...(sameAs.length     && { sameAs }),
    ...(instructor.city || instructor.country
      ? {
          address: {
            '@type':           'PostalAddress',
            ...(instructor.city    && { addressLocality: instructor.city }),
            ...(instructor.country && { addressCountry:  instructor.country }),
          },
        }
      : {}),
    ...(expertise.length && {
      knowsAbout: expertise,
    }),
    worksFor: {
      '@type': 'Organization',
      name:    INTELLECT,
      url:     INTELLECT_URL,
    },
  };
}

/**
 * schema.org/Organization — for the About page.
 * Describes Intellect as a legal entity with its offerings.
 */
export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context':   'https://schema.org',
    '@type':      'Organization',
    name:         INTELLECT,
    url:          INTELLECT_URL,
    logo:         `${INTELLECT_URL}/assets/images/logos/favicon.ico`,
    description:  'Intellect is a digital learning platform empowering people and powering businesses through online education.',
    foundingLocation: {
      '@type':   'Place',
      name:      'Nigeria',
    },
    offers: {
      '@type':       'AggregateOffer',
      description:   'Online courses, learning paths, live sessions, and instructor-led training.',
      priceCurrency: 'NGN',
    },
  };
}

/**
 * schema.org/BreadcrumbList — used alongside page-specific schemas.
 * @param crumbs  Array of { name, path } where path is a relative URL e.g. "/courses/my-course"
 */
export function buildBreadcrumbSchema(
  crumbs: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    '@context':      'https://schema.org',
    '@type':         'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      c.name,
      item:      `${INTELLECT_URL}${c.path}`,
    })),
  };
}

/* ──────────────────────────────────────────────────────────────
   Core hook
   ────────────────────────────────────────────────────────────── */

export function usePageMeta({
  title,
  description,
  image,
  keywords,
  author,
  robots   = 'index, follow',
  type     = 'website',
  schema,
  canonical,
}: PageMetaOptions = {}): void {

  useEffect(() => {
    const formattedTitle = title ? `${title} | ${INTELLECT}` : INTELLECT;
    const ogType         = type === 'course' ? 'website' : type;
    const desc           = description
      ? truncate(stripHtml(description), 160)
      : `${INTELLECT} — Learn, Grow, Teach. Empowering people and powering businesses.`;
    const imgUrl         = resolveOgImage(image);
    const canonicalUrl   = canonical ?? `${INTELLECT_URL}${window.location.pathname}`;

    /* ── <title> ── */
    document.title = formattedTitle;

    /* ── Standard meta ── */
    setMeta('title',       formattedTitle);
    setMeta('description', desc);
    setMeta('robots',      robots);
    if (author)          setMeta('author',   author);
    if (keywords?.length) setMeta('keywords', keywords.join(', '));

    /* ── Canonical ── */
    setCanonical(canonicalUrl);

    /* ── Open Graph ── */
    setProperty('og:type',        ogType);
    setProperty('og:title',       formattedTitle);
    setProperty('og:description', desc);
    setProperty('og:image',       imgUrl);
    setProperty('og:image:alt',   title ?? INTELLECT);
    setProperty('og:url',         canonicalUrl);
    setProperty('og:site_name',   INTELLECT);
    setProperty('og:locale',      'en_NG');

    /* ── Twitter Card ── */
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:site',        TWITTER_HANDLE);
    setMeta('twitter:title',       formattedTitle);
    setMeta('twitter:description', desc);
    setMeta('twitter:image',       imgUrl);
    setMeta('twitter:image:alt',   title ?? INTELLECT);

    /* ── JSON-LD ── */
    if (schema) setJsonLd(schema); else removeJsonLd();

    /* ── Cleanup on unmount ── */
    return () => {
      document.title = INTELLECT;
      setMeta('title',             INTELLECT);
      setMeta('description',       `${INTELLECT} — Learn, Grow, Teach.`);
      setMeta('robots',            'index, follow');
      setProperty('og:title',      INTELLECT);
      setProperty('og:type',       'website');
      setProperty('og:image',      DEFAULT_IMG);
      setProperty('og:url',        INTELLECT_URL);
      setMeta('twitter:title',     INTELLECT);
      setMeta('twitter:image',     DEFAULT_IMG);
      removeJsonLd();
      removeCanonical();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, image, keywords?.join(','), author, robots, type, canonical, schema]);
}
