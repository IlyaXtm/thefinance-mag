import { NextResponse, type NextRequest } from 'next/server';
import { redirectTarget, resolveRedirect } from '@/features/mag/lib/redirects';
import { currentRedirects } from '@/features/mag/lib/redirect-source';
import { MAG_PATH } from '@/features/mag/lib/site';

/**
 * Legacy slug redirects. NOTHING ELSE GOES IN THIS FILE.
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
export function middleware(request: NextRequest) {
  /*
    With `basePath` configured, `nextUrl.pathname` has the basePath ALREADY
    STRIPPED — a request for /mag/foo arrives here as /foo. Matching against
    '/mag/foo' therefore never fires, and the redirect silently does nothing
    while every page still renders. Verified by test rather than assumed.
  */
  const { pathname } = request.nextUrl;
  const rule = resolveRedirect(currentRedirects(), pathname);

  if (!rule) {
    /*
      Trailing-slash normalisation, which `skipTrailingSlashRedirect` handed to
      us so a legacy slug above can answer in ONE hop instead of being 308'd
      first. Everything that is not a legacy slug behaves exactly as Next did.
    */
    if (pathname.length > 1 && pathname.endsWith('/')) {
      return NextResponse.redirect(absolute(request, pathname.replace(/\/+$/, '')), 308);
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
 * NOT `nextUrl.clone()`. `NextURL` remembers the trailing slash of the
 * REQUEST and re-applies it when serialising, so cloning it to build a
 * redirect produced `/mag/mfi-indicator/` from a request for
 * `/mag/what-is-the-mfi-indicator/` — and, for the normalisation branch,
 * `/mag/archive/` redirecting to `/mag/archive/`: an infinite loop that curl
 * followed fifty times.
 *
 * A plain URL against `request.url` has no such memory. The basePath is added
 * explicitly here because it is only automatic on the NextURL path.
 *
 * The query string is dropped deliberately. These are article URLs, and a
 * stray `?utm_…` carried onto the destination fragments the canonical.
 */
function absolute(request: NextRequest, path: string): URL {
  return new URL(`${MAG_PATH}${path}`, request.url);
}
