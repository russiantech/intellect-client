import { useCallback, type KeyboardEvent } from 'react';
import '@/styles/components/shared/Pagination.css';

/* ═══════════════════════════════════════════
   Reusable Pagination Component
   ═══════════════════════════════════════════ */

export interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  /** Show first/last jump buttons. Default: true */
  showFirstLast?: boolean;
  /** Number of sibling pages to show around current. Default: 1 */
  siblingCount?: number;
  /** ARIA label for the nav element. Default: "Pagination" */
  ariaLabel?: string;
  /** Optional className for the nav element */
  className?: string;
}

/**
 * Builds an array of page numbers with null representing ellipsis gaps.
 * Algorithm: always show first + last + current ± siblings + ellipsis where needed.
 */
function buildPageNumbers(
  total: number,
  current: number,
  siblingCount: number,
): (number | null)[] {
  if (total <= 1) return total === 1 ? [1] : [];

  const totalPageNumbers = siblingCount * 2 + 5;

  if (total <= totalPageNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1);
  const rightSiblingIndex = Math.min(current + siblingCount, total);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < total - 1;

  const pages: (number | null)[] = [];
  pages.push(1);

  if (showLeftEllipsis) {
    pages.push(null);
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      pages.push(i);
    }
    if (showRightEllipsis) pages.push(null);
  } else if (showRightEllipsis) {
    for (let i = 2; i <= rightSiblingIndex; i++) {
      pages.push(i);
    }
    pages.push(null);
  } else {
    for (let i = 2; i <= total - 1; i++) {
      pages.push(i);
    }
  }

  if (pages[pages.length - 1] !== total) {
    pages.push(total);
  }

  return pages;
}

const ChevronLeft = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
  </svg>
);

const ChevronsLeft = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M9.354 1.646a.5.5 0 0 1 0 .708L5.707 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0M12 1.646a.5.5 0 0 1 0 .708L8.354 8l3.646 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0"/>
  </svg>
);

const ChevronsRight = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M3.646 1.646a.5.5 0 0 1 .708 0l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L7.293 8 3.646 4.354a.5.5 0 0 1 0-.708M6.646 1.646a.5.5 0 0 1 .708 0l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L10.293 8 6.646 4.354a.5.5 0 0 1 0-.708"/>
  </svg>
);

export default function Pagination({
  page,
  pages,
  onPageChange,
  showFirstLast = true,
  siblingCount = 1,
  ariaLabel = 'Pagination',
  className = '',
}: PaginationProps) {
  const pageNums = buildPageNumbers(pages, page, siblingCount);

  const goTo = useCallback(
    (p: number) => {
      if (p >= 1 && p <= pages && p !== page) {
        onPageChange(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [page, pages, onPageChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, targetPage: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goTo(targetPage);
      }
    },
    [goTo],
  );

  if (pages <= 1) return null;

  return (
    <nav
      className={`pagination-nav ${className}`.trim()}
      aria-label={ariaLabel}
      role="navigation"
    >
      <ul className="pagination">
        {showFirstLast && (
          <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => goTo(1)}
              aria-label="First page"
              disabled={page === 1}
              onKeyDown={e => handleKeyDown(e, 1)}
            >
              <ChevronsLeft />
            </button>
          </li>
        )}

        <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => goTo(page - 1)}
            aria-label="Previous page"
            disabled={page === 1}
            onKeyDown={e => handleKeyDown(e, page - 1)}
          >
            <ChevronLeft />
          </button>
        </li>

        {pageNums.map((p, i) =>
          p === null ? (
            <li key={`ellipsis-${i}`} className="page-item disabled">
              <span className="page-ellipsis" aria-hidden="true">…</span>
            </li>
          ) : (
            <li key={p} className={`page-item${page === p ? ' active' : ''}`}>
              <button
                className="page-link"
                onClick={() => goTo(p)}
                aria-current={page === p ? 'page' : undefined}
                aria-label={`Page ${p}`}
                onKeyDown={e => handleKeyDown(e, p)}
              >
                {p}
              </button>
            </li>
          ),
        )}

        <li className={`page-item${page === pages ? ' disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => goTo(page + 1)}
            aria-label="Next page"
            disabled={page === pages}
            onKeyDown={e => handleKeyDown(e, page + 1)}
          >
            <ChevronRight />
          </button>
        </li>

        {showFirstLast && (
          <li className={`page-item${page === pages ? ' disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => goTo(pages)}
              aria-label="Last page"
              disabled={page === pages}
              onKeyDown={e => handleKeyDown(e, pages)}
            >
              <ChevronsRight />
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}


/* 
See usage examples in:
- client/src/components/layout/Footer.tsx
- client/src/pages/creator/CreatorPages.tsx
---
import Pagination from '@/components/shared/Pagination';

// Usage
<Pagination
  page={page}
  pages={pages}
  onPageChange={setPage}
  ariaLabel="Course pages"
/>
*/