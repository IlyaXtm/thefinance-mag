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

## B19 — The other social channels, and the hero-image feedback

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

**«عکس‌های شاخص را خراب کرده».** Feedback on the per-image hero aspect ratio
(`9b86b3f`). "Broke" could mean cropped, stretched, too tall or too small, and
each has a different fix, so nothing was changed. The trade-off they are
probably reacting to:

| source ratio | old fixed band | now |
|---|---|---|
| 680×272 (2.50) | 23% cropped | 0% — a 544px strip |
| 1200×630 (1.90) | 41% cropped | 0% — 714px tall |
| 1200×800 (1.50) | 54% cropped | 21% |

A wide image is now a thin band; a tall one pushes the article down. The old
band cropped everything equally instead, which is why it was replaced. Ask which
they saw before changing it — and take the measurement in B14 at the same time,
since it is the same query and the same session.

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
