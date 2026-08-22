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
 * builder. `pagePathHref` covers every listing; `pageParamHref` covers search,
 * which is the one route with nothing to gain from a path segment.
 */

/**
 * `/base?…` · `/base/page/2?…` — a path segment for the page, query string for
 * the filters.
 *
 * WHY THE PAGE NUMBER MOVED BACK OUT OF THE QUERY STRING.
 *
 * Reading `searchParams` makes a Next route fully dynamic: the server cannot
 * know which query strings will arrive, so it cannot prerender. Paginating by
 * `?page=` therefore made the market and author archives uncacheable — every
 * visit ran a GraphQL query against a `/graphql` that nginx limits to 10 r/s,
 * for a page-one view that is identical for everybody.
 *
 * Splitting the two concerns fixes it: the page number is part of the
 * resource's identity and belongs in the path, while a filter is a view over
 * that resource and can stay in the query string. Page one of an archive is
 * then a static ISR route, which is where nearly all of the traffic is.
 *
 * `params` are the filters already active (`type`, `q`), carried into every
 * page link so paginating never silently drops the filter.
 */
export function pagePathHref(base: string, params: Record<string, string | undefined> = {}) {
  const root = base === '/' ? '' : base;

  return (page: number) => {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }

    /* Page one lives at the base URL, never at `/page/1` — two URLs for one
       page is a duplicate-content problem. */
    const path = page === 1 ? root || '/' : `${root}/page/${page}`;
    const query = search.toString();

    return query ? `${path}?${query}` : path;
  };
}

/**
 * `/base?…&page=2` — the page number stays in the query string.
 *
 * ONLY search uses this, and deliberately. The reason the page number moved
 * into the path everywhere else is cacheability, and search has none to gain:
 * it reads `q` from the query string, so it is dynamic whatever the page
 * number does. It is also `noindex, follow`, so the duplicate-URL concern that
 * makes `/page/1` a 404 elsewhere does not apply.
 *
 * Adding `/search/page/[n]` would be a route that exists only to look
 * consistent.
 */
export function pageParamHref(base: string, params: Record<string, string | undefined> = {}) {
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
  /** Built by the route — see pagePathHref / pageParamHref above. */
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
