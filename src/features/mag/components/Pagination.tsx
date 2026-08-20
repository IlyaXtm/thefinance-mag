import Link from 'next/link';
import { toPersianDigits } from '../lib/format';

/**
 * Pagination.
 *
 * REAL LINKS, not an infinite-scroll button. Crawlers follow links; they don't
 * click. With SEO as the first priority, every article has to be reachable by
 * following hrefs from the listing. Infinite scroll also breaks the back
 * button, which is the single most-used control on a magazine.
 *
 * Chevrons point in RTL reading direction — "next" is LEFT.
 */

function pageWindow(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];

  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) out.push('gap');
    out.push(page);
  });

  return out;
}

const Chevron = ({ direction }: { direction: 'prev' | 'next' }) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      /* next → left, prev → right. The opposite of an LTR layout. */
      d={direction === 'next' ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  /** e.g. '/' for the listing, '/market/crypto' for an archive. */
  basePath: string;
}) {
  const currentPage = page;
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  if (totalPages <= 1) return null;

  /*
    The archive paginates by query string; everything else uses /page/N path
    segments. Query strings keep one canonical archive URL rather than
    multiplying thin near-duplicate routes, while path segments read better for
    a market or author archive.
  */
  const hrefFor = (page: number) => {
    if (basePath === '/archive') {
      return page === 1 ? '/archive' : `/archive?page=${page}`;
    }

    const base = basePath === '/' ? '' : basePath;
    return page === 1 ? base || '/' : `${base}/page/${page}`;
  };

  const itemClass =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm transition-colors';

  return (
    <nav aria-label="صفحه‌بندی" className="mt-10">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {hasPreviousPage ? (
            <Link
              href={hrefFor(currentPage - 1)}
              rel="prev"
              className={`${itemClass} border-border-interactive text-text-secondary hover:bg-surface-hover`}
              aria-label="صفحه قبل"
            >
              <Chevron direction="prev" />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className={`${itemClass} border-border-subtle text-text-muted opacity-40`}
            >
              <Chevron direction="prev" />
            </span>
          )}
        </li>

        {pageWindow(currentPage, totalPages).map((page, i) =>
          page === 'gap' ? (
            /* Not focusable — an ellipsis is decoration, not a control. */
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-text-muted">
              …
            </li>
          ) : (
            <li key={page}>
              <Link
                href={hrefFor(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={
                  page === currentPage
                    ? `${itemClass} border-accent bg-accent text-accent-contrast`
                    : `${itemClass} border-border-interactive text-text-secondary hover:bg-surface-hover`
                }
              >
                {toPersianDigits(page)}
              </Link>
            </li>
          ),
        )}

        <li>
          {hasNextPage ? (
            <Link
              href={hrefFor(currentPage + 1)}
              rel="next"
              className={`${itemClass} border-border-interactive text-text-secondary hover:bg-surface-hover`}
              aria-label="صفحه بعد"
            >
              <Chevron direction="next" />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className={`${itemClass} border-border-subtle text-text-muted opacity-40`}
            >
              <Chevron direction="next" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
