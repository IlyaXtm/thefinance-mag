# Backlog

Things deliberately deferred, with enough context to pick them up later
without re-deriving the reasoning.

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

Built and working, but not the default. 18 of 32 articles have no market, and
`housing` has zero — a market bar would advertise empty buckets.

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
