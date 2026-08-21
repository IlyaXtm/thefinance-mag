# Changelog

What changed, when, and why. Entries are newest first.

Ordinary commit messages say what happened; this records the reasoning, so a
decision doesn't get quietly reversed six months later by someone who can't see
why it was made.

---

## 2026-08-21 — Audit follow-ups

**`NewsArticle` schema implemented.** It had been promised in a comment and
never written — every article got `Article`, including translated news. For
time-bound reporting the publication date is the primary signal; `Article`
sends the wrong freshness signal. The type is now derived from the content
type, so a new news item is labelled correctly the moment it publishes.

**`CLAUDE.md` corrected.** It still listed `اخبار` as deliberately excluded.
That was true when written and stopped being true when the RSS automation
turned out to publish ~2 indexed items a day. The doc was stale, not the code.

**ESLint config added.** None existed, so `ignoreDuringBuilds: false` was a
no-op — a quality gate that had never once run. The config encodes constraints
that were previously only prose a reviewer had to remember: physical
`left`/`right` in classNames, `font-style: italic`, `text-align: justify`,
browser storage, and importing a mock outside the service layer. `npm run lint`
now runs it and passes clean.

**`middleware.ts` → `proxy.ts` recorded.** Next 16 renamed the convention. We
have no such file yet — redirects are planned, not written — so it costs
nothing today, but the SEO agent and backlog now say `proxy.ts`.

The rename is not cosmetic: it followed CVE-2025-29927, where a header could
bypass every middleware authorisation check, and CVE-2025-66478, the remote
code execution advisory that prompted our own bump from 15.1.0 to 15.5.23. The
layer is for routing at the network boundary, not auth or data access.

---

## 2026-08-20 — Editorial landing and archive

**Rebuilt the index around one image instead of nine.**

Every featured image in this archive has the article's headline baked into the
artwork. A nine-card grid therefore printed every title twice — once as art,
once as text — which is why the listing read as cluttered no matter how the
spacing was tuned. No CSS fixes a content problem.

The index now shows artwork exactly once, on the lead article, and everything
below is a text row. It reads as a publication's contents page rather than an
app screen, and removes eight image requests competing with the LCP hero.

**Added `/mag/archive`.** The index links to it as "آرشیو".

This closed a real bug: the index showed seven articles and pagination started
at the tenth, so three articles were reachable from nowhere. The archive is the
complete reverse-chronological list and is where the content-type filter now
lives — filtering is a browsing action, and browsing doesn't belong on a
curated front page.

The filter uses `?type=` rather than `/type/<slug>` routes: one canonical
archive URL beats four thin near-duplicate pages.

**Reading time promoted to the first meta slot.** It ranges from 3 to 41
minutes across this archive, which makes it genuinely decision-shaping rather
than decorative — a 41-minute piece is a commitment, a 3-minute one a glance.

**Markets became a quiet list with counts, not a filter bar.** With 18 of 32
articles carrying no market and `housing` at zero, a row of chips made the
emptiness of the taxonomy the visual point of the page.

---

## 2026-08-20 — Article page layout

- Article container centred at `max-w-[1080px]`. It had been pinned to the
  reading-start edge with two thirds of a wide screen empty.
- Table of contents capped in height with internal scrolling. The
  technical-analysis article is a 41-minute read; an uncapped list stretched
  past the viewport and defeated the sticky behaviour it existed for.
- Added scroll-spy highlighting via `IntersectionObserver`, with `rootMargin`
  pulling the detection band to the top third — without it the highlight lags a
  full section behind the reader.

**Fixed: table-of-contents links pointed at anchors that didn't exist.**

The ToC linked to `#s1-...` while the body had no matching ids. Neither the
anchor jump nor the highlight worked, and nothing errored — the feature simply
did nothing. Both sides now derive ids from one `headingId()` function in
`lib/sanitize.ts`.

**Fixed: the mock hid the bug.** It had hardcoded ids (`s1`, `s2`) while
production generates them from heading text, so the mismatch was invisible in
development. The mock now runs the same content pipeline as the real API.

That is the third time a mock diverging from production hid a real defect —
after market counts and SEO metadata. A mock that skips the transforms isn't
testing the component, it's testing a different component.

---

## 2026-08-20 — Real WordPress data

**`mag.api.ts` implemented against the verified schema.** The app now runs on
32 real articles.

**Cursor pagination instead of offset.** `wp-graphql-offset-pagination` is not
in the WordPress plugin repository, only on GitHub. Installing from outside the
repo means no automatic updates and no review, and 91% of disclosed WordPress
vulnerabilities are in plugins. Not worth it for something solvable in code.

Numbered pages are reached by walking cursors. With ~32 posts that's a few
hops, ISR caches the result, and it's lighter on MySQL than a large `OFFSET`.

**Priority-ordered category mapping.** Category counts don't add up to the
article count — articles carry roughly two categories each, because «مقالات» was
used as a general tag rather than a type. Picking "the first category" would be
non-deterministic: GraphQL guarantees no ordering, so an article's type could
change after an unrelated edit.

`resolveContentType` maps «مقالات» and «اینچارت» to null and resolves the rest
in priority order — news first, education as the fallback. The WordPress
category cleanup can now happen later without any code change.

**`اخبار` added as a fourth content type.** An RSS automation publishes about
two items a day and they're meant to be indexed. News gets `NewsArticle` schema
rather than `Article` — publication date is the signal for translated news,
revision date for evergreen education.

**Inline `text-align: justify` stripped from article bodies.** The classic
editor writes it, and inline styles beat the stylesheet. Justified Persian
produces rivers of whitespace without kashida support. Fixed in the data on the
way in rather than papered over with `!important`.

**Gravatar ignored.** WordPress returns a `secure.gravatar.com` URL for every
user, but it's a third-party request per author, it leaks a hash of their email
abroad, and it's unreliable from Iran. Avatars render as an initial.

---

## 2026-08-20 — Header and footer

Built into `src/shared/ui/` rather than the feature, so swapping in the
redesign's real shell later is one import change.

**The magazine had no route back to the main site.** A reader arriving from
search finished an article and was stranded. The logo now links to
`thefinance.ir` on every breakpoint.

**Header carries only InChart and Academy.** Paradigm is the paid VIP channel
and sits in the footer instead — leading an editorial page with a paid
subscription is what the competitive category does and what the brand rules
out.

**No hamburger menu.** With two links, a drawer costs a tap, a JS bundle, a
focus trap and a motion-preference case, all to hide two words.

**Footer carries market and author links.** On a thirty-page site, the footer is
how a crawler reaches pages that are otherwise two or three clicks deep.

**Mock market counts aligned to reality** (crypto 5, forex 3, global 3, tse 2,
gold 1, housing 0). The mock had every bucket full, so the "hide empty markets"
rule was never exercised in development.

---

## 2026-08-19 — SEO layer and structured data

Metadata mapped from Rank Math with **canonical host rewriting**. Rank Math
returns whatever `siteurl` says; if that ever moves to the CMS host, the same
articles index from two hosts and dilute each other. It fails silently — the
page renders perfectly throughout.

**JSON-LD built in code, not passed through from Rank Math.** The schema layer
knows which articles are news and which are evergreen education; Rank Math
can't infer that. Emitting both would put two conflicting Article blocks on one
page.

`Article`, not `NewsArticle`, for educational content — "what is the Ichimoku
indicator" is as true next year as today, and the wrong label sends the wrong
freshness signal.

`sitemap.ts` and `robots.ts` generated in Next.js. Rank Math's sitemap emits
WordPress URLs, which after cutover would point at the CMS host and invite
Google to index it.

**Three bugs caught by inspecting rendered HTML, not by the type system:**

- Every article shared one article's OpenGraph title and description. The mock
  spread a whole `seo` object; the shape was valid so nothing errored.
- `dateModified` equalled `datePublished` on every article. If everything
  claims to be updated, nothing is.
- A missing article returned 500 rather than 404. A 500 tells Google the server
  is broken; a 404 tells it the URL is gone.

---

## 2026-08-19 — Comments and newsletter

**Comments are moderated and hidden when empty.** Submission goes through a
Next.js route handler rather than the browser talking to WordPress: that's
where rate limiting (3 per IP per 10 minutes), the honeypot, and field
validation are enforceable.

The honeypot returns a normal-looking success rather than an error — telling a
bot it was detected only teaches it to adapt.

Comment bodies render as **plain text, never HTML**. It's the one place on this
site where an untrusted party controls content.

**Newsletter is email, not SMS.** The content is a weekly explanatory summary,
which fits an email and doesn't fit a text message. More to the point, SMS is
the medium of the signal channel — collecting a phone number sets an
expectation this brand can't meet.

---

## 2026-08-19 — Font

IRANYekanX self-hosted via `next/font`. One variable file covers weights
100–1000 at 93 KB; separate static weights would cost several times that.

Verified coverage includes **ZWNJ (U+200C)** — «می‌شود» and «سرمایه‌گذاری» break
visibly if the font falls back mid-word.

**The font's own default weight is 100.** Without an explicit 400 on `body`,
Persian body copy rendered anaemic.

Never a CDN: this sits on the LCP path and Google-hosted assets are
intermittently unreachable from Iran.

---

## 2026-08-19 — Frontend foundation

Next.js App Router, `basePath: '/mag'`, strict TypeScript, Tailwind bound to
the semantic tokens with no parallel palette.

**Three design-system tokens added**, all of which are system-level rather than
Mag-local:

- `--focus-ring` fails in the light theme — the dark-theme blue measures 2.85
  against white, below the 3:1 required by WCAG 2.2 SC 1.4.11. Keyboard focus
  was effectively invisible.
- `--border-interactive` — control boundaries need 3:1; `border-subtle`
  measures 1.28 and `border-strong` 1.68.
- `--danger` for form validation.

Mag has these fixed locally. The redesign token layer still doesn't.

**`Intl.DateTimeFormat` instances are module-level singletons.** Measured:
constructing one costs ~107ms cold and ~0.42ms warm; reusing one costs ~0.007ms.
A six-card grid constructing per card wastes ~2.5ms per render.

**`timeZone` pinned to Asia/Tehran.** Without it the server runs UTC and the
browser runs Tehran, so the same timestamp rendered as ۲۸ مرداد server-side and
۲۹ مرداد client-side — a wrong date and a hydration mismatch.

---

## 2026-08-19 — WordPress migration

Migrated to a dedicated CMS VPS. 32 published posts, 133 MB media, 12 MB
database.

TLS via certbot. `X-Robots-Tag: noindex` verified on `/`, `/mag/` and article
paths — without it the same articles index from two hosts.

The header had to be repeated inside every proxy location: nginx does not
inherit server-level `add_header` into a location block that declares its own.

**Security issues found and fixed:**

- phpMyAdmin published on `0.0.0.0:8060` — a public database login
- WordPress published on `0.0.0.0:9080`, bypassing nginx and TLS
- `/wp-json/wp/v2/users` open, leaking every WordPress username and turning a
  brute-force attempt on `wp-login` into a targeted one. Three IPs had already
  queried it
- `wp-file-manager` installed — repeated critical RCE history. Deactivated

**mu-plugin deployed:** `market` taxonomy, `readingTime` (150 wpm, server-side),
`modifiedAtIso`, `marketDescription`.

An mu-plugin because these are infrastructure the frontend queries, not
optional features. The cost is that a parse error takes down the site with no
admin recovery — hence `php -l` before every deploy.

---

## 2026-08-19 — Phase 0 verification

Three findings changed the plan:

**Permalinks are `/%postname%/`.** No redirect map is needed — the URL
structure doesn't change, only the rendering layer. This removed the largest
risk in the migration and an entire phase from the roadmap.

**Most slugs are percent-encoded Persian.** An early assumption that they were
Latin was wrong, drawn from the five most recent posts. The `[slug]` param needs
`decodeURIComponent` handling or most of the archive 404s.

**Roughly 60% of articles have no market.** The listing design treated market as
the primary filter axis; against real content that bar is nearly empty and
`housing` has zero. The 18 unclassified articles are general technical-analysis
education, which belongs to no single market.

Also verified: `seo.robots` is `[String]`; `seo.__typename` is
`RankMathPostObjectSeo`; `wp-graphql-rank-math` was missing and was installed;
no mu-plugins existed.

---

## 2026-08-18 — Architecture decision

**Headless WordPress + Next.js confirmed over a page builder.**

Reopened three times, most recently in favour of Hello Elementor. The complaint
that triggered each reopening — "the blog doesn't look like the site" — is
unfinished work, not a wrong architecture: the React component layer had never
been built. A page builder would have made the mismatch permanent by creating a
second source of design truth.

Full reasoning in `decisions.md`.
