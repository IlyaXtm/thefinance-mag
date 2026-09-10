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

## B0c — Check whether `/mag/category/*` needs redirecting ✅ CLOSED 2026-09-07

**Answered by building the routes instead.** The Search Console export showed
five `/mag/category/*` URLs with impressions and zero clicks, and the open
question was whether to redirect them somewhere. As of today `/mag/category/<slug>`
is a real route generated from the live taxonomy, so those five URLs resolve to
the archives they always named. Nothing to redirect.

Two of the five are below the sitemap floor and carry `noindex` — `analysis`
and `inchart`, at two articles each — so they answer 200 for a reader arriving
from an old link while asking not to be ranked. That is the correct outcome for
a URL with impressions and no clicks.

Confirm after the next deploy:

```bash
for s in education articles news analysis inchart; do
  printf '%-10s %s\n' "$s" "$(curl -s -o /dev/null -w '%{http_code}' https://thefinance.ir/mag/category/$s)"
done
```

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

## B4 — Market filter bar as the primary axis ✅ CLOSED 2026-09-07

**Status:** closed — measured at the new archive size, and the answer did not
change.

The figure that originally decided this was 18 of 32 articles with no market.
The 2026-09-06 migration took the archive to 53 posts and made that figure
stale, which reopened the item. It has now been counted:

| market | articles |
|---|---|
| crypto | 5 |
| forex | 3 |
| global | 3 |
| tse | 2 |
| gold-usd | 1 |
| housing | 0 |
| **no market at all** | **39 of 53** |

The ratio got *worse*, not better: 56% untagged before, 74% now. The trigger
this item set for itself — any single market reaching roughly 8–12 articles —
is not close to being met by the largest of them.

So content type stays the visible filter axis. Markets remain chips on cards
and archive pages, and only terms with `count > 0` are ever linked. Reopen this
only if the tagging in B17 actually happens; nothing else changes the answer.

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

**Status:** blocked · **Blocked on:** SPF/DMARC records ·
**The form is now hidden — 2026-09-07**

The form existed and was WORSE than not existing. Its submit handler sent
nothing anywhere: it waited 400ms and showed «ثبت شد؛ ایمیل تأیید برایتان
ارسال شد» — a confirmation that a confirmation email had been sent, when no
request was made and no address was stored. That was live on production, on a
publication whose position is «بدون سیگنال، بدون تبلیغ».

It is now behind `NEWSLETTER_ENABLED` in `src/features/mag/lib/newsletter.ts`,
which is `false`. The card and both header CTAs are unrendered — not replaced
with a "coming soon" notice, which would keep the field on screen and invite
the same input. The component and its styling are untouched; turning it back on
is one line, and the file states the four preconditions.

Storage, double opt-in, and sending still do not exist.

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

**Revisit when:** SPF and DMARC are published. The frontend is then roughly
three days: the `wp_tf_subscribers` table, the opt-in endpoint, the unsubscribe
token, and a weekly digest on `wp_schedule_event` rather than an email per
publish.

**Do not flip the flag before the endpoint exists.** The `setTimeout` in
`NewsletterCta.tsx` must be gone first, not after — a flag flipped over a fake
submit handler restores exactly the defect it was added to remove.

---

## B7 — Gutenberg blocks beyond the first four

**Status:** deferred by design. **Four now, not three** — updated 2026-09-09.

Callout, Disclaimer, CTA and **FAQ**. Chart embeds and product cards are still
built when an editor actually asks for them.

The FAQ block arrived with the rich article template, and it earned its place
the way this list requires: the design needed a structured question/answer
list, and the alternative was an editor formatting one by hand out of headings
and paragraphs — which puts five questions into the table of contents and makes
the answers uncollapsible. It renders as `<details>`/`<summary>` with no
JavaScript.

**The callout gained a `warn` variant in the same pass, and it is still one
block.** The original note ruled out an info/warning/success/error SET, on the
grounds that four options means an editor chooses correctly once and wrongly
three times. Two is a question with a right answer — does skipping this cost
the reader money? — and `note` remains the default, so an editor who chooses
nothing still gets the correct block. **A third variant needs a new argument,
not a new colour.**

Three things the rich template asked for are deliberately NOT blocks, because
WordPress core already ships them and a house block that duplicates a core one
is a block editors have to be told to prefer:

- the pull quote is `core/pullquote`, now styled
- the comparison table is `core/table`, wrapped for overflow in the body
  pipeline
- the tag row is the post's own taxonomy, not in-body content — see B27

**The WordPress half of all four blocks is still unwritten.** What exists in
this repo is the contract: `mag-blocks.types.ts` types them and `globals.css`
styles them by `[data-block]` attribute. Nothing registers them in Gutenberg
yet, so no editor can insert one. That is the next piece of work on this item,
and `roadmap.md` wave 2 puts it ahead of the custom fields for a reason — an
author can use a block the day it ships, where a field waits on somebody
committing to fill it.

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

**The number is STILL not in this document, and the reason is now specific.**
It was asked for again on 2026-09-07 and it could not be taken: this build
environment cannot reach the CMS. `curl` to `wp.thefinance.ir` and to
`thefinance.ir` both return `000` in ~0.25s — a connection refused by the agent
proxy's allow-list, not a timeout, so it is not a matter of retrying. Every
attempt at this figure has failed for the same reason, and it will keep failing
until the count is taken somewhere with network access to the CMS.

Two ways to take it. The cheap one is a count of headline-bearing artwork by
eye, which is what the question actually is — no query can tell you whether a
JPEG has text rendered into it:

```bash
USE_MOCK=false npm start   # then count on /mag and /mag/archive
```

The mechanical half — sizes and shapes, which bound how bad a crop can be — is
one query and is worth pasting into the same session:

```bash
curl -s https://wp.thefinance.ir/mag/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first:100){ nodes { slug featuredImage { node { sourceUrl mediaDetails { width height } } } } } }"}' \
  | python3 -c "import sys,json,collections
n=json.load(sys.stdin)['data']['posts']['nodes']
miss=[p['slug'] for p in n if not p.get('featuredImage')]
d=[(p['slug'],p['featuredImage']['node']['mediaDetails']) for p in n if p.get('featuredImage')]
print(f'{len(n)} posts, {len(miss)} with no featured image')
print('under 800px wide:', [s for s,m in d if (m['width'] or 0) < 800])
c=collections.Counter(round((m['width'] or 1)/(m['height'] or 1),2) for _,m in d)
print('aspect ratios:', c.most_common())"
```

**IT NOW BLOCKS A DESIGN OPTION, not just a count.** Any hero treatment that
crops — a height cap, a fixed-ratio frame — is a guess until somebody knows
whether baked-in headlines sit near the vertical edges of the frame. The hero
was deliberately bounded by WIDTH rather than height (2026-09-09) partly so this
answer was not needed to ship; the next person who proposes a crop needs it.
Take it with the by-eye pass, not from the query — no query can tell you where
text sits inside a JPEG.

The reported shape of the answer, from the handoff: all 53 have a featured
image, three are under 800px wide, and the ratios split across 1.90, 1.50 and
2.50. Those three ratios are now what the article hero is drawn at — see
`src/features/mag/lib/hero-ratio.ts` — so the crop half of this item is closed
even though the headline-count half is not. Until the count exists this item
has a scope but not a size.

**And the fixtures test the wrong state.** Of the 53 real articles, ZERO have
no featured image — the null-image case the fixtures carefully cover does not
occur in production. The state that does occur is untested: every real featured
image has the headline baked into the artwork, so an image-led grid prints each
title twice, once as art and once as text. That is precisely what the
2026-08-20 one-image-index decision existed to prevent, and v4 reverses it
against mock gradients that carry no text at all.

The null-image fixture stays regardless — it costs nothing and the branch has
to render — but it is not evidence about production.

What *is* verified: the no-image card does not reflow the row. Measured on the
archive row at 1440px, a null-image card is 984×208 with a 270×170 image box —
identical to every image row beside it; at 390px, 350×412 with a 312×180 box,
also identical.

A review reported that the row "drops the image box entirely and the text spans
full width". Geometrically that was not happening. Visually it was: the
placeholder was `--surface-raised`, the same colour as the card it sits on, so
the reserved 270px was invisible and the row read as though the text had
spread. Reserved space nobody can see is not reserved as far as a reader is
concerned. The placeholder is now `--surface-hover` with an inset hairline.

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

---

## B16 — Total Blocking Time is at roughly 2× its guideline

**Status:** accepted for now, with a named cause and a named next step.

Measured on the standalone build at 390px under a 4× CPU throttle and
1.6 Mbps/150 ms — a mid-range Android on 3G:

| route | TBT |
|---|---|
| `/mag` | 384–442 ms |
| `/mag/archive` | 411–441 ms |
| `/mag/news` | ~350 ms |
| article | ~456 ms |

Against a 200 ms guideline. Every content route is over it.

**Do not compare these against earlier numbers.** The same commit range
measured 199–229 ms in an earlier session and 365–442 ms in this one, with
byte-identical bundles — verified by re-measuring the pre-change commit, which
came back at 365–420 ms. TBT here is a property of the machine at least as much
as of the app, so it is only meaningful as a within-session comparison. The
earlier engineering report called it "at its guideline"; on the numbers it was
flagged over on four of six routes, and that description was too generous.

**What is stable and is the actual driver:** 123–125 KB of first-load
JavaScript on every route, 103 KB of it shared. TBT is main-thread time
parsing, compiling and hydrating that.

**What would move it, roughly in order of return:**

1. The listing pages ship the full client runtime to render what is almost
   entirely static markup. The interactive parts are the theme toggle, the
   comment form and the search box — everything else could be a server
   component with no client bundle at all. Audit which components carry
   `'use client'` and why.
2. The 94 KB IRANYekanX woff2 is not JS but is on the critical path and
   competes for the same early network budget. A subset covering only the
   Persian and Latin ranges actually used would cut it substantially, and the
   face is fixed by CLAUDE.md so subsetting is the only lever.
3. Confirm against a real device or a lab with a stable CPU baseline before
   spending effort on either — the numbers above cannot support a
   before/after claim on their own.

TBT is a lab proxy for INP, which is the metric CLAUDE.md actually targets.
Field INP is not being collected; that gap is the reason this cannot be closed
by measurement here.

---

## B17 — 39 of 53 articles carry no market, and every market archive is thin

**Status:** open. **This is a content-workflow problem, not an architecture
one**, and it is recorded here rather than designed around.

The counts are in B4 above. Their consequence in the code is that the sitemap
floor (8 articles, `src/features/mag/lib/taxonomy.ts`) excludes **every market
archive**, including the three the header nav links to — طلا و ارز, بورس ایران
and کریپتو. Those pages render, are linked, and are crawlable; they simply stop
asking to be indexed.

That is uncomfortable and it is correct. A market archive holding two articles
IS thin, and indexing it does not make it less so. Lowering the floor to admit
them would put five near-empty pages in front of Google to avoid admitting that
five archives are near-empty.

**What would fix it is tagging, not code.** Every archive crosses the floor on
its own the moment its market reaches eight articles — no deploy, no change to
the floor, nothing to remember. The work is:

1. Decide which of the 39 untagged articles belong to a market. A large share
   are general technical-analysis education that genuinely belongs to none;
   forcing those into a market to fill a bucket would be worse than the gap.
2. Tag them in the CMS.
3. Re-run the B4 query. Anything at 8+ reappears in the sitemap on the next
   revalidation.

**What NOT to do:** add a market to an article to make a number go up, invent
a market term to catch the leftovers, or lower the floor. The first two damage
the taxonomy the two-axis decision exists to keep small; the third publishes
thin pages on purpose.

---

## B18 — Deactivate `easy-table-of-contents` on the CMS

**Status:** open. Blocked on a shortcode audit that needs CMS access.

The plugin injects a table of contents into every article body, which rendered
as a second ToC a few hundred pixels below the sidebar one. It is now stripped
at the mapping layer (`stripInjectedToc`), so the reader-facing defect is fixed
— but the CMS is still generating markup the frontend throws away on every
request, and the strip is a regex-adjacent scanner written against plugin markup
nobody here could verify.

**Before deactivating, audit for the shortcode.** Auto-insert and `[ez-toc]`
produce identical output, so the strip removes both; deactivating would remove
an inline list an author placed on purpose:

```bash
# any post whose content places the shortcode explicitly
wp post list --post_type=post --format=ids \
  | xargs -n1 wp post get --field=content \
  | grep -c 'ez-toc'
```

If the count is zero, deactivate. **Keep the strip afterwards regardless** — it
costs nothing and it is the guard that stops the next plugin doing the same
thing.

An author who genuinely wants an inline contents list should get a Gutenberg
block (B7), not this plugin: a block is placed deliberately, renders through the
frontend's own components, and cannot appear on articles nobody asked it to.

**Watch `/mag/health` → `injectedTocSurvivors`.** Non-empty means the plugin's
markup has moved and the strip is a no-op; the slugs name which articles to
open. `npm run check:toc` covers the shapes we know of.

---

## B19 — The other social channels ·  hero half ✅ CLOSED 2026-09-09

Two items from the 2026-09-08 SEO review that need somebody outside this
environment.

**Social URLs.** The review asked for the other channels; Telegram and LinkedIn
were named but no addresses were supplied. They sit in `SOCIAL_CHANNELS`
(`lib/site.ts`) with empty URLs and render nothing. Paste the real address in
and they appear in the footer and in the JSON-LD `sameAs` at once.

Do NOT guess a handle. `sameAs` asserts to Google that this organisation IS the
account at that address — a wrong one either makes a dead entity claim or
attaches somebody else's profile to this publisher, and both are worse than the
channel being absent.

**«عکس‌های شاخص را خراب کرده» — ANSWERED AND CLOSED.** The reviewer's verdict
was that the hero is oversized, and the fix is in: it is constrained to the
title block's 820px measure at desktop, which makes it shorter than the height
cap that was proposed AND crops nothing. Body starts 283px sooner at 1440.
Mobile unchanged. See the 2026-09-09 changelog entry.

The height cap was rejected on measurement: it takes 33% off a 1200×630, the
size most of the archive uses and which currently loses nothing. The table below
is kept as the record of what the natural-ratio change was weighing:

| source ratio | old fixed band | now |
|---|---|---|
| 680×272 (2.50) | 23% cropped | 0% — a 544px strip |
| 1200×630 (1.90) | 41% cropped | 0% — 714px tall |
| 1200×800 (1.50) | 54% cropped | 21% |

A wide image is now a thin band; a tall one pushes the article down. The old
band cropped everything equally instead, which is why it was replaced.

**The social URLs are still open** — see above. That half of this item stands.

---

## B20 — `cta_inchart` and the in-body images that 404

**Status:** open, and it needs one person with a browser and five minutes.

A live article rendered a broken image with `alt="cta_inchart"`. The rendering
side is fixed — `MediaErrorGuard` removes a failed figure so the reader sees
nothing rather than a broken icon — but **that hides the symptom and does not
find the cause**, and a CTA banner that silently disappears from every article
is still a CTA banner nobody sees.

The investigation could not be run from the build environment: `thefinance.ir`
and `wp.thefinance.ir` both return `000` in ~0.2s, refused by the proxy
allow-list rather than timing out.

Run this where the site is reachable:

```bash
# every in-body image on the reported article
curl -s "https://thefinance.ir/mag/best-crypto-wallets" \
  | grep -o 'src="[^"]*"' | grep -v _next | sort -u

# then check each one
for u in <the URLs above>; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
```

**Two outcomes, and they are different problems:**

- **A wrong path.** If the dead URLs are root-relative `/wp-content/uploads/…`,
  they are already repaired by `fixBodyImageUrls` — check
  `/mag/health → rewrittenBodyImages`, which counts them. Non-zero means this
  was it and it is fixed.
- **A missing upload.** If `rewrittenBodyImages` is zero and images are still
  dead, the file is not on the CMS. That is a CONTENT problem: someone deleted
  or never uploaded the banner. Hand it to whoever maintains the CTA, and check
  whether it is one image or a pattern across articles — a shared CTA snippet
  pasted into many posts fails in all of them at once.

Also worth checking while there: whether the CTA is inserted as raw HTML into
post bodies at all. A banner that appears in many articles by copy-paste is a
Gutenberg block waiting to happen (B7) — one component, one source, and it
cannot rot in fifty places independently.

---

## B21 — Audit what else migrated content carries

**Status:** open. Cheap, and the last two rounds each found something.

A sideways-scrolling article was traced to `<iframe width="560">` and
`<div style="width:900px">` — two shapes that appear in real WordPress bodies
and in none of the fixtures. The stylesheet now clamps both, and
`check-invariants.mjs` carries a fixture built from that markup.

**The lesson generalises and the audit has not been done.** Nobody has looked at
what the 54 real bodies actually contain. Worth one pass once the CMS is
reachable:

```bash
curl -s https://wp.thefinance.ir/mag/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first:100){ nodes { slug content } } }"}' \
  | python3 -c "import sys,json,re,collections
n=json.load(sys.stdin)['data']['posts']['nodes']
c=collections.Counter()
for p in n:
    h=p['content'] or ''
    for tag in re.findall(r'<(\\w+)', h): c[tag.lower()] += 1
    if re.search(r'style=\"[^\"]*width', h): c['[inline width]'] += 1
    if 'wp-block-' in h: c['[gutenberg blocks]'] += 1
print(c.most_common(30))"
```

Anything in that list without a rule in `globals.css` is the next
`<iframe width>`. Known unknowns worth checking specifically: `<table>` with
inline widths, `<blockquote class="twitter-tweet">` (loads a third-party
script, which CLAUDE.md forbids outright), `<script>` in body content, and
Gutenberg block wrappers the article-body styles do not name.

---

## B22 — 🔴 Editors are logged out of the panel every few minutes

**Status:** open, diagnosed, **fix untried**.

The session drops after a few minutes and the editor has to sign in again. The
diagnosis is the cookie path: WordPress sets the auth cookie on `path=/mag/`
because that is `home_url`, but the panel is served at `/wp-admin/` on the CMS
host, so the browser never sends it back.

The likely fix is three constants:

```php
define('COOKIEPATH', '/');
define('SITECOOKIEPATH', '/');
define('ADMIN_COOKIE_PATH', '/wp-admin');
```

**THEY MUST GO IN `wp-config.php`, NOT IN A mu-plugin.** WordPress reads cookie
constants before plugins load, so a mu-plugin sets them too late to have any
effect — and it would look like the fix simply did not work.

**This is a hypothesis, not a plan.** It has not been tried. `wp-config.php` is
the one file whose breakage takes the whole CMS down with no way to recover from
the panel, so: back it up first, change one constant at a time, and confirm
login survives between each. If `siteurl` is ever touched in the same session,
re-read the `WP_SITEURL` entry in `decisions.md` first.

---

## B23 — 🔴 Draft preview redirects to an ID, and the article route needs a slug

**Status:** open.

The secret handshake works — no secret gives 401, a correct secret gives 307 —
so draft mode itself is fine. The destination is wrong: it redirects to
`/mag/<id>` where the article route resolves `/mag/<slug>`, so the preview lands
on a 404 after a successful authentication.

Either the redirect resolves the ID to a slug before redirecting, or the article
route learns to accept a numeric ID in preview mode. The first is preferable —
the second puts a second URL shape in front of a route whose whole design is one
canonical path per article.

**Hygiene, from the same debugging session:** `WP_PREVIEW_SECRET` had to be
rotated twice in one day, the second time because a diagnostic query printed its
value. No diagnostic should ever print a secret — the first eight characters or
a hash is enough to compare two values.

---

## B24 — 🟠 `best-crypto-wallets` has no featured image

**Status:** open, one manual action.

The article was published into the wrong WordPress (see the "only one WordPress
may be reachable" note in `decisions.md`), exported with `wp export` and
re-imported into the CMS. The featured image did not come across the import and
has to be uploaded again by hand.

Worth checking whether anything else moved in that export lost an attachment —
it was one article, but the failure is silent and the article renders
correctly-but-imageless either way, which is now indistinguishable from a
deliberate no-image post because `MediaErrorGuard` renders nothing for both.

---

## B25 — 🟠 Nine plugins that a headless CMS has no use for

**Status:** open. Low risk except the last line, which is the opposite.

Three classic-editor plugins are active — `tinymce-advanced`,
`classic-editor-addon`, `classic-widgets` — and they are meaningless against a
headless frontend. They are also not inert: they are what made the posts screen
render broken for one user and fine for another.

Six are Jannah's, for a theme that no longer renders the site:
`jannah-extensions`, `jannah-autoload-posts`, `jannah-optimization`,
`jannah-switcher`, `tielabs-instagram`, `wm-video-playlists`.

Deactivate rather than delete first, and one group at a time — a plugin that
turns out to be load-bearing is easier to identify when it is the only thing
that changed.

**`wp-graphql` has an update available and it is NOT in this cleanup.** It is
the magazine's spine: every page is rendered from it. After any update, test
every field the frontend actually reads — `markets`, `seo`, `modifiedAtIso`,
`magRedirects`, `outlineHeadings` — because GraphQL rejects an unknown field
outright and the failure is a build that stops, not a page that degrades.

Related but separate: B18 (`easy-table-of-contents`), which needs its own
shortcode audit first.

---

## B26 — 🟠 Remove the Jannah WordPress, and the main site's `wp-json` timeout

**Status:** open, deliberately waiting.

The old Jannah install is `docker stop`ped, not deleted. It stays until the
cutover has been stable for a few weeks AND the main site has stopped pointing
at it.

**The main site is still reading `wp-json` from the CMS and timing out.** Seen
in the nginx log: a `?per_page=10&_embed` request, which is heavy — `_embed`
pulls the full author, term and media objects for every post. Whatever the main
site renders from that call is currently rendering slowly or not at all, and
nobody has looked at which. `handover-main-site-dev.md` covers it.

Removing Jannah before that call is repointed would turn a slow response into a
failed one, on the main site's home page.

---

## B27 — 🟠 Do any of the 54 articles have tags?

**Status:** open. One query, and the answer decides a route.

The rich article template ends the article with a tag row and puts a tag in the
kicker. Neither was built, because **nobody has counted**. WordPress's tag
taxonomy is in every WPGraphQL schema, so a component built against it compiles
and renders — and would render nothing, on all 54 articles, indefinitely. The
standing rule is that a component is never built against a field without
verifying it first, and this archive has already produced `market` at 14 of 54
and `dek` at 0 of 54.

```bash
curl -s https://wp.thefinance.ir/mag/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first:100){ nodes { slug tags { nodes { slug name } } } } }"}' \
  | python3 -c "import sys,json,collections
n=json.load(sys.stdin)['data']['posts']['nodes']
c=collections.Counter(t['name'] for p in n for t in (p['tags']['nodes'] or []))
tagged=sum(1 for p in n if p['tags']['nodes'])
print(f'{tagged} of {len(n)} tagged, {len(c)} distinct')
print(c.most_common(20))"
```

**Then the routing decision, which does not have an obvious answer.** A tag
chip needs a destination, and the three candidates are not equal:

- **A tag archive at `/mag/tag/<slug>`.** The category route's machinery
  already covers it — the thin-archive floor would `noindex` anything under
  eight posts on its own. The problem is the tags that clear the floor: on a
  54-article magazine a tag with eight-plus posts is a near-duplicate of a
  category archive, and two indexable pages listing mostly the same articles is
  the duplicate-content shape this whole project was set up to avoid. Viable if
  tag archives are `noindex` unconditionally and stay out of the sitemap — a
  reader feature, not an index surface.
- **Into search**, `/mag/search?q=<name>`. No new route, no index surface,
  never 404s, and approximately right. It is not the same set as "posts tagged
  X", and a chip that promises one and delivers the other is the kind of small
  dishonesty «ادامه‌ی مسیر» was rewritten to remove.
- **Not at all.** Correct if the count comes back near zero, and it costs
  nothing to wait for the number.

Do not build the row before the query. A tag row over an untagged archive is a
heading with nothing under it, which is the one thing the rich template's own
governing rule forbids.

---

## B28 — 🟠 Target size: 24px or 44px for inline navigation?

**Status:** open, one decision, everything else already done.

The responsive pass found seven controls on the article page under the 44px
floor. Six are fixed outright — the ToC disclosure (21 → 44), the ToC links
(39 → 44), the search input (21 → 44), and the byline row's wrapping. The
seventh group is not a bug so much as a conflict between two rules:

  breadcrumb links     21 → 24
  category chips       20 → 28
  author name link     20 → 24
  footer legal links   20 → 24

All four now clear **WCAG 2.2 SC 2.5.8 (Target Size Minimum, 24×24)**. None
reaches **Mag's own floor of 44px for controls**, which is stricter than the
standard and is what `CLAUDE.md` states.

**Why they were not simply taken to 44.** The breadcrumb is the clearest case:
it was just changed from two wrapped lines to one scrolling line specifically
to reclaim vertical space above the headline on a phone. Two wrapped lines
measured about 42px. A 44px trail would cost MORE than the defect did — the fix
would undo itself. The chips and the inline links have the same shape of
problem in smaller amounts.

**The argument for leaving them at 24.** WCAG 2.2 exempts targets that are
inline in a sentence or block of text, on the reasoning that enlarging them
would disrupt the line. A breadcrumb trail and an author byline are arguably
that; the category chips, which sit on their own row, are arguably not.

"Arguably" is why this is a backlog item rather than a decision. Three possible
answers, and they are not equivalent:

  1. **Keep 24 and write the exemption down** — amend the accessibility floor
     in `CLAUDE.md` to say 44 for controls, 24 for links inline in text. The
     floor then describes what the product actually does.
  2. **Go to 44 and accept the height** — honest, and gives back the vertical
     space this round spent effort reclaiming.
  3. **44 via invisible padding** — `::before` inset overlays that extend the
     hit area without changing layout. It works, and it puts overlapping
     invisible boxes on a row of adjacent chips, which creates its own problem.

Nothing is under 24px anywhere on the article page at 320, 360, 390, 414 or 768
today. This is about which number the floor should be, not about a gap.

---

## B29 — 🟠 Page padding is 20/40, and CLAUDE.md says 20/100

**Status:** open, small, found while measuring something else.

`CLAUDE.md` states page horizontal padding of **20px mobile / 100px desktop**.

**AMENDED 2026-09-10 after the UI review measured it: there are TWO conventions
in the app, not one, and this entry only knew about the first.** Measured from
the outermost text leaf on every route, excluding scrollers and `sr-only`:

```
                  390    768    1024   1440
home              20     20     40     40
archive           20     20     40     40      ← ArchiveShell: px-5 lg:px-10
category/market   20     20     40     40
article           20     20     40     40
news              20     20     40     40
authors           20     20     100    100     ← Section: px-5 lg:px-[100px]
search            20     20     100    100
author            20     20     100    100
404               20     20     100    100
```

Mobile is compliant everywhere. On desktop the content block **jumps 60px**
moving from `/mag/archive` to `/mag/search` — the same site, two page shells.
So this is no longer only "the code never met a stated constraint"; the code
does not agree with itself, and one of the two shells does meet the constraint.

It has been that way since the listing was built, so this is a documentation
question at least as much as a layout one: the max-width container plus 40px
produces a similar optical inset at 1440 to what 100px would give on a
narrower content column, and nobody has complained about the built pages.
Conforming everything to 100 is the larger change — it narrows each card in the
3-column grid by roughly 40px — which is why the review reported it rather than
picking a side.

Not changed here because it is site-wide chrome and this round was the article
page. Someone should decide which number is right and then make the two agree —
a stated constraint that the code has never met is worse than either value,
because the next person to read it will "fix" the code to match.

---

## B30 — 🟠 The build-match guard cannot see a rebuild within one commit

**Status:** open, small, found while measuring something else.

`check-invariants.mjs` refuses to run against a server whose `/mag/health`
buildId differs from `.next/BUILD_ID`. That guard exists because this project
has twice shipped numbers measured against a stale server, and it works for the
case it was written for.

It does not cover the case that actually happens during a working session.
`BUILD_ID` is derived from the git commit, so **every rebuild of uncommitted
work carries the same id**. On 2026-09-10 an incremental `next build` left a
stale prerender of the home page in `.next/server/app/index.html` — the server
chunk carried a new attribute and the prerendered HTML did not — and the guard
reported MATCH, because by its own measure it was a match.

`rm -rf .next` fixed it. The measurement that exposed it was a component
attribute that simply was not in the served HTML.

Two possible fixes, and the second is better:

1. Mix the working tree into the id — a hash of `src/` alongside the commit.
   Cheap, and it makes the id change whenever anything changes.
2. Have the guard compare something the BUILD produces rather than something
   the repo declares — the prerender manifest's mtime against the newest source
   file, say. That catches a stale prerender inside a fresh build, which is the
   actual failure mode here and which (1) would still miss.

Worth doing: every measurement in this project rests on that guard being
honest, and it has now been caught being honest about the wrong thing.

---

## B31 — 🟠 The type scale governs one heading out of twenty-three

**Status:** open, medium, found by the 2026-09-10 UI review.

Round K put a full type scale in `tokens.css` — `--fs-h1` … `--fs-h6`, both
breakpoints — with the explicit instruction to set it there "not as a one-off
on the article page". `globals.css` applies it to bare `h1`…`h6` in
`@layer base`, so it is the default. Twenty-two headings opt out of it with
hardcoded pixel utilities, which beat a base-layer element rule. `text-h1` is
consumed in exactly one place: the article `<h1>`.

Five different `<h1>` sizes ship:

```
20 / 24    article            (from the scale)
24 / 28    AuthorBox
26 / 32    news
26 / 34    CategoryCover
28 / 34    PageHeader, authors, 404
```

The visible consequence at 1440: the article's own title is 24px and the
«مطالب مرتبط» label at the foot of the same page is also 24px, while a listing
page's `<h1>` is 34px. The article headline is the smallest `<h1>` on the site
and ties with a related-articles label.

**The 20/24 article title is not the thing to reopen** — it was the reviewer's
explicit decision, recorded as such in the Round K changelog entry, and it is
correct for a title that sits beside a hero image. What is open is that the
rest of the site never adopted the scale, so that decision has no context to
sit in.

Two ways to close it, and they are not equivalent:

1. Point the twenty-two components at `text-h2`/`text-h3`/etc. and let the
   scale actually be the scale. Cheapest to write, and it rescales the whole
   site in one commit — which needs a designer to look at it, not a reviewer.
2. Decide the scale describes ARTICLE BODY typography only and that page
   chrome sizes itself, then write that down in CLAUDE.md so the next person
   does not read the scale as site-wide and "fix" the components to match.

Whichever, the current state — a scale that is authoritative in one place and
overridden in twenty-two — is the one option that teaches nobody anything.

---

## B32 — 🟢 The article body measure is 544px at 1280–1439

**Status:** open, small, found by the 2026-09-10 UI review.

CLAUDE.md fixes the content column at **700px**, calibrated to IRANYekanX at
70–73 characters, and says a typeface change means re-measuring it. At 1280–
1439 the article body renders **544px**: the three-column grid is
`[260px 1fr 300px]` with 48px gaps inside a 1200px content box, leaving
`1200 − 260 − 300 − 96 = 544`. Roughly 55 characters.

Pre-existing, and it became visible in the same review that aligned the
article `<h1>` to the body's inline-start edge: at 1280 the headline is 700px
wide directly above a 544px column, so the discrepancy now reads as a mistake
rather than as a narrow page.

At 1440 and up the column reaches its 700 and the two match exactly. So this is
a question about one 160px band of widths, and the honest options are to drop a
rail below 1440, narrow the rails, or accept a shorter measure at laptop widths
and say so in CLAUDE.md next to the 700.

---

## B33 — 🟡 The font carries an axis nothing uses — 14.5% of it

**Status:** open, small, VERIFIED but not applied.

IRANYekanX ships two variable axes: `wght` 100–1000 and `dots` 0–4. Nothing in
this codebase sets `dots`. Dropping it:

```
fonttools varLib.instancer -o IRANYekanX.woff2 --no-optimize \
    src/app/fonts/IRANYekanX.woff2 dots=drop
```

95,404 → **81,576 bytes**. Same 648 glyphs, same 462 codepoints, same `wght`
range, same 11 named instances, and metric-identical: the rendered advance
width of a mixed Persian/Latin/digit sample at 100px is the same to four
decimal places at every weight stop from 100 to 1000.

**Why it matters more than 13KB sounds.** The font is the largest asset on
every page — larger than all JavaScript (121 KB transfer), the CSS (11 KB) and
the images. It is preloaded and starts at 180 ms, but on a 1.6 Mbps mobile
profile 93 KB takes 1433 ms to arrive, leaving the fallback on screen for
roughly 940 ms after FCP. Every CLS number on this site traces to that window:
the longest article measures 0.0974 against a 0.1 target.

**Limiting `wght` to 400–700 as well is REJECTED**, and not for the reason the
first check flagged. That reached 47,280 bytes — a 50% cut — and the metric
check reported 214 advance-width differences at weight 600, all ±1 unit at 1000
upem, rendering as 0.313px over a 1853px paragraph with identical line
breaking. Not a real objection. The real one is coverage: `font-light` (300) is
used in twelve places — the hero dek, card excerpts, the footer description,
the news and 404 pages — so a 400–700 axis would silently render every one of
them at 400.

Left unapplied only because replacing the font binary was outside what the
review pass could do. The command above reproduces it exactly.

---

## B34 — 🟢 CLAUDE.md says weights 400/600/700; the code uses 300 throughout

**Status:** open, tiny, a documentation question.

Typography rule 3 reads "Real font weights only (400/600/700) — no synthetic
bold." `font-light` (300) appears in twelve components: HeroFeature's dek,
PostCard excerpts, CategoryCover, NewsletterCta, InchartCta, MagFooter's
description and legal block, the news page and the 404.

Nothing is wrong with the rendering — 300 comes from a variable axis that spans
100–1000, so it is a real weight and not a synthesised light. The rule's intent
is anti-synthetic-bold and that intent is met. But the rule states a SET, the
code uses a weight outside it, and B33 turned that into a live decision: any
future attempt to narrow the `wght` axis has to know 300 is in use.

Either add 300 to the stated set or replace the three uses that matter with
400. Do not leave the rule saying something the code has never done.
