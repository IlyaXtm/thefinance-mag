# Decisions

Each entry records what was decided and why. Rationale matters more than the
outcome — without it, settled questions get reopened. This architecture
decision was reopened three times before it was written down.

---

## Architecture

**Headless WordPress + Next.js, not a page builder.**

Reopened three times, most recently in favour of Hello Elementor. Settled
against it. The complaint that triggered each reopening — "the blog doesn't
look like the site" — is unfinished work, not a wrong architecture: the React
component layer was never built. A page builder would make the mismatch
permanent by creating a second source of design truth that diverges from the
redesign on every change.

Priorities were ranked: SEO/CWV, redesign consistency, launch speed, lowest
maintenance. Headless wins the first, second and fourth outright.

A hand-written classic theme (no builder) is a more respectable alternative
than Elementor and most of the anti-builder arguments don't apply to it. It
still loses on one thing: the site shell — header, footer, auth state, theme
switcher — lives in Next.js, so a theme would have to reimplement all of it in
PHP and keep it in sync forever.

**Revisit if:** editors still can't publish unaided after training and an
expanded block library, or frontend capacity drops to zero.

---

## Infrastructure

**Iranian server, ArvanCloud CDN. No Cloudflare on Iranian-facing traffic.**

Cloudflare's SNI has been intermittently blocked from Iran. Fronting
`thefinance.ir` with it risks making the site unreachable for the entire
audience. Applies to media/CDN paths too.

**CMS on its own VPS, public subdomain with hardening.**

WordPress is the largest attack surface in this architecture — 91% of disclosed
WordPress-ecosystem vulnerabilities are in plugins. Isolating it means a
compromise stays contained.

A public subdomain rather than an internal-only network is an operational
choice: editors need to reach `wp-admin` from arbitrary networks, and requiring
VPN would break the content-team enablement phase. The trade is mandatory
hardening — `noindex`, rate limiting, 2FA, `xmlrpc` disabled, WordPress bound
to localhost behind nginx.

**Matomo self-hosted as the analytics source of truth.**

GTM and GA4 are render-blocking third-party scripts working directly against
the #1 priority, and Google-hosted services are unreliable from Iran — you'd
pay the performance cost and might not get the data. If GTM has a named
marketing dependency, load it post-interaction and measure its INP cost before
keeping it.

**`siteurl` stays at `https://thefinance.ir/mag`.**

Rank Math derives canonicals from it, so leaving it there means canonicals are
correct with no rewriting. Moving it to the CMS host would require rewriting
every canonical in the SEO layer.

---

## Content model

**Only fields with a confirmed producer.**

`market` (optional) · `contentType` (existing `category`) · `readingTime`
(computed server-side) · `modifiedAtIso` · market `description` (may be empty).

Deliberately excluded: `reviewedBy` and `factCheckedBy` (no review process
exists — the fields would ship empty), `tickerRelations`, `source`/`sourceUrl`,
and `Asset`/`Company`/`Topic` taxonomies.

**Two taxonomy axes, not six.**

An earlier plan proposed Market, Asset, Ticker, Company, Content Type and Topic
— eight axes counting WordPress's own. Taxonomy bloat is the documented failure
of this content category: one Persian crypto blog runs 12+ overlapping
categories, another runs 20+ mixing crypto with cars, health and tourism. Every
axis is a decision an editor must get right on every article, and this content
team doesn't currently write excerpts. Adding a taxonomy later is cheap;
un-teaching one is not.

**Market is optional and currently secondary.**

Roughly 60% of the archive is market-agnostic technical-analysis education. The
market filter is nearly empty against current content, so `contentType` is the
visible filter axis for now and the market bar shows only terms with
`count > 0`. The multi-market architecture is right; the content isn't there
yet.

---

## Design

**Organise by market, not by a sprawling topic taxonomy.** Multi-market
coverage is the actual product differentiator and matches how a reader with a
portfolio thinks. (Deferred in practice — see above.)

**«چرا مهم است» dropped, replaced by «در این مقاله».** The original signature
was an editor-written line explaining why a piece matters. The live site's
excerpts are auto-truncated mid-sentence, which says the content team doesn't
write summaries today — a new mandatory field would ship empty. The replacement
shows two or three of the article's own `<h2>` headings, derived server-side
from content that already exists, always accurate, and inherently anti-hype
because headings describe rather than promote.

**Absolute Jalali dates, plus a revision date when it differs.** Much of Mag is
evergreen educational content; «۲ روز قبل» makes a still-valid article look
stale. A revision date is the honest version of the freshness signal
competitors fake.

**One Callout variant, not four severity colours.** Four options means an
editor chooses correctly once and wrongly three times.

**Disclaimer copy is fixed and not editor-editable.** Signal-selling is
prohibited under Iranian securities law. This is legal protection, not brand
voice.

**Share uses native links only.** Third-party widgets are render-blocking, leak
user data, and several are unreachable from Iran.

**No live price data anywhere in Mag.** An API dependency that invites a
signal-channel reading of an anti-hype publication and competes with editorial
content. Market data belongs in InChart. The cross-market element is
`RelatedMarkets` — market names as links, no numbers.

**Deliberately absent, and recorded so nobody re-adds them:** view counts,
comment counts, trending sections, urgency badges, flame iconography, follower
counts, superlative author claims, "did you mean" suggestions. Their absence is
the position — the entire competitive category competes on exactly these.

---

## Content model

**CMS-injected navigation chrome is stripped at the mapping layer.** Decided
2026-09-08.

`easy-table-of-contents` hooks `the_content`, WPGraphQL runs `the_content`
filters, and the plugin's list therefore arrives inside the article body. A
headless frontend owns its own layout: a plugin that decides where navigation
goes is data the mapper drops, the same way it drops `text-align: justify`.

The general rule: **the body is content, not chrome.** Anything a CMS plugin
injects around the content — contents lists, share bars, related-post blocks,
author boxes — is stripped on the way in and rendered by the frontend or not at
all. Two systems both deciding where a table of contents goes is how an article
gets two of them.

Deactivating the plugin is cleaner and remains the recommended follow-up. It was
not done because it would break any article using `[ez-toc]` explicitly and
that could not be audited. **When it is done, the strip stays** — as a guard,
not as the fix.

**The table of contents is H2 only.** Both `extractHeadings()` and the
mu-plugin's `outlineHeadings` collect h2 and nothing else. A three-level list on
a 41-minute read is a wall, and the panel is already height-capped with internal
scrolling because 24 entries fill it. A nested ToC is a design change with a
scroll and a density problem attached, not a regex edit.

---

## Pagination

**A page number belongs in the path; `?page=N` is a compatibility surface.**
Decided 2026-09-08; extends the URL-shape rule below.

`?page=N` used to return 200 with the content of page one, because Next ignores
a parameter no route reads — an unbounded set of distinct URLs serving identical
content, which is worse than a 404 because Google indexes it. It now 301s to the
path route, in middleware, so the rule lives in one place rather than in four
route files.

`/search` is the exception and must stay one: it paginates by query string on
purpose, because a search URL is already query-shaped and noindex either way.

**Middleware does not fetch data to decide a redirect.** A page number past the
last one redirects and then 404s at the destination. Knowing the last page at
the network boundary would mean querying the CMS on every request, which is
exactly what that layer must not do — its worst failure has to stay "a wrong
destination".

---

## Brand assets

**The logo is inline SVG with `currentColor` ink, not two theme files.**
Decided 2026-09-07.

The official pack ships a dark lockup and a light one that differ only in the
ink — #FFFFFF against #0B1120. Picking between them would require the header to
know the theme, and it cannot: the theme is applied pre-paint from localStorage,
after the server has rendered. One asset that inherits the surrounding colour
has no such problem.

The three blues (#0163E1 · #10A5F5 · #00DBFF) stay literal and do NOT become
tokens. They are the mark, the brand rules forbid recolouring it, and it must
read identically on all three themes — the same reasoning that keeps
`--scrim-*` and `--on-media` from flipping. A logo is artwork, not a themed
surface, so this is not a hardcoded-colour violation.

Inline rather than `<img>` for two reasons: «مجله» is a live `<text>` node and
an externally-loaded SVG cannot reach the page's fonts, and the header logo
stays markup on the LCP path rather than a request that can 400.

**The typeface in the logo is IRANYekanX, overriding the asset's own README.**
The pack specifies Vazirmatn Light and supplies a Google Fonts `<link>`. Both
are refused: the typeface is fixed product-wide by CLAUDE.md — Blog v4 shipped
Vazirmatn and it was reverted for exactly this reason — and no Google Fonts or
foreign CDN may sit on the critical path of a site served from Iran behind
ArvanCloud. `font-family: inherit`, weight 300, a real instance of the variable
face. To match the drawing exactly, outline the word in IRANYekanX; never load
a second face.

---

## Sticky sidebars

**`position: sticky` goes on the grid item, never on a child of it.** Decided
2026-09-07.

A sticky element travels only within its containing block. Under
`items-start`, a grid item is exactly as tall as its content — so a sticky
panel nested inside one has zero travel and silently does nothing. A sticky
GRID ITEM resolves against its grid area, which spans the row.

The table of contents carried `sticky top-[76px]` for weeks and never moved,
because it was the panel inside the item rather than the item. Nothing errors
and the class reads correctly, so this is not visible in review — only in a
measurement of `getBoundingClientRect().top` while scrolled.

Both sidebars on the post page now use the same shape. Two sidebars in one grid
with two positioning strategies is how the last one drifted.

---

## Design system additions

Three items surfaced during Mag that are **system-level**, not Mag-local. Left
unfixed, the rest of the product carries the same defects.

**`--focus-ring` fails in the light theme.** The dark-theme blue was reused
across all themes. Measured against WCAG 2.2 SC 1.4.11 (3:1 for focus
indicators): v1 navy 6.84, v2 dark 6.95, **v2 light 2.85 — fail**. Keyboard
focus is effectively invisible on light. Fix is the darker accent (6.12).

**`--border-interactive` is a missing token.** Interactive control boundaries
need 3:1. `border-subtle` measures 1.28 and `border-strong` 1.68 — neither
suffices, hence a third token.

**`--danger`** for form validation. All proposed values clear 4.5:1
comfortably.

---

## Migration

**Do not change URLs during the headless migration.** Infrastructure migration
and URL migration are separately risky; doing both at once makes a regression
impossible to attribute. Confirmed unnecessary anyway: the permalink structure
is `/%postname%/`, so nothing changes.

**The old WordPress theme is never deleted.** It's the rollback path. While
WordPress can still render `/mag`, reverting the cutover is an nginx upstream
change and a reload — seconds rather than a redeploy.

**Media URLs never change.** Existing images are at
`thefinance.ir/wp-content/uploads/...`. The public path stays and nginx proxies
it to the CMS host, so image indexing and external hotlinks survive. The proxy
must strip the upstream `X-Robots-Tag`, or images inherit the CMS `noindex` and
drop out of Google Images.

**MinIO deferred to a later release.** Worth doing eventually, behind the same
unchanged path with a fallback to the WordPress disk so migration is a
background copy with no cutover moment. Not now: R1 changes one variable, and
offload plugins rewrite attachment URLs in the database — precisely what's
being protected.

---

## Mobile navigation

**A scrollable category strip, not a drawer.** Decided 2026-09-06.

Below `lg` the header carried the logo, a search icon and the theme toggle and
nothing else. Every section was reachable only from the footer — roughly
4,000px of scroll down the home page.

The standing note against a hamburger said: *"with two links, a drawer costs a
tap, a JS bundle, a focus trap and a motion-preference case, all to hide two
words."* That was right for two links. There are five, and the argument does
not carry at five.

But the note is also the reason the answer is a strip rather than a drawer:
**every cost it lists is a cost of hiding things.** The tap, the JavaScript,
the focus trap, the `prefers-reduced-motion` case — all of them exist because a
drawer conceals. A horizontally scrollable row pays none of them, because it
conceals nothing. It is markup and one CSS property, and the links are visible
rather than behind an affordance.

Native `overflow-x` handles RTL direction on its own; no `scrollLeft`
arithmetic, whose sign differs across browsers. The edge fade is `mask-image`
rather than a coloured gradient, so it works over any theme's surface without
knowing which.

**The newsletter CTA is last in the strip**, not first. It is a primary header
action on desktop and was absent below `sm` entirely, so it needed a home — but
putting a conversion button ahead of the navigation on the narrowest screens is
the pattern the brand book rules out. It is reachable by scrolling the strip
rather than being the first thing a reader meets.

---

## URL shape

**`trailingSlash` stays off.** Decided 2026-09-06; closes backlog B0b.

WordPress's `/%postname%/` serves `/mag/<slug>/` with a trailing slash, and the
Next app serves the slash-free form and 308s the other. So the trailing slash
changes at cutover for every indexed URL — which is the one thing this release
was supposed to avoid, and it is why the question was opened.

Setting `trailingSlash: true` would have matched WordPress exactly and cost no
redirect. It was rejected anyway: **a 308 passes full link equity and costs no
ranking**, so the price of the extra hop is one round trip, not position. The
alternative price was a slash on every canonical, every sitemap entry, every
internal link and inside `magUrl()` — a product-wide URL-shape change, taken on
during the release where the least should change.

One hop on a URL Google already has beats reshaping every URL the product will
ever emit. Do not set `trailingSlash: true`.

**A taxonomy filter that should be indexed gets a path, not a query string.**
Decided 2026-09-07; closes backlog B0c.

Reading `searchParams` opts a Next route out of prerendering entirely. So
`/mag/archive?type=education` is dynamic on every request and can never become a
static page — which put «آموزش», 41 of 53 articles, behind the one URL shape the
build cannot prerender. `/mag/category/<slug>` is the same list at a path, and a
path segment is part of the resource's identity, so it is static ISR.

The rule generalises: **a filter that is a view over a resource may stay in the
query string; a filter that names a body of content must be a path.** The page
number moved out of `?page=` for the same reason, one release earlier.

`?type=` still answers and 308s to the path route. It is a compatibility
surface, not an address.

**Categories are read from the CMS; the nav is not.** Every category the
taxonomy holds gets a route, prerendered and sitemap-listed, with no deploy —
`generateStaticParams` reads the live list. `CATEGORY_NAV` stays five
hand-picked links. A route is not a nav slot: rendering the CMS's list in the
header would put «مقالات» — 39 posts, a catch-all tag nobody chose as a section
— at the top of every page for being large, and would hand an editorial decision
about the top of every page to whoever adds a term.

**A taxonomy archive under 8 articles is not indexed.** Below the floor it stays
out of the sitemap AND carries `noindex, follow` — both, because a URL kept out
of the sitemap is still reachable from the links on every page, so a
sitemap-only exclusion is decorative. The page still renders and is still
linked; only the indexing claim is withdrawn, and it returns on its own when the
archive grows.

The floor applies to markets too, and today it de-indexes all six, including the
three in the header nav. That is the intended behaviour, not an oversight: a
market archive holding two articles IS thin. The cause is that 39 of 53 articles
carry no market — a tagging backlog (B17), not something the floor should be
bent to hide.

---

## Repository

**Flat structure, not a monorepo.** One app; `apps/web/` would add a level for
nothing. Matches the convention used by the other products.

**Independent of `codex/phase0-foundation`.** This branch makes its own
structural choices. If both tracks continue, one has to win or they have to
merge — worth deciding before the work diverges further.
