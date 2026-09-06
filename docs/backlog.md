# Backlog

Things deliberately deferred, with enough context to pick them up later
without re-deriving the reasoning.

---


## B0 — Rewrite `introduction-to-persian-tradingview-inchart`

**The single biggest organic entry point to the magazine**, and it has been
404ing for some time: 77 clicks and 395 impressions in three months, roughly
43% of all `/mag` clicks. This is bleeding traffic today, independently of the
cutover.

The keyword ranks and the demand is demonstrably there. Someone searching for a
Persian TradingView alternative is exactly an InChart prospect, so rewriting it
recovers traffic and feeds the product at once.

Publish under the SAME slug — `introduction-to-persian-tradingview-inchart`.
That is the URL with the history.

**On publish, delete the matching entry from
`src/features/mag/lib/redirects.ts`.** It is a 302 holding redirect to
`آموزش-tradingview-2026`, deliberately temporary so Google keeps the source URL
indexed and does not treat the two pages as equivalent. Leaving it after the
article lands would consolidate the URL we just published into a different one.

---

## B0b — Trailing-slash form ✅ CLOSED 2026-09-06

**Decided: `trailingSlash` stays off.** A 308 passes full link equity and costs
no ranking, so the extra hop on currently-ranking URLs is accepted rather than
reshaping every canonical, sitemap entry and internal link product-wide.

Reasoning in full: `docs/decisions.md` → URL shape. Do not reopen without new
evidence that a 308 costs position.

---

## B0c — Check whether `/mag/category/*` needs redirecting

The Search Console export shows five such URLs with impressions and zero
clicks. Probably not worth redirecting, but it should be a decision rather than
an omission. `scripts/verify-redirects.sh` prints their current status.

---

## B1 — Reader level («سطح»)

**Status:** deferred 2026-08-20 · **Blocks:** nothing

A per-article difficulty label on educational content, shown on cards and in
the learning path.

**Why it was proposed:** the whole competitive category ships «از صفر تا صد»
explainers with no signal of who they're for, so readers land on something too
basic or too advanced. Level is one of the few credible non-engagement signals
available given the brand prohibits view counts, trending, and profit claims.

**Why deferred:** every mandatory field is a per-article decision, and the
content team currently doesn't write excerpts. Adding a field that ships empty
is worse than not having it — the «چرا مهم است» field was designed and dropped
for exactly this reason.

**Design decisions already made** (don't re-litigate):
- Two values, not three — «مبتدی» / «پیشرفته». «متوسط» is where an editor parks
  when unsure, and once most articles are "intermediate" the label says nothing.
- Educational content only. Not on تحلیل or گزارش.
- Rendered as a quiet text label in the meta row. NOT dots, bars, or a coloured
  badge — those read as a difficulty rating and invite "harder = better".
- Both variants must be built: with the level and without it.

**Cheaper alternative worth considering first:** infer level from position in
the learning path rather than asking. First third «مبتدی», rest «پیشرفته», with
an optional override field for the exceptions (personal budgeting sits late in
the path but is genuinely beginner). One input, two outputs, zero extra editor
decisions.

**Revisit when:** the learning path exists and readers are landing mid-sequence,
or the content team asks for it.

---

## B2 — `series_order` and the learning path

**Status:** deferred 2026-08-20 · **Blocks:** the Stage 1 landing redesign

A numeric field placing each educational article in a reading sequence.

**Why it matters:** WordPress orders posts by publication date, which has no
relationship to teaching order — Ichimoku may well have been written before
"what is technical analysis". Without a stored order, the sequence has to be
hardcoded, which means a deploy every time an editor wants to reorder.

**Why it matters more than it looks:** the 18 unclassified educational articles
are the largest coherent block in the archive. As a flat grid they're the
weakest part of the site; as an ordered path they become its centrepiece and the
internal-linking spine that gives a ~30-page site any topical authority. The
research pass concluded this should be the landing page's main section.

**Design decisions already made:**
- Numeric meta field in the editor sidebar, beside categories and markets.
- Step values spaced by 10 (10, 20, 30) so inserting between steps doesn't
  require renumbering everything after it.
- The metabox lists the current path alongside the input, so an editor can see
  where they're placing an article rather than counting elsewhere.
- **Empty means "not in the path."** Analysis and reports need no decision at
  all — the field only matters for articles the editor wants sequenced.
- Prerequisite chains ("پیش‌نیاز: میانگین متحرک") were designed and validated in
  the Stage 1 artifact and would need their own field or a derived link.

**Rejected alternative:** drag-and-drop reordering admin screen. Better UX, but
several hundred lines of PHP and JS for a feature whose usage is unproven.
Upgrade to it if the path turns out to drive most internal clicks.

**Consequence of deferring:** the landing page keeps the current
reverse-chronological grid. The Stage 1 design (static hero + learning path +
compact markets block) stays on the shelf.

**Revisit when:** connected to real data and the actual article set is visible,
or when the archive grows enough that reverse-chronological stops working.

---

## B3 — Reports and monthlies

**Status:** deferred, no content source exists

The design has a reports band and a `/mag/reports` index. Nothing publishes
reports yet.

Cut from the landing page rather than rendered empty. Also excluded from the
sitemap — submitting an empty page wastes crawl budget and looks like thin
content.

**Revisit when:** reports are actually being produced, and after deciding
whether they're a WordPress CPT inside Mag or a separate system.

---

## B4 — Market filter bar as the primary axis

**Status:** deferred until the taxonomy fills

Built and working, but not the default. The figure that decided this was **18
of 32 articles with no market**, with `housing` at zero — a market bar would
advertise empty buckets.

⚠️ **That figure is stale and this item is therefore UNDECIDED, not deferred.**
A content migration on 2026-09-06 took the archive to **53 published posts, 21
of them new**. Nobody has counted how many of the 53 carry a market. If the
ratio moved, the reason for deferring B4 has gone with it.

Measure before deciding — one query, no build required:

```bash
curl -s https://wp.thefinance.ir/mag/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first:100){ nodes { slug markets { nodes { slug } } } } }"}' \
  | python3 -c "import sys,json,collections
n=json.load(sys.stdin)['data']['posts']['nodes']
c=collections.Counter(m['slug'] for p in n for m in p['markets']['nodes'])
print(f'{sum(1 for p in n if not p[\"markets\"][\"nodes\"])} of {len(n)} have no market')
print(c.most_common())"
```

Content type is the visible filter axis for now. Markets appear as chips on
cards and as archive pages, and only terms with `count > 0` are ever linked.

**Revisit when:** any single market reaches roughly 8–12 articles — enough to
fill a topic hub. That's the trigger, not a date.

---

## B5 — MinIO object storage

**Status:** deferred to a later release

Worth doing eventually: media grows independently of the VPS disk, backups
separate cleanly, and a WordPress rebuild doesn't move the media.

**Must be invisible if adopted.** It sits behind the unchanged public path
`thefinance.ir/wp-content/uploads/...` with nginx falling back to the WordPress
disk on a 404, so migration is a background copy with no cutover moment. The
standard offload plugins rewrite attachment URLs in the database — precisely
what the URL-preservation strategy exists to prevent.

**Not now because:** R1 changes one variable (the rendering layer). If disk
pressure forces it earlier, more disk is cheaper and safer than a media
migration during the monitoring window.

---

## B6 — Newsletter sending

**Status:** partially deferred · **Blocked on:** SPF/DMARC records

The form exists. Storage, double opt-in, and sending do not.

**Blocked, not just deferred:** the last test showed `dkim=pass` but `spf=none`
for `thefinance.ir`. Confirmation emails will land in spam until an SPF record
is published. DMARC is also absent.

**Design decisions already made:**
- Email, not SMS. The content is a weekly explanatory summary, which fits an
  email and doesn't fit a text message. More importantly, SMS is the medium of
  the signal channel — collecting a phone number sets an expectation of alerts
  this brand can't meet.
- Subscribers stored in WordPress, not an external service. Publishing and the
  subscriber list live in the same place, and foreign providers are unreliable
  from Iran.
- Double opt-in is not optional: without it anyone can subscribe someone else's
  address, and the resulting spam complaints damage domain reputation.
- Hook `transition_post_status`, NOT `save_post` — the latter fires on every
  edit and would email subscribers each time an article is corrected.
- Mailcow already handles multi-domain correctly (verified: DKIM signs with
  `d=thefinance.ir`); `mail.hmai.io` is just the MTA hostname.

**Revisit when:** SPF and DMARC are published.

---

## B7 — Gutenberg blocks beyond the first three

**Status:** deferred by design

Callout, Disclaimer, and CTA only. Chart embeds and product cards are built
when an editor actually asks for them.

The five-block list in the design docs is a ceiling, not a starting point. A
block library grows on demand; it doesn't get pre-built.

---

## B8 — Design system token fixes

**Status:** outstanding, owner is the redesign repo

Three items surfaced during Mag that are system-level, not Mag-local. Mag has
them fixed locally; the rest of the product does not.

- **`--focus-ring` fails in the light theme.** The dark-theme blue measures
  2.85 against white and 2.59 against surface-raised — below the 3:1 required
  by WCAG 2.2 SC 1.4.11. Keyboard focus is effectively invisible. The darker
  accent measures 6.12 / 5.55.
- **`--border-interactive`** — a missing token. Interactive control boundaries
  need 3:1; `border-subtle` measures 1.28 and `border-strong` 1.68.
- **`--danger`** for form validation.

Also outstanding: the **real token identifiers**. All Mag components read
`var()` so the swap is one file, but until then the values are placeholders.

---

## B9 — robots.txt defects on the main site

**Status:** outstanding, owner is the frontend repo

Served from `public/robots.txt` in `thefinance-front`. Three defects found
during Phase 0:

```diff
- Disallow: *.xml$              # blocks the sitemap declared in the same file
- Disallow: *.thefinance.ir/    # robots.txt matches paths, not hosts — inert
- Disallow: /map/wp-content/plugins/
+ Disallow: /mag/wp-content/plugins/
```

The first is costing indexation today and is unrelated to this project.

---

## B10 — Next.js 16 upgrade

**Status:** deferred until the pages are stable

Three high-severity advisories (postcss, sharp) resolve only by upgrading to
Next 16, which is a breaking change.

Assessed as low real exposure: the postcss issues need attacker-controlled CSS
in the build pipeline, and sharp processes images from your own CMS rather than
public uploads. Upgrading mid-build would mean changing two variables at once.

**What the upgrade involves beyond a version bump:**

- **`middleware.ts` → `proxy.ts`.** Next 16 renamed the convention; the
  exported function becomes `proxy`, and config flags rename with it
  (`skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`). Codemod:
  `npx @next/codemod@canary middleware-to-proxy`. Next 16 still accepts
  `middleware.ts` but logs a deprecation warning.

  We have no such file yet — redirects are planned, not written — so this
  costs nothing today. Write them as `proxy.ts` when the time comes.

  The rename is not cosmetic. It followed CVE-2025-29927 (a header could
  bypass every middleware authorisation check) and CVE-2025-66478 (remote code
  execution — the advisory that prompted our own bump from 15.1.0 to 15.5.23).
  The layer is for routing at the network boundary, not for auth or data
  access, and the new name says so.

- Turbopack becomes the default bundler
- `params` become async
- `next/image` defaults change — worth checking against our `remotePatterns`
  and the LCP hero

**Revisit when:** the article and listing pages are done and connected to real
data.

---

## B11 — Comment moderation setting

**Status:** must be changed before comments go live

Verified on the CMS: `comment_moderation = 0` and `comment_registration = 0`.
That means comments publish immediately without review — the opposite of the
decision made.

The frontend only ever renders approved comments, so nothing leaks, but
WordPress is accepting and publishing them regardless.

```bash
wpc option update comment_moderation 1
```

Also confirm `comment_registration` stays `0` — the guest comment form depends
on it.

---

## B12 — `source` on news rows is a content-model decision, not an `if`

**Status:** decision needed before the news template can be judged complete

`NewsRow` renders «منبع: …» only when `article.source` is present, and it never
is. `source` and `sourceUrl` are listed in `CLAUDE.md` under fields
deliberately excluded, so the condition is permanently false and every news row
ships with less metadata than the v4 design specifies.

The conditional itself is correct and should stay — the standing rule is not to
build against a field that does not exist, and rendering a real one when it
arrives is the honest half of that. What is not correct is leaving the question
inside a component.

**Why it probably should exist now.** The exclusion was decided when news was
itself excluded. It isn't: an RSS automation publishes roughly two translated
items a day, and a translated item genuinely has a source. Attribution is also
the thing that separates a translated wire item from an original piece, which
is a distinction an anti-hype publication has an interest in making visible.

**What deciding it involves**, and why it is not a small change:

- a field on `Post`, exposed through the mu-plugin the way `readingTime` and
  `outlineHeadings` are, populated by the RSS importer rather than by hand
- `sourceUrl` alongside it, and then the question of whether the source links
  out — an outbound link per news row, on a publication whose own SEO is the
  first priority, is a `rel` decision (`nofollow`? `ugc`? nothing?) rather than
  a styling one
- back-filling the existing news archive, or accepting that older rows have no
  source and the row closes up for them

Do not add the field without answering the link question. A source that is
plain text is a smaller commitment than one that is a link, and the two are
hard to swap once published.

---

## B13 — `author.role` renders nothing and has no source

`AuthorBox` draws a role line under the author's name. `mapAuthor` returns
`role: null` unconditionally, because WordPress exposes nothing for it and the
content model does not list it. The mock used to fill it in, which is the only
reason the line ever appeared.

Two honest options, and a third that is not:

1. Add an author-role field to the CMS (a user meta field, exposed through the
   mu-plugin) and populate it for the six users.
2. Delete the line from `AuthorBox` and the field from `Author`.
3. ~~Leave it~~ — a component branch that can never render is dead code that
   reads as a feature.

Related, and deliberately kept: `avatar` is also always null, but that is a
*decision* rather than a gap — Gravatar was dropped (a third-party request per
author, a hash of their email sent abroad, unreliable from Iran) and the
initial-based fallback is the intended design. `role` has no such decision
behind it; it was simply never sourced.

---

## B14 — Cover art: the v4 grid needs artwork without the headline in it

**Status:** count not yet measured — see below

Blog v4 is image-led: a featured image on every card. The previous listing
showed artwork exactly once, and the reason was concrete — the existing
featured images have **the article's headline baked into the artwork**, so a
card grid prints every title twice, once as text and once as pixels.

Reversing that rule (recorded in `CLAUDE.md`) does not make the problem go
away; it converts it from a design constraint into a content-production
commitment. **The archive is 53 posts as of 2026-09-06, not the ~32 this item
was scoped against** — the count below has to be re-taken at the new size, and
the production commitment is correspondingly larger.

**The number is not in this document because it could not be measured here.**
It requires rendering `/mag` and `/mag/archive` against real data and counting
how many featured images carry no headline. Run:

```bash
USE_MOCK=false npm start
```

then count on `/mag` and `/mag/archive`, and write the figure in here. Until
then this item has a scope but not a size.

What *is* verified: `CardImage` renders a fixed-size placeholder panel when
`featuredImage` is null, structurally identical in layout to the image branch
(`h-full w-full` in both, with every call site fixing the box height), so a
missing image cannot reflow the grid. A null-image fixture is now in the mock
listing rather than only reachable by slug, so that path is exercised in
development.

---

## B15 — Two live redirects point at destinations that 404

**Status:** CMS-side content fix. Do **not** patch these in code — the live map
is authoritative and a code patch would be overwritten on the next sync.

Both are in the Rank Math table on the CMS and both are currently broken:

1. **`what-is-a-moving-average-indicator`** → points at
   `اندیکاتور-میانگین-متحرک-moving-average-چیست؟`, which does not exist.
   Correct destination: **`moving-average-indicator`**

2. **`introduction-to-persian-tradingview-inchart`** → points at
   `/mag/mag/free-tradingview/`, with `/mag` doubled. WordPress happens to
   clean the doubled prefix up today; **Next.js will not**, so this breaks at
   cutover rather than now. Correct destination: **`/mag/free-tradingview/`**

The second is the single biggest organic entry point to the magazine — 77
clicks, roughly 43% of all `/mag` clicks. A 404 there at cutover is the worst
single outcome available in this migration.

After fixing both in Rank Math, re-run `npm run redirects:sync` so the compiled
fallback picks up the corrected destinations.
