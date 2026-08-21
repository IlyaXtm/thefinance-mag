# Changelog

What changed, when, and why. Entries are newest first.

Ordinary commit messages say what happened; this records the reasoning, so a
decision doesn't get quietly reversed six months later by someone who can't see
why it was made.

---

## 2026-08-21 — Containerised, and a staging host

Step 1 of the cutover. Nothing was deployed — the build sandbox reaches neither
Docker Hub nor the frontend server — so this is the reviewable artifact set plus
what could be verified without them. `docs/infra/frontend-deploy.md` is explicit
about which is which.

**The frontend nginx config is in the repository now.**

It previously existed only on the server, which meant the cutover — the riskiest
single action in this project — depended on a file nobody could review, diff or
roll back. `thefinance.ir.conf` and `new.thefinance.ir.conf` fix that.

The cutover is deliberately one line: the port in `set $mag_upstream`. A
variable rather than two commented `proxy_pass` lines, so switching under
pressure is one edit and a reload rather than a two-line dance where half a
change is a broken site. Rollback is the same line back. Both were exercised
against a running nginx, in both directions.

Both configs set `X-Real-IP` from `$remote_addr`, and that is load-bearing
rather than boilerplate: the comment rate limit keys on it precisely because
`X-Forwarded-For` is built with `$proxy_add_x_forwarded_for` and so begins with
whatever the client sent. Verified through nginx — a spoofed `X-Forwarded-For`
was still limited on the fourth request.

**Staging is a host, not a path prefix.**

The brief asked for a staging path. `basePath: '/mag'` is inlined at build time,
so an image served under `/mag-staging/` still emits links to `/mag/...` — which
on that server is WordPress. Staging would render once and then navigate into
production on the first click. A path prefix needs a second image with a
different basePath, at which point staging is no longer testing the artifact
that gets promoted. `new.thefinance.ir` was already the documented staging host.

The whole staging host is `noindex, nofollow` and serves nothing but `/mag`.
Staging carries the same articles as production, so a leak into the index means
the same content competing with itself — and like the CMS-host case, it fails
silently because every page renders perfectly throughout. Verified in both
directions: staging noindexed, production carrying no such header.

**`NEXT_PUBLIC_*` moved to server-only names.**

Raised in the brief as possibly awkward for the pipeline, and it was: those
variables are inlined at build time, so "env comes from a file on the server"
and `NEXT_PUBLIC_` are in tension. `USE_MOCK`, `WP_GRAPHQL_ENDPOINT` and
`SITE_ORIGIN` are now read server-side first, with the public names kept as
fallbacks so an existing deployment keeps working. Confirmed nothing reading
them reaches the browser — the SWR hooks that import the data service are
referenced by no rendered component, and the endpoint appears in no client
chunk. The public prefix was buying nothing and only invited the value into a
client bundle later.

What renaming does NOT fix, recorded so it is not rediscovered: `SITE_ORIGIN`
is baked into prerendered HTML regardless, because canonical and `og:url` are
written at build time. It does not bite here because all three values are the
same in staging and production — canonicals must name the production origin
even when staging serves the page — so the image stays portable and staging
validates byte-for-byte what production will run. It would bite on review-apps
with a different origin each, which is why the Dockerfile takes them as build
args.

**The Dockerfile copies three things, and two of them are easy to miss.**

`public/` and `.next/static` are not inside `.next/standalone`. A Dockerfile
that omits either serves HTML with no CSS, no JavaScript and no font — which
reads as a broken build rather than a missing copy step. Verified by
reconstructing the runtime stage on disk and running `node server.js` against
it: every route served, and the hashed stylesheet and the IRANYekanX woff2 both
returned 200.

The healthcheck hits `/mag/health`, which reports the data SOURCE and not just
liveness. A container quietly serving mock data in staging is a
misconfiguration that would otherwise look perfectly healthy.

---

## 2026-08-21 — Lead slot, feed, and cacheable archives

Four items from `audit-seo-security-performance.md`. The fourth — the Next 16
upgrade — was deliberately not done; see the end of this entry.

**The lead slot no longer carries news.**

An RSS automation files roughly two «اخبار» items a day. The index led with the
newest article, so the hero was almost always a three-minute translated
headline — meaning a publication whose identity is analysis and education would
never show either in the largest editorial statement on its front page. Because
the automation runs daily, that degrades on its own rather than correcting.

The featured article is now chosen from `analysis`, `education` and `report`.
News keeps its place in the latest list and the archive; it just never takes
the hero.

The selection window is the newest 20 rather than the newest 7, because the
window has to outrun the automation: at two news items a day, 20 covers about
ten days of uninterrupted filing before a genuine article could fall out of
range. The same request feeds the latest list, so widening it costs no extra
round trip. The API has no "not this type" filter, and inventing one against a
field WordPress doesn't expose would be worse than filtering a window already
fetched.

Accepted cost, stated so nobody treats it as a bug: with infrequent human
publishing the lead can go stale for weeks. A good article from last week beats
an automated headline from this morning.

If the window somehow holds nothing but news there is no hero at all and the
page opens on the latest list — verified by building with an empty type list.
Falling back to a news item would defeat the rule this exists to enforce.

**`/mag/feed` exists again.**

WordPress generates `thefinance.ir/mag/feed` today; readers, aggregators and
Telegram bots consume it. After cutover the Next app had no such route, so it
404'd — and it breaks **silently**: a subscriber sees no error, just no new
articles, for months, by which point they are gone. A 404 where content used to
be is a regression whether or not anyone is currently subscribed.

RSS 2.0 from the same `getArticles` everything else uses, newest 20, absolute
`thefinance.ir/mag/…` URLs by construction, cached like the index rather than
rebuilt per request.

Item descriptions are built from the article's own H2 headings, for the same
reason «در این مقاله» is: the content model has no excerpt, deliberately, since
the live site's excerpts are auto-truncated mid-sentence. Headings are derived
from real content, always accurate, and descriptive rather than promotional.

Autodiscovery took a second pass. Declaring it once in the root layout did not
work: Next **replaces** a page's `alternates` object wholesale rather than
merging its sub-fields, so every page that set `canonical` silently dropped the
layout's feed link. It now comes from `feedAlternate()` in `lib/site.ts`,
applied by `toMetadata` and by the two routes that build metadata directly.

We could not check whether anyone currently subscribes — the old frontend
server is unreachable from the build environment, so the nginx access-log
counts in the brief still need running by someone with shell on that box.

**Pagination moved back into the path, so archives can be cached.**

This corrects an earlier decision of ours rather than defending it. The archive
was built with `?page=` because the content-type filter needed a query string
anyway. What that missed: reading `searchParams` makes a Next route fully
dynamic — the server cannot know which query strings will arrive, so it cannot
prerender. Market and author archives were consequently uncacheable, running a
GraphQL query against a `/graphql` that nginx limits to 10 r/s for a page-one
view identical for everybody.

The two concerns are now split: the page number is part of the resource's
identity and lives in the path; a filter is a view over that resource and stays
in the query string. Page one keeps the base URL — `/archive/page/1` and its
siblings 404, because two URLs for one page is a duplicate-content problem.

Result in the build output:

| route | before | after |
|---|---|---|
| `/market/[slug]` | `ƒ` dynamic | **`●` SSG**, all six prerendered |
| `/author/[slug]` | `ƒ` dynamic | **`●` SSG** |
| `/archive` | `ƒ` dynamic | `ƒ` — see below |

`/archive` stayed dynamic and the reason is worth recording, because it will
come up again: **one route cannot be both static and `searchParams`-reading.**
Awaiting `searchParams` at all opts a route out of prerendering, so `/archive`
cannot be static while also serving `/archive?type=education`. Making it static
requires the type filter to leave the query string too — a product decision
about URL shape, not a technical one. Moving the page number out was still
worth doing on its own: it is what made market and author static.

Both archives also needed `generateStaticParams` on top of the path change. A
dynamic segment without it is treated as fully dynamic no matter what
`revalidate` says — the same defect the article route had.

Two things this change nearly broke, caught before they shipped:

- Search paginates by query string on purpose and has no `/search/page/[n]`
  route. Switching the shared href builder pointed its pagination at a 404.
  Search now uses `pageParamHref`, which keeps `?page=` — it reads `q` so it is
  dynamic regardless, and it is `noindex`, so neither reason for the path shape
  applies to it. A `/search/page/[n]` would be a route that exists only to look
  consistent.
- Pagination was untestable locally. Seven hand-written fixtures against page
  sizes of nine and fifteen meant there was never a page two in development —
  which is exactly how the previous round of pagination bugs survived. Added
  generated filler so the boundary can actually be crossed, clearly marked and
  dated older than every designed fixture so it never displaces a real one.

**Next 16: deliberately NOT upgraded.**

Three high-severity advisories sit in Next's own dependency tree and the only
fix is a major bump. The exposure assessment stands: postcss is effectively
nil, since only our own CSS is ever compiled; sharp is genuinely reachable
through `next/image` at request time, narrowed to an authenticated editor
uploading a malicious image because the optimizer only accepts our own hosts
(verified — every SSRF shape tried returns 400).

Not now, because the upgrade brings Turbopack as default, async `params` and
changed `next/image` defaults, and there is currently nowhere to find out what
breaks: staging does not exist yet. When it does, as its own change with its
own test pass, then re-run the full audit sweep against it.

Carried context for whoever does it: the `middleware.ts` → `proxy.ts` rename
followed CVE-2025-29927, where a single header bypassed every middleware
authorisation check, and CVE-2025-66478, the RCE that prompted our own bump
from 15.1.0. That layer is for routing at the network boundary — not auth, not
data access. If redirects are ever added they go in `proxy.ts` and contain
nothing else.

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
