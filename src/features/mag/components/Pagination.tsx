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
 *
 * THE CALLER BUILDS THE HREFS.
 *
 * This component used to derive them from a `basePath` string, special-casing
 * '/archive' for query-string mode and falling through to `${base}/page/N` for
 * everything else. Two failures came out of that, and both were invisible in
 * the component itself:
 *
 *   - the fall-through emitted /market/<slug>/page/2, /author/<slug>/page/2
 *     and /search/page/2, none of which are routes. Crawlers followed them
 *     into 404s and every article past the ninth was unreachable.
 *   - the query-string branch rebuilt the URL from scratch, dropping the
 *     filter it was paginating: /archive?type=education paged to
 *     /archive?page=2, silently switching the reader back to everything.
 *
 * A route knows its own URL shape; this component does not. So it takes a
 * builder, and `pagePathHref` / `pageQueryHref` below cover the two shapes in
 * use — with the query builder carrying the existing parameters forward.
 */

/** `/base` · `/base/page/2` — for routes with a /page/[n] segment. */
export function pagePathHref(base: string) {
  const root = base === '/' ? '' : base;
  return (page: number) => (page === 1 ? root || '/' : `${root}/page/${page}`);
}

/**
 * `/base?…` · `/base?…&page=2` — for routes that paginate by query string.
 *
 * `params` are the filters already active on the page (`type`, `q`). They are
 * carried into every page link, which is the part the old implementation
 * dropped.
 */
export function pageQueryHref(base: string, params: Record<string, string | undefined> = {}) {
  return (page: number) => {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }

    if (page > 1) search.set('page', String(page));

    const query = search.toString();
    return query ? `${base}?${query}` : base;
  };
}

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
  hrefFor,
}: {
  page: number;
  totalPages: number;
  /** Built by the route — see pagePathHref / pageQueryHref above. */
  hrefFor: (page: number) => string;
}) {
  const currentPage = page;
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  if (totalPages <= 1) return null;

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
