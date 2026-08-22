/**
 * Legacy slug redirects.
 *
 * WHY THIS EXISTS — and why Phase 0 concluded it didn't need to.
 *
 * Phase 0 recorded that the permalink structure is `/%postname%/` and does not
 * change, and concluded from that that no redirect map was needed. The
 * structure claim is true. The conclusion did not follow.
 *
 * The slugs themselves changed at some point — Persian rewritten to English or
 * the reverse — and the URLs Google actually ranks are the HISTORICAL ones.
 * They resolve today only because WordPress and Rank Math 301 them, from
 * `wp_rank_math_redirections` and `_wp_old_slug` postmeta. Both live entirely
 * inside WordPress. Cut the rendering layer over to Next and they vanish with
 * it, along with most of the section's organic traffic:
 *
 *   71 indexed URLs under /mag · 180 clicks · 4,284 impressions (3 months)
 *   48 of those 71 are slugs WordPress no longer has — and they carry
 *   161 of the 180 clicks. 89%.
 *
 * FLATTENED ON PURPOSE. Some of these take two hops in WordPress today: Rank
 * Math points at a slug that `_wp_old_slug` then redirects again. Every hop
 * spends crawl budget and delays the reader, and since the map is being rebuilt
 * anyway there is no reason to reproduce the chain. Each entry below names the
 * FINAL destination.
 *
 * Data, not control flow. The SEO team has to be able to read and change this
 * without reading the matching logic.
 */

export type RedirectKind = 'permanent' | 'temporary';

export interface LegacyRedirect {
  /** Historical slug, exactly as it appears in a ranking URL. */
  from: string;
  /**
   * Destination slug, DECODED. Persian slugs are stored percent-encoded in
   * WordPress; they are written readable here and encoded at match time, so
   * this table stays reviewable by someone who does not read percent-encoding.
   */
  to: string;
  /**
   * `temporary` means the source URL is expected to serve its own content
   * again, so the redirect must NOT tell Google the two pages are equivalent.
   * See the note on the TradingView entry.
   */
  kind: RedirectKind;
  /** Why, for whoever finds this in a year. */
  note?: string;
}

export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  /* ---- Rank Math + _wp_old_slug, flattened to one hop ---- */
  {
    from: 'polymarket-predict-future-and-profit-from-it',
    to: 'پلیمارکت-polymarket',
    kind: 'permanent',
  },
  {
    from: 'worlds-top-10-hedge-funds',
    to: '10-هج-فاند-برتر-دنیا',
    kind: 'permanent',
    note: 'Two hops in WordPress: Rank Math → غولهای-والاستریت… → _wp_old_slug → here.',
  },
  { from: 'what-is-the-mfi-indicator', to: 'mfi-indicator', kind: 'permanent' },
  {
    from: 'complete-tutorial-on-the-williams-r-indicator',
    to: 'آموزش-کامل-اندیکاتور-williams-r',
    kind: 'permanent',
  },
  { from: 'what-is-the-cci-indicator', to: 'اندیکاتور-cci-چیست؟', kind: 'permanent' },
  { from: 'what-is-the-atr-indicator', to: 'اندیکاتور-atr-چیست؟', kind: 'permanent' },
  { from: 'what-is-a-moving-average-indicator', to: 'moving-average-indicator', kind: 'permanent' },

  /* ---- Content gone ---- */
  {
    from: 'low-risk-investment-funds',
    to: '2-ways-to-choose-your-fixed-income-fund',
    kind: 'permanent',
    note: '5 clicks, 504 impressions. Genuinely the same subject, so permanent.',
  },
  {
    from: 'introduction-to-persian-tradingview-inchart',
    to: 'آموزش-tradingview-2026',
    /*
     * TEMPORARY, and the status matters more than usual.
     *
     * This is the single biggest organic entry point to the magazine — 77
     * clicks and 395 impressions, roughly 43% of all /mag clicks — and it has
     * been 404ing for some time. It is bleeding traffic today, independently
     * of the cutover.
     *
     * The decision is to REWRITE the article under this same slug (backlog).
     * So the destination is a holding page, not an equivalent: a 301 would
     * tell Google these two URLs are one, consolidate the signals into the
     * destination, and drop the source from the index — which is precisely the
     * URL we intend to publish at.
     *
     * 302 keeps the source URL indexed and its identity intact, which is what
     * "the content is coming back here" means in HTTP. This is the one
     * deliberate exception to the 301-only rule; every other entry is 301.
     *
     * REMOVE THIS ENTRY when the article publishes.
     */
    kind: 'temporary',
    note: 'Holding redirect until the rewritten article ships. Remove on publish.',
  },
] as const;

/**
 * Lookup keyed by every form a request might legitimately arrive in.
 *
 * Google may hold either the encoded or the decoded form of a URL, and links
 * in the wild carry both, with and without a trailing slash. Rather than
 * normalising the incoming path — which is where this kind of matching usually
 * goes wrong — every accepted spelling is registered up front and the match is
 * an exact map lookup.
 *
 * Memoised on the rules array's identity: the live map is refreshed every five
 * minutes, and rebuilding ~70 keys on every request in front of every asset
 * would be pure waste.
 */
let indexedRules: readonly LegacyRedirect[] | null = null;
let index = new Map<string, LegacyRedirect>();

function indexFor(rules: readonly LegacyRedirect[]): Map<string, LegacyRedirect> {
  if (indexedRules === rules) return index;

  const built = new Map<string, LegacyRedirect>();

  for (const rule of rules) {
    let decoded = rule.from;
    try {
      decoded = decodeURIComponent(rule.from);
    } catch {
      /* A rule whose `from` is not valid percent-encoding still matches its
         literal form; it just gets no decoded alias. */
    }

    for (const key of [rule.from, encodeURIComponent(rule.from), decoded]) {
      built.set(key, rule);
      built.set(key.toLowerCase(), rule);
    }
  }

  indexedRules = rules;
  index = built;
  return built;
}

/**
 * Resolve a request path against a rule set.
 *
 * `path` is the pathname WITHOUT the `/mag` basePath — matching what
 * middleware sees.
 */
export function resolveRedirect(
  rules: readonly LegacyRedirect[],
  path: string,
): LegacyRedirect | null {
  const slug = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!slug) return null;

  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    /* A malformed escape sequence is not a slug we issued. Fall through to the
       raw form rather than throwing inside middleware. */
  }

  const map = indexFor(rules);

  return map.get(slug) ?? map.get(decoded) ?? map.get(decoded.toLowerCase()) ?? null;
}

/**
 * The destination path, percent-encoded.
 *
 * The table stores decoded Persian for readability; a `Location` header must
 * carry the encoded form or the target does not resolve.
 */
export function redirectTarget(rule: LegacyRedirect): string {
  return `/${encodeURIComponent(rule.to)}`;
}
