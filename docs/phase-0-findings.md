# Phase 0 — Verified Findings

**Date:** 2026-08-19 · **Status:** complete

Every item here was verified against the running system, not assumed. Several
contradicted the initial plan and changed it.

---

## The findings that changed the plan

### Permalink structure is `/%postname%/` — ⚠️ CORRECTED 2026-08-21

> **The conclusion below was wrong and a redirect map IS required.** The
> structure claim is accurate; what it missed is that the URLs Google ranks are
> historical slugs, redirected by WordPress itself. See
> `src/features/mag/lib/redirects.ts` and the 2026-08-21 changelog entry.
>
> 48 of the 71 indexed `/mag` URLs are slugs WordPress no longer has, and they
> carry 161 of the 180 clicks — 89%. They resolve today only via
> `wp_rank_math_redirections` and `_wp_old_slug`, both inside WordPress.
>
> The trailing slash is also part of the URL and also changes. See the backlog.

Articles live at `thefinance.ir/mag/<slug>`. No date, no category in the path.

~~This removes the largest risk in the migration. The entire 301 redirect-map
phase is unnecessary: the URL structure doesn't change, only the rendering
layer behind it.~~ It also means adding the market taxonomy later cannot disturb
article URLs, because the taxonomy never appears in the path.

**Why the reasoning failed, since the shape recurs.** It checked the permalink
*setting* and stopped. The setting describes how WordPress builds a URL for a
post it has; it says nothing about URLs for posts whose slug has since changed.
The check that would have caught it is the one now in
`phase-0-verification.md`: take the ranking URLs from Search Console and ask
whether each still resolves without a redirect.

In Next.js this is `app/mag/[slug]/page.tsx` directly.

### Most slugs are percent-encoded Persian

An early assumption that slugs were Latin was wrong — it was drawn from the
five most recent posts. The majority look like:

```
%d8%a7%d9%86%d8%af%db%8c%da%a9%d8%a7%d8%aa%d9%88%d8%b1-%d8%b2%db%8c%da%af-%d8%b2%d8%a7%da%af
```

The URLs work and must be preserved byte-for-byte. The `[slug]` param needs
`decodeURIComponent` handling, or those pages 404.

### The archive is 32 published posts

`wp post list` counts all statuses; the real published archive is 32, plus 7
drafts and 3 in trash. Small enough that manual tagging is an afternoon, and
small enough that the migration monitoring window can be short.

### Categories are content types, not markets

| Slug | Name | Count |
|---|---|---|
| `education` | آموزش | 27 |
| `articles` | مقالات | 26 |
| `news` | اخبار | 3 |
| `analysis` | تحلیل | 2 |
| `inchart` | اینچارت | 1 |

No market taxonomy existed. Decision: keep `category` as `contentType` (least
work, existing `/mag/category/*` URLs stay valid) and add `market` as a new
taxonomy. `articles` and `inchart` need tidying — they aren't content types.

### ~60% of articles have no market — and that's correct

After tagging: crypto 5, forex 3, global 3, tse 2, gold-usd 1, housing 0.
Fourteen of 32.

The remaining 18 are general technical-analysis education — Ichimoku, OBV,
Stochastic, ATR, CCI, Williams %R, moving average, MFI — plus "what is
technical analysis", "what is fundamental analysis", budgeting, TradingView.
Ichimoku belongs to no market; it's used in all six.

**Consequence for the design:** the market filter bar, which the listing design
treats as the primary axis, is nearly empty against current content. Decision:
market stays optional, `contentType` becomes the visible filter axis for now,
and the market filter shows only terms with `count > 0`. The multi-market
architecture is right; the content to fill it doesn't exist yet.

`housing` has zero posts — it stays defined but hidden until its first article.

---

## Technical verifications

| Check | Result |
|---|---|
| `/mag` crawlable in production | ✅ HTTP 200 |
| `seo.robots` shape | ✅ `[String]` — `["index","follow","max-snippet:-1",…]` |
| `seo.__typename` | `RankMathPostObjectSeo` (node-specific types, newer version) |
| `seo.canonicalUrl` | `https://thefinance.ir/mag/<slug>/` — public host ✅ |
| Rank Math | installed (Pro), WPGraphQL 2.19 |
| `wp-graphql-rank-math` | was missing — installed during Phase 0 |
| mu-plugins | none existed — created |
| Database | 12 MB dump, 256 MB on disk |
| Media | 133 MB, 3,262 files |
| `thefinance-n8n-bridge` | hooks `init`, `rest_api_init`, `admin_menu` only — no `save_post`, so no conflict with revalidation |

### `canonicalUrl` and why `siteurl` stays

Rank Math derives canonicals from `siteurl`, which is
`https://thefinance.ir/mag`. Leaving it there means canonicals are already
correct and need no rewriting. If `siteurl` were moved to `wp.thefinance.ir`,
every canonical would have to be rewritten in the SEO layer.

The `toPublicUrl` helper in `mag.api.ts` stays as a safety net — if `siteurl`
ever changes, it catches the regression rather than letting `wp.` URLs reach
`<link rel="canonical">`.

---

## Security issues found and fixed

| Issue | Action |
|---|---|
| phpMyAdmin published on `0.0.0.0:8060` — a public database login | Rebound to `127.0.0.1` |
| WordPress published on `0.0.0.0:9080` — bypassed nginx and TLS | Rebound to `127.0.0.1` |
| `wp-file-manager` installed (arbitrary file read/write from admin; repeated critical RCE history) | Confirmed inactive; recommend deletion |
| `/graphql` open with no rate limit | Rate-limited on the new host |

---

## Still open

### `robots.txt` has three defects

Served from `public/robots.txt` in the frontend repo. Fix via commit:

```diff
- Disallow: *.xml$              # blocks the sitemap declared in the same file
- Disallow: *.thefinance.ir/    # robots.txt matches paths, not hosts — inert
- Disallow: /map/wp-content/plugins/
+ Disallow: /mag/wp-content/plugins/
```

The first is actively costing indexation today and is unrelated to this
project.

### Search Console baseline not captured

Needed before cutover: indexed URL count under `/mag`, three months of clicks
and impressions, and — separately — the **Image** search tab. Without the image
baseline, an image-traffic drop after cutover can't be distinguished from
noise.

### Product questions

- Does Mag carry `اخبار`, or does Khabarchi own news? Three articles, so the
  decision is cheap either way. Currently excluded from the design.
- Reports and monthlies: a CPT inside Mag, or a separate system? The design has
  a reports band and index; neither has a source.

### Editorial

The article «پیش‌بینی بورس ایران در سال ۱۴۰۵؛ رشد بازار یا ادامه رکود؟» is a
price prediction, which the brand book prohibits. An editorial decision, not a
technical one — but worth resolving before it appears on a rebuilt page.
