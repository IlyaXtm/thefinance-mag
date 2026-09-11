import { NextResponse } from 'next/server';
import {
  getAuthors,
  getRoutableSlugs,
  magArchiveOverflowed,
} from '@/features/mag/api/v1/mag.service';

/**
 * The published slug list, for middleware.
 *
 * ── Why an endpoint and not a WordPress query ───────────────────────────
 *
 * `redirect-source.ts` queries WordPress directly from middleware, and this
 * could have copied it. It does not, for one reason: middleware must not know
 * which data source is in play. Behind this route the service layer answers
 * from the mock or from WPGraphQL exactly as every page does, so the 404 path
 * behaves identically in both — which also means it can be TESTED locally,
 * where there is no WordPress at all. A middleware that queries WordPress
 * directly is a middleware whose 404 handling is unverifiable on a laptop.
 *
 * It also keeps the data layer out of the middleware bundle. That bundle sits
 * in front of every request including static assets; pulling the article
 * mapper and sanitiser into it to learn a list of strings is the trade
 * `redirect-source` explicitly refused, and this refuses it the same way.
 *
 * ── It leaks nothing ────────────────────────────────────────────────────
 *
 * Every slug here is already in `sitemap.xml`, published deliberately for
 * crawlers. This is the same set in a cheaper shape.
 *
 * ── Failure is a 200 with `ok: false`, not a 500 ────────────────────────
 *
 * The caller is middleware, in front of every request. A 500 here must not
 * become a 500 there, and more importantly an empty list must never be
 * mistaken for "no articles exist" — that would 404 the entire magazine. The
 * flag is what middleware checks before it is willing to reject anything.
 */
/*
  ALWAYS FRESH. A cached response here would put its own window in front of
  middleware's: with `revalidate = 60` a newly published article would stay
  invisible for up to a minute no matter how eagerly middleware refetched,
  because middleware would keep being handed the same cached list. The rate is
  bounded on middleware's side by a token bucket, which is the right place for
  it — here, freshness is the only job.
*/
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    /*
      `getRoutableSlugs`, not a listing query. The first build of this asked
      `getAllSummaries` — the SITEMAP's set — and 404'd every layout fixture,
      because the mock keeps those reachable-by-URL and out of every listing.
      "Does this slug resolve?" has to be answered by whatever decides that,
      which is now a source function rather than a listing that happens to
      overlap with it.
    */
    const [slugs, authors] = await Promise.all([getRoutableSlugs(), getAuthors()]);

    /*
      An empty article list is treated as failure for the same reason
      `magRedirects` does: the archive is known to hold dozens, so empty means
      something is wrong upstream, and the safe reading of "wrong upstream" is
      "do not start rejecting URLs".
    */
    /*
      Two ways the list can be untrustworthy, and both mean "reject nothing":
      empty (something is wrong upstream) and overflowed (the archive outgrew
      the whole-archive fetch, so the tail is missing and those articles are
      real). A short list would 404 real URLs, which is worse than the bug
      this fixes.
    */
    if (slugs.length === 0 || magArchiveOverflowed()) {
      return NextResponse.json({ ok: false, articles: [], authors: [] });
    }

    return NextResponse.json({
      ok: true,
      articles: slugs,
      authors: authors.map((a) => a.slug),
    });
  } catch {
    return NextResponse.json({ ok: false, articles: [], authors: [] });
  }
}
