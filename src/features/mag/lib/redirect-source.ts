import { LEGACY_REDIRECTS, type LegacyRedirect } from './redirects';

/**
 * The live redirect map: WordPress is the source, code is the fallback.
 *
 * WHY NOT JUST THE HARDCODED TABLE. The nine known rules could stay a
 * constant, and that works exactly once. Every redirect after it would need a
 * deploy. The SEO team adds a redirect in Rank Math today and it is live
 * immediately; after cutover they would add one, see no error, and nothing
 * would happen — the same silent failure this whole piece of work exists to
 * prevent.
 *
 * WHY NOT JUST WORDPRESS. A CMS blip would turn ranked URLs into 404s. Those
 * nine carry 89% of the section's organic clicks.
 *
 * So: WordPress is authoritative, the compiled-in table is the floor, and a
 * fetch failure changes nothing a reader can see.
 *
 * Deliberately standalone — no import from `mag.api.ts`. This runs in
 * middleware, in front of every request, and pulling the whole data layer into
 * that bundle would put the article mapper, the sanitiser and the SEO mapper on
 * the critical path of a static asset request.
 */

const ENDPOINT =
  process.env.WP_GRAPHQL_ENDPOINT ?? process.env.NEXT_PUBLIC_WP_GRAPHQL_ENDPOINT ?? '';

/** Five minutes: new redirects go live quickly, at one query per window. */
const TTL_MS = 5 * 60 * 1000;

/**
 * The two rules WordPress cannot supply, because their targets no longer exist
 * as redirect sources in the database — the posts are gone. They always win
 * over anything fetched, so a stale database row can't resurrect a 404.
 */
const CODE_ONLY: readonly LegacyRedirect[] = LEGACY_REDIRECTS.filter(
  (rule) =>
    rule.from === 'low-risk-investment-funds' ||
    rule.from === 'introduction-to-persian-tradingview-inchart',
);

interface CacheState {
  rules: readonly LegacyRedirect[];
  fetchedAt: number;
  /** True until a fetch has ever succeeded — the compiled-in floor. */
  isSeed: boolean;
}

/*
  Module scope, which on a self-hosted Node server is per-process and survives
  between requests. It is a cache, never a source of truth: everything in it is
  reconstructible from WordPress or from the seed.
*/
let cache: CacheState = {
  rules: LEGACY_REDIRECTS,
  fetchedAt: 0,
  isSeed: true,
};

let inFlight: Promise<void> | null = null;

interface WpRedirect {
  from: string;
  to: string;
  status: number | null;
}

async function fetchRules(): Promise<readonly LegacyRedirect[]> {
  if (!ENDPOINT) throw new Error('WP_GRAPHQL_ENDPOINT is not configured.');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ magRedirects { from to status } }' }),
    /* This module does its own caching, and Next's fetch cache is not
       available to middleware anyway. */
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`magRedirects responded ${res.status}`);

  const json = (await res.json()) as {
    data?: { magRedirects?: WpRedirect[] | null };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) throw new Error(json.errors[0].message);

  const nodes = json.data?.magRedirects;
  /*
    An empty array is not the same as a failure, but it IS suspicious: the
    database is known to hold about a dozen rules. Treating empty as an error
    keeps the last good map rather than silently dropping every redirect if the
    field is ever misconfigured or the table is truncated.
  */
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error('magRedirects returned nothing.');
  }

  const fetched: LegacyRedirect[] = nodes
    .filter((node) => node?.from && node?.to)
    .map((node) => ({
      from: stripSlashes(node.from),
      to: stripSlashes(node.to),
      /* WordPress may say 302; these are permanent unless the code says
         otherwise, and the code-only entries below override anyway. */
      kind: node.status === 302 ? ('temporary' as const) : ('permanent' as const),
    }));

  /* Code-only rules last so they overwrite anything the database also claims. */
  const merged = new Map<string, LegacyRedirect>();
  for (const rule of [...fetched, ...CODE_ONLY]) merged.set(rule.from, rule);

  return [...merged.values()];
}

function stripSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * Refresh in the background, never in the request's path.
 *
 * A redirect must not wait on the CMS. The caller gets whatever is cached —
 * on a cold start, the compiled-in table — and the next request within the
 * window gets the refreshed map. A failure is swallowed on purpose: the
 * fallback already covers it, and throwing here would take down middleware for
 * every request, not just the redirects.
 */
function refreshInBackground(): void {
  if (inFlight) return;

  inFlight = fetchRules()
    .then((rules) => {
      cache = { rules, fetchedAt: Date.now(), isSeed: false };
    })
    .catch(() => {
      /* Keep the last known good map. Stamp the attempt so a hard-down CMS
         does not mean re-attempting on every single request. */
      cache = { ...cache, fetchedAt: Date.now() };
    })
    .finally(() => {
      inFlight = null;
    });
}

/** The current map. Never blocks; triggers a refresh when stale. */
export function currentRedirects(): readonly LegacyRedirect[] {
  if (Date.now() - cache.fetchedAt > TTL_MS) refreshInBackground();
  return cache.rules;
}

/**
 * A reachability probe for the health endpoint.
 *
 * IT DOES NOT REPORT MIDDLEWARE'S CACHE, and the distinction matters enough to
 * spell out. Middleware runs in its own bundle and its own module instance, so
 * the cache it maintains is not the one a route handler sees. An earlier
 * version of the health endpoint reported this module's state as though it
 * were middleware's, and said "using fallback" while middleware was in fact
 * serving the live map — a health field that lies is worse than no field,
 * because an operator either chases a non-problem or trusts it when it says
 * fine.
 *
 * So what this reports is this process's own view of whether WordPress is
 * answering `magRedirects`, which is the question actually worth monitoring:
 * if it is not, no new SEO redirect is reaching the frontend, and middleware
 * is serving the compiled floor.
 *
 * Triggers the same background refresh, so it never blocks the healthcheck.
 */
export function probeRedirectSource(): {
  reachable: boolean;
  count: number;
  ageMs: number;
  missingKnown: string[];
} {
  const rules = currentRedirects();
  const present = new Set(rules.map((rule) => rule.from));

  return {
    /* False until a fetch has ever succeeded in THIS process. */
    reachable: !cache.isSeed,
    count: rules.length,
    ageMs: cache.fetchedAt === 0 ? -1 : Date.now() - cache.fetchedAt,
    /*
      THE SHARP EDGE, MADE VISIBLE.

      Once WordPress answers, its map REPLACES the seed rather than merging
      with it. That is deliberate: merging would make a redirect impossible to
      delete — the SEO team would remove one in Rank Math, see no error, and it
      would keep redirecting, which is the same silent failure in the opposite
      direction.

      The cost is that a `magRedirects` which under-returns — a plugin bug, a
      truncated table, a field that only exposes Rank Math rules and not
      `_wp_old_slug` — silently drops ranked URLs. Those nine carry 89% of
      the section's organic clicks, so a silent drop is the worst outcome
      available.

      So the known set is checked against the live map on every probe. Anything
      listed here is a compiled-in rule that WordPress is NOT returning, and
      needs an answer before cutover.

      ONLY MEANINGFUL WHEN `reachable` IS TRUE. Before the first successful
      fetch, `rules` is the compiled-in table itself, so this comparison is the
      seed against the seed and comes back empty by construction. An empty list
      from an unreachable CMS is "not measured", not "clean" — read the two
      fields as one gate.
    */
    missingKnown: LEGACY_REDIRECTS.map((rule) => rule.from).filter((from) => !present.has(from)),
  };
}
