/**
 * The published-slug set, as middleware sees it.
 *
 * Same shape as `redirect-source.ts` — a module-level cache with a TTL, a
 * background refresh, and a failure mode that changes nothing a reader can
 * see — with one deliberate difference, below.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * `notFound()` thrown at REQUEST time cannot render its boundary into the
 * initial HTML in Next 15.5. Every unknown article, author and market slug
 * served `<body><div hidden></div></body>` — 58 bytes, blank without
 * JavaScript. The only shape that renders is a rewrite to a static page, and a
 * rewrite has to happen in middleware, which means middleware has to know the
 * slug is bad before the page runs.
 *
 * ── The one difference from `redirect-source`: a MISS BLOCKS ────────────
 *
 * That module never waits on the network, because a redirect must not. This
 * one waits, but only on a miss, and the distinction is the whole reason the
 * fix is safe to ship.
 *
 * A background-only refresh would mean a newly published article 404s until
 * the next refresh window — which is exactly the trade `dynamicParams = false`
 * would have forced, and the reason that was rejected. Blocking on a miss
 * inverts it: a slug already in the set never waits (every real article, every
 * request), and a slug that is not in the set waits once for a list the app
 * can produce in milliseconds. A brand-new article is found on its first hit,
 * with no rebuild and no staleness window at all.
 *
 * The cost is bounded by `MISS_COOLDOWN_MS`: a crawler walking a thousand dead
 * URLs triggers at most one refresh per window, and answers from the set it
 * already has in between.
 *
 * ── Failure means "do not reject" ───────────────────────────────────────
 *
 * If the endpoint is unreachable, errors, or reports `ok: false`, this returns
 * null and middleware rejects nothing. The blank 404 comes back, which is
 * today's behaviour — degraded, never worse. An empty list must never be read
 * as "no articles exist", because that would 404 the entire magazine.
 */

interface SlugSets {
  articles: ReadonlySet<string>;
  authors: ReadonlySet<string>;
}

/** Long, because a miss refreshes on demand — this only catches deletions. */
const TTL_MS = 5 * 60 * 1000;

/**
 * A TOKEN BUCKET, not a flat cooldown, and the difference is the whole point.
 *
 * A flat cooldown makes a newly published article 404 for the length of the
 * window — measured at 10s against a stub, which is small but is still a
 * regression from resolving instantly. A bucket makes the common case free: a
 * miss spends a token and refreshes immediately, so the first reader of a new
 * article resolves it on the spot.
 *
 * The bucket is what stops a crawler walking a thousand dead URLs from turning
 * each one into a query. It burns five, then answers from the set it already
 * has, refilling one a second.
 *
 * A new article only waits if a crawler is exhausting the bucket at that exact
 * moment, and then for about a second.
 */
const BUCKET_MAX = 5;
const REFILL_MS = 1000;

/** The endpoint is on this same server; a slow answer means something is wrong. */
const TIMEOUT_MS = 2000;

let cache: { sets: SlugSets | null; fetchedAt: number } = { sets: null, fetchedAt: 0 };
let inFlight: Promise<void> | null = null;
let tokens = BUCKET_MAX;
let lastRefill = Date.now();

function takeToken(): boolean {
  const now = Date.now();
  const refilled = Math.floor((now - lastRefill) / REFILL_MS);
  if (refilled > 0) {
    tokens = Math.min(BUCKET_MAX, tokens + refilled);
    lastRefill = now;
  }
  if (tokens <= 0) return false;
  tokens -= 1;
  return true;
}

async function fetchSets(origin: string): Promise<SlugSets | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${origin}/mag/api/known-slugs`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      ok?: boolean;
      articles?: string[];
      authors?: string[];
    };
    if (!json.ok || !Array.isArray(json.articles) || json.articles.length === 0) return null;

    return {
      articles: new Set(json.articles),
      authors: new Set(json.authors ?? []),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function refresh(origin: string): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = fetchSets(origin)
    .then((sets) => {
      /* A failed fetch stamps the attempt but keeps the last good sets, so a
         hard-down endpoint does not mean re-attempting on every request AND
         does not throw away a set that is still perfectly usable. */
      cache = { sets: sets ?? cache.sets, fetchedAt: Date.now() };
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * `true` — the slug is published. `false` — it is not, and the caller may
 * reject it. `null` — unknown, and the caller must not reject anything.
 */
export async function isKnownSlug(
  origin: string,
  kind: 'articles' | 'authors',
  slug: string,
): Promise<boolean | null> {
  const age = Date.now() - cache.fetchedAt;

  if (!cache.sets) {
    await refresh(origin);
  } else if (age > TTL_MS) {
    /* Stale but usable: refresh behind the request rather than in front of it. */
    void refresh(origin);
  }

  if (!cache.sets) return null;
  if (cache.sets[kind].has(slug)) return true;

  /*
    A miss is the newly-published case until proven otherwise. Spend a token,
    refresh, and ask again; only then is a `false` honest. Out of tokens means
    something is walking dead URLs, and the set in hand is the right answer.
  */
  if (takeToken()) {
    await refresh(origin);
    if (!cache.sets) return null;
    if (cache.sets[kind].has(slug)) return true;
  }

  return false;
}

/** For the health endpoint — this process's own view, not middleware's. */
export function probeKnownSlugs(): { cached: boolean; articles: number; ageMs: number } {
  return {
    cached: cache.sets !== null,
    articles: cache.sets ? cache.sets.articles.size : 0,
    ageMs: cache.fetchedAt ? Date.now() - cache.fetchedAt : -1,
  };
}
