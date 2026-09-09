import { NextResponse, type NextRequest } from 'next/server';
import { redirectTarget, resolveRedirect } from '@/features/mag/lib/redirects';
import { currentRedirects } from '@/features/mag/lib/redirect-source';
import { MAG_PATH } from '@/features/mag/lib/site';

/**
 * Legacy slug redirects and pagination normalisation. NOTHING ELSE.
 *
 * The `middleware.ts` → `proxy.ts` rename in Next 16 followed CVE-2025-29927,
 * where a single request header could bypass every authorisation check
 * implemented in middleware. The lesson stuck: this layer is for routing at the
 * network boundary. Not auth, not data access, not anything whose failure mode
 * is a security incident. A redirect table is exactly what belongs here — its
 * worst failure is a wrong destination.
 *
 * Here rather than in `next.config.ts` `redirects()` for one reason: the SEO
 * team has to be able to change the map without a rebuild and a redeploy.
 *
 * Renames to `proxy.ts` with the Next 16 upgrade. The codemod handles it:
 *   npx @next/codemod@canary middleware-to-proxy .
 */

/* ------------------------------------------------------------------ */
/* `?page=N` — the old site's shape, and a duplicate-content hole      */
/* ------------------------------------------------------------------ */

/**
 * Paths that have a real `/page/<n>` route to send `?page=N` to.
 *
 * `/search` is DELIBERATELY ABSENT and must stay absent: it paginates by query
 * string on purpose — `decisions.md` kept the page number in `?page=` for the
 * one route with nothing to gain from a path segment, because a search results
 * URL is already query-shaped and is noindex either way. Redirecting it would
 * break the only pagination on the site that is supposed to be a parameter.
 */
const PAGINATED_PREFIXES = ['/archive', '/category/', '/market/', '/author/'];

/**
 * Routes whose `?page=` is REAL and must survive untouched.
 *
 * `/search` paginates by query string on purpose — `decisions.md` kept the page
 * number in `?page=` for the one route with nothing to gain from a path
 * segment, because a search URL is already query-shaped and noindex either way.
 *
 * This is a separate check from `hasPathPagination`, and the first version
 * conflated them: search fell through to "not a paginated route", so
 * `/search?q=تحلیل&page=2` was 301'd to page one of its own results. Measured,
 * not reasoned about — it was in the first verification run.
 */
const QUERY_PAGINATED = ['/search'];

function hasPathPagination(pathname: string): boolean {
  if (pathname === '/') return true;
  return PAGINATED_PREFIXES.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p,
  );
}

/**
 * Parse `?page=` strictly.
 *
 * Returns the integer, or null for anything that is not one. `'2abc'`, `'2.5'`,
 * `' 2'`, `'1e3'` and `''` are all null — `Number()` alone accepts several of
 * those and `parseInt` accepts `'2abc'`, which is how a junk parameter becomes
 * a redirect to a real page. Values below 1 are junk too and collapse to page
 * one rather than to a negative path segment.
 */
function parsePageParam(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : null;
}

/**
 * Normalise `?page=N` onto the path route.
 *
 * ── The bug this closes ────────────────────────────────────────────────
 *
 * `/mag/archive?page=2` returned 200 — with the content of PAGE ONE. Next
 * ignores a query parameter no route reads, so `?page=2`, `?page=3` and
 * `?page=99` were three distinct URLs serving identical content, and the set
 * is unbounded. That is worse than a 404: Google indexes a 200.
 *
 * The team also asked for `?page=N` to keep working because the old site used
 * that shape and those URLs may be linked. Both wants are the same fix: accept
 * the parameter, 301 to the path route. The old link keeps working and passes
 * its equity, and the destination stays prerendered and in the sitemap —
 * which the query-string form can never be, because reading `searchParams`
 * opts a route out of prerendering entirely.
 *
 * ── The cases ──────────────────────────────────────────────────────────
 *
 *   /archive?page=3               → /archive/page/3
 *   /archive?type=education&page=2 → /archive/page/2?type=education
 *   /archive?page=1               → /archive            (never /page/1 — that
 *                                                        404s by design, as a
 *                                                        second URL for one page)
 *   /archive?page=0 · -2 · abc    → /archive            (junk collapses to one)
 *   /news?page=2                  → /news               (no /page/ route here,
 *                                                        so the parameter is
 *                                                        meaningless and the
 *                                                        duplicate still has to
 *                                                        go)
 *   /search?q=x&page=2            → untouched (its ?page= is the real one)
 *   /archive/page/2?page=3        → /archive/page/2     (path wins; the query
 *                                                        is dropped, and there
 *                                                        is no `page` left to
 *                                                        re-fire on)
 *
 * A PAGE NUMBER PAST THE END REDIRECTS AND THEN 404s, and that is deliberate.
 * `?page=99` becomes `/page/99`, which the route 404s through
 * `isPageBeyondEnd`. Middleware cannot know the last page without a data fetch
 * at the network boundary, which is exactly what this layer must not do. One
 * hop and a 404 is the correct end state for a crawler; a 404 emitted here
 * would require the edge to query the CMS on every request.
 */
function paginationRedirect(pathname: string, search: URLSearchParams): string | null {
  if (!search.has('page')) return null;
  if (QUERY_PAGINATED.includes(pathname)) return null;

  const page = parsePageParam(search.get('page'));
  const rest = new URLSearchParams(search);
  rest.delete('page');

  const query = rest.toString();
  const suffix = query ? `?${query}` : '';

  /* Not a paginated route, or page one, or junk: the parameter carries no
     meaning, so the canonical URL is the same path without it. */
  if (!hasPathPagination(pathname) || page === null || page === 1) {
    return `${pathname === '/' ? '' : pathname}${suffix}` || '/';
  }

  const root = pathname === '/' ? '' : pathname;
  return `${root}/page/${page}${suffix}`;
}
export function middleware(request: NextRequest) {
  /*
    With `basePath` configured, `nextUrl.pathname` has the basePath ALREADY
    STRIPPED — a request for /mag/foo arrives here as /foo. Matching against
    '/mag/foo' therefore never fires, and the redirect silently does nothing
    while every page still renders. Verified by test rather than assumed.
  */
  const { pathname, searchParams } = request.nextUrl;
  const rule = resolveRedirect(currentRedirects(), pathname);

  if (!rule) {
    /*
      Trailing-slash normalisation, which `skipTrailingSlashRedirect` handed to
      us so a legacy slug above can answer in ONE hop instead of being 308'd
      first. Everything that is not a legacy slug behaves exactly as Next did.

      Combined with the page normalisation below rather than emitted first, so
      `/archive/?page=2` lands on `/archive/page/2` in one hop instead of two.
    */
    const trimmed =
      pathname.length > 1 && pathname.endsWith('/') ? pathname.replace(/\/+$/, '') : pathname;

    const paged = paginationRedirect(trimmed, searchParams);

    if (paged !== null) {
      /* 301, not 308. These are GET-only listing URLs and 301 is what the old
         site's inbound links need to consolidate; 308's method preservation
         buys nothing here and is less widely understood by SEO tooling. */
      return NextResponse.redirect(absolute(request, paged), 301);
    }

    if (trimmed !== pathname) {
      return NextResponse.redirect(absolute(request, trimmed), 308);
    }

    return NextResponse.next();
  }

  return NextResponse.redirect(
    absolute(request, redirectTarget(rule)),
    /*
      301 for everything except a source we intend to publish at again — see
      the TradingView note in the map. A 301 there would consolidate the source
      into the destination and drop the URL we are about to use.
    */
    rule.kind === 'permanent' ? 301 : 302,
  );
}

/**
 * Build the destination URL.
 *
 * MIDDLEWARE MUST EMIT AN ABSOLUTE `Location`, and route handlers must not.
 * That asymmetry is not obvious and cost a debugging round:
 *
 *  - The route handlers under `api/` had absolute URLs built from
 *    `request.url`, which in the standalone server is the address the process
 *    is BOUND to. Behind nginx that produced
 *    `Location: https://0.0.0.0:3100/mag/a7` — the container's internal
 *    address, unreachable from an editor's browser. They now emit a relative
 *    `Location`, which is valid per RFC 7231 and cannot name the wrong host.
 *  - Doing the same here fails: Next's middleware runtime parses the header as
 *    a URL and throws `ERR_INVALID_URL` on a relative one, turning every
 *    redirect into a 500.
 *
 * So middleware stays absolute — and that is safe, because a middleware
 * `request.url` IS reconstructed from the forwarded `Host`, which is exactly
 * what a route handler's is not.
 *
 * NOT `nextUrl.clone()`: `NextURL` remembers the request's trailing slash and
 * re-applies it when serialising, so cloning to build a redirect made
 * `/mag/archive/` redirect to `/mag/archive/` — a loop curl followed fifty
 * times. A plain `URL` has no such memory.
 *
 * The query string is dropped deliberately FOR THE LEGACY MAP. Those are
 * article URLs, and a stray `?utm_…` carried onto the destination fragments
 * the canonical. The pagination path above builds its own query string when it
 * needs one, so `?type=education` survives a page redirect while `?utm_…` on a
 * legacy slug does not.
 */
function absolute(request: NextRequest, path: string): URL {
  return new URL(`${MAG_PATH}${path}`, request.url);
}

/**
 * Never run on assets, API routes, or Next's own internals.
 *
 * Without a matcher the middleware ran on every request including
 * `/_next/static/*` — harmless while it only read a redirect map, and not
 * harmless now that it inspects the query string on every request for a
 * parameter a chunk URL can carry for cache-busting reasons of its own.
 *
 * `'/'` IS LISTED SEPARATELY AND IT IS NOT REDUNDANT. Next prefixes every
 * matcher with the basePath, so the pattern below becomes `/mag/(…)` — which
 * requires the slash after `mag` and therefore does not match a request for
 * `/mag` itself. `/mag?page=3` fell straight through and answered 200 with
 * page one, the exact duplicate this exists to remove, while
 * `/mag/archive?page=3` redirected correctly. Caught by testing the home page
 * alongside the others rather than assuming it behaved like them.
 */
export const config = {
  matcher: ['/', '/((?!_next/|api/|favicon.ico|icon.svg|apple-icon.png).*)'],
};
