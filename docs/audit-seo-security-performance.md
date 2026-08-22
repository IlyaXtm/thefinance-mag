# SEO, security and performance audit — 2026-08-21

Run before moving to the next stage. Follows the two design audits; nothing
already fixed there is repeated.

**Data source: mock.** `wp.thefinance.ir` and `thefinance.ir` remain blocked by
this container's network policy (403 to CONNECT). Everything below was measured
against a production build (`next build && next start`) on mock data. What that
does *not* cover is called out per item.

---

## Blocking — found and fixed

### 1. The article page was not cached at all

The single most consequential finding in any pass so far.

`/[slug]` had `export const revalidate = 300` — and it was dead code. A dynamic
segment with no `generateStaticParams` is treated as **fully dynamic**: the
route was absent from `dynamicRoutes` in `prerender-manifest.json` entirely, and
every article response carried:

```
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
```

On the page where all search traffic lands. Consequences, all silent:

- The ArvanCloud CDN could never hold an article. Every reader hit the origin.
- Every request re-ran three WPGraphQL queries — article, related, comments —
  against a `/graphql` that `infra/nginx/ratelimit.conf` limits to **10 r/s**.
  A crawl burst would spend that budget re-fetching pages unchanged for months.
- TTFB was origin-bound on every hit, which is the front of the LCP chain.

`mag.api.ts` reasons explicitly about protecting that 10 r/s budget with ISR.
It was being defeated one layer up.

**A second, independent cause behind it:** `getComments` used
`cache: 'no-store'`. A no-store fetch during render opts the whole route into
dynamic rendering, so even with `generateStaticParams` the page would have
stayed uncached. Comments are held for moderation — the delay before one can
appear is human-scale — so 60-second revalidation is far fresher than needed.

Both fixed. Measured after:

| | before | after |
|---|---|---|
| build classification | `ƒ` (dynamic) | **`●` (SSG + ISR)**, revalidate 5m |
| `Cache-Control` | `private, no-store, must-revalidate` | **`s-maxage=300, stale-while-revalidate=31535700`** |
| in `prerender-manifest.json` | absent | present |
| TTFB (local, zero-latency mock) | 14–22ms | **4–5ms** |

The TTFB gap is understated here — the mock has no network. Against real
WPGraphQL the dynamic path pays three round trips to the CMS per request.

`generateStaticParams` catches its own failure and degrades to an empty list, so
a build machine that cannot reach WordPress generates on demand instead of
failing the build.

### 2. The comment rate limit could be bypassed with one header

`clientIp()` read the **first** entry of `X-Forwarded-For`. nginx builds that
header with `$proxy_add_x_forwarded_for`, which *appends* the real peer to
whatever the client sent — so the first entry is attacker-controlled.
`X-Forwarded-For: 1.2.3.4` produced `1.2.3.4, <real ip>`, and the limiter keyed
on `1.2.3.4`. Rotating the header defeated the 3-per-10-minutes limit entirely,
one request at a time.

Now prefers `X-Real-IP` — set with `proxy_set_header X-Real-IP $remote_addr`,
which *replaces* any client value — and falls back to the **last**
`X-Forwarded-For` entry, the one the nearest trusted proxy appended.

Verified with nginx-shaped headers (`XFF: <spoof>, <real peer>` +
`X-Real-IP: <real peer>`):

| request | before | after |
|---|---|---|
| attacker rotates XFF, 1st–3rd | 200 | 200 |
| attacker rotates XFF, 4th–5th | **200** | **429** |
| a genuinely different peer | 200 | 200 |

**Deployment prerequisite:** this is correct only with a proxy in front that
sets one of those headers. Direct exposure of the Node server would make it
spoofable again, and with neither header present every client shares one bucket
— restrictive rather than open, but still wrong. WordPress moderation remains
the backstop either way.

### 3. `robots.txt` disallowed the wrong site's paths

`/mag/robots.txt` emitted `Disallow: /search` and `Disallow: /api/`. Next does
not apply `basePath` to these values, so they named **`thefinance.ir/search` and
`thefinance.ir/api/`** — paths belonging to the main site, a different app —
while leaving Mag's own `/mag/search` unmentioned. The file's stated purpose is
to state Mag's intent without contradicting the main file; it was doing the
reverse. Now emits `/mag/search` and `/mag/api/`.

(Mag's `/search` was never at risk of indexing regardless: it carries
`noindex, follow`, verified.)

---

## Should fix — found and fixed

**No security headers, anywhere.** The frontend sent none — no CSP, no
`X-Content-Type-Options`, no `X-Frame-Options`, no `Referrer-Policy`, no
`Permissions-Policy` — and advertised `X-Powered-By: Next.js`. Only the CMS host
had headers, and there is no frontend nginx config in this repo at all. Set in
`next.config.ts` so they survive a proxy misconfiguration and live with the code
that depends on them.

The CSP earns its place because of one line: `ArticleBody` renders WordPress
HTML through `dangerouslySetInnerHTML`. `sanitizeArticleHtml` strips inline
style declarations — it is **not** an XSS sanitiser and does not remove scripts.
That is a deliberate trust decision about editors, but a compromised WordPress
account or plugin would otherwise run arbitrary JavaScript on the main domain.
`script-src 'self'` means injected markup cannot pull in an external payload.
It also enforces the documented "no third-party scripts" constraint in the
browser rather than in review.

`'unsafe-inline'` on `script-src` is required by Next's inline bootstrap;
removing it needs nonces via middleware. `object-src 'none'`, `base-uri 'self'`,
`form-action 'self'` and `frame-ancestors 'self'` are strict regardless.

Verified in Chromium across 13 routes × 3 viewports: **zero CSP violations**,
scroll-spy and both forms still working.

**Not set: `Strict-Transport-Security`.** HSTS applies to the whole host, so
declaring it from a sub-path would commit `thefinance.ir` on behalf of the main
site. It belongs at the edge as a domain-wide decision — flagged, not taken.

**No Open Graph on any non-article page.** Articles had a full set
(`og:title/description/url/site_name/locale/image`, `article:published_time`,
`article:modified_time`, `article:author`, twitter card). The index, archive,
market archives, author pages and the authors index had **none** — sharing any
of them produced a bare link. All five now route through the existing
`toMetadata()` helper, which already builds correct per-page `og:url` from the
canonical. Added one optional `ogTitle` param, because `<title>` gets the
layout's `%s | مجله فایننس` template appended and `og:title` does not — so
«آرشیو» would have shared as the bare word with no publication attached.

---

## Verified passing

**SEO.**

| check | result |
|---|---|
| canonical on every page type | on `thefinance.ir`, per-page, correct |
| `wp.thefinance.ir` in any rendered output | **0 occurrences** — index, article, archive, sitemap |
| sitemap | frontend URLs only, zero CMS host, empty markets and authors excluded |
| `/mag/search` | `noindex, follow` |
| `?type=…`, `?page=…` variants | canonical collapses to the base URL — no soft duplicates |
| article metadata | og + twitter + `article:*` complete, per-article |
| `dateModified` | only where a genuine revision exists |
| `NewsArticle` vs `Article` | اخبار → `NewsArticle`, everything else → `Article` |
| unknown slug | 404, not 500 |
| out-of-range pages | 404 (fixed last pass) |

**Security.**

| check | result |
|---|---|
| image optimizer SSRF | all rejected 400: `169.254.169.254` (cloud metadata), external host, `127.0.0.1`, `/etc/passwd`, CMS `/wp-admin` |
| `dangerouslyAllowSVG` | not set — SVG optimization off, correct |
| JSON-LD injection | `<` escaped to `<`; a `</script>` in a title cannot break out |
| comment bodies | stripped to plain text, never `dangerouslySetInnerHTML` — the one untrusted-content surface |
| comment input validation | length-bounded, email-validated, honeypot returns a normal 200 rather than teaching the bot |
| WPGraphQL endpoint in client bundle | **absent** — server-only, and already falls back from `WP_GRAPHQL_ENDPOINT` before the `NEXT_PUBLIC_` name |
| env read from a client component | none |
| secrets committed | none — compose reads `${DB_PASSWORD}` from a gitignored `.env` |
| mu-plugin | no `$_GET`/`$_POST`/`eval`/`exec`/`unserialize`; registration only |

**Performance** (390px, production build, mock data — absolute numbers are not
meaningful without network latency; the structure is what is being checked):

| page | TTFB | FCP | **CLS** | DOM nodes |
|---|---|---|---|---|
| index | 10ms | 144ms | **0** | 256 |
| article | 9ms | 160ms | **0** | 253 |
| 41-minute article | 7ms | 112ms | **0** | 487 |
| archive | 21ms | 92ms | **0** | 213 |

CLS is **0** on every page — the fixed aspect-ratio boxes are doing their job.
First Load JS is 113 kB shared across all routes. Font is 93.2 kB, one
self-hosted variable file, preloaded via `next/font` with no external request.
Eight `<script src>` per page, all first-party.

---

## Open — flagged, not changed

**Three high-severity advisories, all inside Next's own dependency tree.**
`npm audit` reports `postcss`, `sharp` and `next` itself. The only fix offered
is `next@16.3.2` — a **major version bump**, not an audit-time change. Exposure
assessed rather than assumed:

- **postcss** (4 advisories, all `sourceMappingURL` path traversal or
  `</style>` stringify XSS): requires attacker-controlled CSS to be compiled.
  Only `globals.css` and `tokens.css` are ever processed, at build time.
  Exposure effectively nil — anyone who can commit hostile CSS already has
  repo write access.
- **sharp `<0.35.0` / libvips CVEs**: this one is reachable — sharp is what
  `next/image` runs at request time. But the optimizer only accepts our own
  hosts (verified above), so it requires an authenticated editor uploading a
  malicious image to WordPress media. Real, narrow, gated by CMS access.
- **next**: listed only because it depends on the two above.

Recommendation: schedule the Next 16 upgrade on staging before production, as
its own change with its own test pass. `next lint` → ESLint CLI is already done,
which removes one of its breaking changes.

**Archive, market, author and search cannot be ISR-cached.** All four read
`searchParams` (for `page`), which forces dynamic rendering unconditionally.
That is the cost of the query-string pagination adopted last pass to fix the
404ing path routes. The article page — the one that matters for search traffic —
is unaffected and now cached. Market and author archives are indexable and in
the sitemap, so each crawl reaches the origin; at five markets and a handful of
authors that is small. Making them cacheable means moving page N back to a path
segment and creating those routes.

**No frontend nginx config in this repo.** `infra/nginx/` covers
`wp.thefinance.ir` only. The frontend's TLS, compression, static-asset caching
and — now load-bearing — `X-Real-IP` are undocumented here. Worth adding
alongside the CMS one, given finding 2 depends on it.

**No RSS/Atom feed.** `/mag/feed` and `/mag/rss.xml` both 404. WordPress served
a feed at the old URL; after cutover any existing subscriber breaks silently.
Cheap to add as a route handler; needs a decision on whether it was ever
advertised.

**`ORGANIZATION.logo` points at `https://thefinance.ir/logo.png`** — site root,
not `/mag`. Referenced as the publisher logo in every JSON-LD block on every
page. Still unverifiable from here; one `curl` on a machine that can reach it.

**The article page's related-articles query pays for a count it never uses.**
`getArticles({perPage: 3, contentType})` runs `countArticles`, which walks the
connection in pages of 100, to produce a total the page only compares against 3.
Cached an hour per filter set and now behind ISR, so it is once per article per
300s — but it is work done for nothing on the highest-traffic page.

**`countArticles` still unmeasured against real data.** At 32 articles it is one
hop. Needs measuring on a machine that can reach the CMS before optimising.

---

## Outside this repo — still outstanding

Unchanged from the handoff; none is actionable here.

- **Comment moderation is OFF** (`comment_moderation = 0`). The frontend renders
  only approved comments, but WordPress is publishing without review.
- **`robots.txt` on the main site** has three defects in `thefinance-front`:
  `Disallow: *.xml$` blocks the sitemap declared in the same file (costing
  indexation today), `Disallow: *.thefinance.ir/` is inert, and
  `/map/wp-content/plugins/` is a typo for `/mag/`. This is the file crawlers
  actually read — Mag's own is advisory.
- **SPF and DMARC are not published** for `thefinance.ir`.
