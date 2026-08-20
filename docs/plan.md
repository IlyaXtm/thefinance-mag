# مجله فایننس — Master Plan

**Updated:** 2026-08-20 (revised) · **Branch:** `claude` · **Repo:** `IlyaXtm/thefinance-mag`

This supersedes the earlier roadmaps. It reflects what has actually been built
and verified, not what was planned.

---

## Where things stand

**The live site is untouched.** `thefinance.ir/mag` still renders from the old
WordPress on the frontend server. Nothing has been cut over, and rollback
remains a one-line nginx change.

### ✅ Done and verified

**Infrastructure**
- CMS VPS provisioned (2 vCPU / 4 GB / 77 GB), Ubuntu 26.04, swap added
- WordPress migrated: 32 published posts, 133 MB media, 12 MB database
- TLS via certbot; `X-Robots-Tag: noindex` verified on `/`, `/mag/`, article paths
- Rate limiting on `/wp-login.php` and `/graphql`; `xmlrpc.php` returns 403
- WordPress and phpMyAdmin rebound to `127.0.0.1` — no longer reachable directly
- `wp-graphql-rank-math` installed; `wp-file-manager` deactivated

**WordPress content layer**
- `mu-plugins/thefinance-mag.php` — version-controlled, `php -l` clean
- `market` taxonomy + six seeded terms; 14 of 32 articles tagged
- `readingTime`, `modifiedAtIso`, `marketDescription` exposed via GraphQL

**Frontend**
- Next.js 15.5.23, `basePath: '/mag'`, strict TS, Tailwind bound to tokens
- Token layer: three themes, plus `--border-interactive`, `--danger`, and the
  light-theme `--focus-ring` fix
- IRANYekanX variable font self-hosted via `next/font` — verified preloaded,
  zero external requests, ZWNJ coverage confirmed
- Feature layer: types, mock, service switch, SWR hooks
- 16 components; 11 routes; all smoke-tested against a running server
- SEO layer: Rank Math → Next.js Metadata, canonical host rewriting, JSON-LD
  (`Article`, `BreadcrumbList`, `Blog`, `Organization`), `sitemap.ts`, `robots.ts`
- Comments (moderated, hidden when empty) and newsletter form

### ❌ Not done

Gutenberg blocks · Draft Mode preview · revalidation webhook · newsletter
storage and sending · WordPress category cleanup · learning-path ordering ·
content-team enablement · SEO baseline and cutover.

---

## Since this plan was first written

**The app now runs on real WordPress data.** `mag.api.ts` is implemented
against the verified schema; all 32 articles render through every route.

**The landing page was rebuilt** around a single image and text rows, and
`/mag/archive` was added — the index showed seven articles while pagination
started at the tenth, so three were reachable from nowhere.

**Header and footer exist**, so the magazine is no longer a dead end.

See `changelog.md` for the reasoning behind each.

---

## The finding that changes the plan

The landing page was designed for a magazine with a deep archive: a lead block
(1 featured + 3 secondary), a market filter bar, a nine-card grid, and a reports
band. Against the real archive that design fails:

- 12 of 32 articles are consumed by the lead block plus the grid, and the same
  articles appear in both
- 18 of 32 articles have **no market at all** — the filter bar advertises empty
  buckets, and `housing` has zero
- The reports band has **no content source**; it would render empty or fake

**The 18 unclassified articles are not a gap — they are a curriculum.** Ichimoku,
OBV, ATR, CCI, Williams %R, moving average, MFI, Zig Zag, "what is technical
analysis", "what is fundamental analysis", TradingView, budgeting. Presented as
an ordered learning path, the weakest part of the archive becomes the strongest
section of the page, and it doubles as the internal-linking spine that gives a
30-page site any topical authority at all.

---

## Phases

### P1 — Landing page restructure · ~3 days

Replace the current listing with a curated structure that looks complete at 32
articles.

- **Cut:** reports band, top-level market filter bar, nine-card grid,
  three stacked secondary cards
- **Keep:** one static editor's-pick hero (de-duplicated — anything featured
  here never reappears below), newsletter CTA
- **Add:** «از صفر شروع کنید» — the 18 educational pieces as a numbered path
  with difficulty and reading time; a compact 14-item «تحلیل و بازارها» block
  with market labels printed on cards instead of a filter bar
- Move reverse-chronological browse and pagination to `/mag/archive`

**Requires a WordPress field:** a `series` or `order` value so the learning path
has an authored sequence rather than a hardcoded array.

**Done when:** no article appears twice on the page; no empty section renders;
LCP image is the hero and nothing else is eager-loaded.

### P2 — Header and footer · ~2 days

Blocked on the open questions below.

Built into `src/shared/ui/` rather than `features/mag/`, so swapping in the
redesign's real shell later is one import change in `layout.tsx`.

- Header: logo linking to `thefinance.ir`, product links, magazine search.
  No hamburger — with this few links a drawer is pure friction.
- Footer: market links, authors, legal, contact, social. This is also where
  crawlers reach pages that are otherwise two clicks deep.

**Done when:** every page has a visible route back to the main site.

### P3 — Category cleanup · ~half a day, WordPress side

Current categories don't match the code. `contentType` expects
تحلیل / گزارش / آموزش; WordPress has آموزش (27), مقالات (26), اخبار (3),
تحلیل (2), اینچارت (1) — and `گزارش` doesn't exist.

Left as is, the «گزارش» filter returns nothing and 26 articles in «مقالات»
surface nowhere.

- Distribute «مقالات» across آموزش / تحلیل
- Create «گزارش»
- Delete «اینچارت» (one article, not a content type)
- Decide «اخبار» — see open questions

**Check first:** whether `/mag/category/*` URLs are indexed. If they are, deleted
terms need redirects.

### P4 — Real data · ~1 week

`mag.api.ts` currently throws by design. Now it gets written against the
verified schema.

- WPGraphQL queries and mappers for every type
- Switch `NEXT_PUBLIC_USE_MOCK=false` and fix what breaks
- Percent-encoded Persian slugs verified end to end — most of the archive uses
  them, and getting this wrong 404s the majority of articles
- Real images through `next/image`; measure LCP with actual WordPress media

**Done when:** every page renders from WordPress with mock disabled, and mock
and real return identical shapes.

### P5 — Editor enablement · ~2 weeks

- `theme.json` generated from the design tokens; freeform colour and font-size
  controls disabled
- Three Gutenberg blocks only: Callout, Disclaimer, CTA. Chart embeds and
  product cards are deferred until an editor asks.
- Block locking on branded structures; Disclaimer copy non-editable
- Draft Mode preview wired through nginx
- Publish webhook → `revalidatePath`, with the ISR TTL as fallback

### P6 — Newsletter · ~3 days

- `wp_tf_subscribers` table; double opt-in (a confirmation link before any send)
- SMTP through the existing Mailcow, sending as a `thefinance.ir` address
- `transition_post_status` hook — **not** `save_post`, which would email on every
  edit
- Unsubscribe token in every message

**Blocked:** SPF and DMARC records for `thefinance.ir` are not published. The
last test showed `dkim=pass` but `spf=none`. Confirmation emails will land in
spam until that's fixed.

### P7 — Content team · ~3 days

Persian runbook, Editor/Author roles with no admin capability, training session.

**Hard pass/fail:** a content-team member publishes a complete article —
including disclaimer and CTA — with zero developer help. If that fails, the
answer is a larger block library, not an architecture change.

### P8 — Cutover · ~3 days + 8–12 weeks monitoring

- Search Console baseline **before anything** — indexed count under `/mag`,
  three months of clicks and impressions, and the Image search tab separately
- Crawl staging, diff against production: status, canonical, title, meta,
  `h1`, robots, JSON-LD, word count, internal link count
- Fix the main site's `robots.txt` — `Disallow: *.xml$` is blocking the sitemap
  today, `Disallow: *.thefinance.ir/` is inert, `/map/` is a typo for `/mag/`
- Switch the nginx upstream; verify ten URLs within five minutes
- Roll back immediately, without debate, on any `noindex`, wrong canonical, or
  missing article body

No redirect map is needed: the permalink structure is `/%postname%/` and doesn't
change.

---

## Sequence

```
P1 landing ──┐
P2 shell ────┼──► P4 real data ──► P5 editor ──► P7 content team ──► P8 cutover
P3 categories┘                          │
P6 newsletter (independent) ────────────┘
```

P1, P2 and P3 are parallel — different files, different owners. P6 depends only
on the SPF fix.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Design tokens still placeholder | High | One `grep` in the redesign repo unblocks it; every component reads `var()` so the swap is one file |
| Percent-encoded slugs mishandled in P4 | High | Most of the archive would 404; test explicitly with real slugs |
| Content team can't publish unaided | High | P7 is pass/fail; expand blocks, don't change architecture |
| `robots.txt` blocking the sitemap | High, silent | Fix in the frontend repo — costing indexation today |
| SPF absent | Medium | Confirmation emails to spam; one DNS record |
| Category cleanup breaks indexed URLs | Medium | Check Search Console before deleting terms |

---

## Deliberately not doing

Reports band (no source) · market filter bar at this archive size · nine-card
grid as the homepage spine · infinite scroll · carousels · view counts, comment
counts, trending sections, urgency badges, flame icons, follower counts, live
price tickers · designing the information architecture for 300 articles.

Their absence is the position, not an oversight.
