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
 * The query string is dropped deliberately. These are article URLs, and a
 * stray `?utm_…` carried onto the destination fragments the canonical.
 */
function absolute(request: NextRequest, path: string): URL {
  return new URL(`${MAG_PATH}${path}`, request.url);
}
