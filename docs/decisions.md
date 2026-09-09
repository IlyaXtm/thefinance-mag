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

**NEVER DEFINE `WP_SITEURL` ON THIS INSTALL.** Tried on 2026-09-09, to make
admin URLs resolve to the CMS host. The GraphQL endpoint stopped returning JSON
and started returning **the blog archive as HTML** — the WPGraphQL route is
registered relative to `siteurl`, so moving `siteurl` moves the endpoint out
from under the frontend.

The magazine kept serving for several minutes from the ISR cache and nobody
noticed, which is worse than an outage that announces itself: the window in
which this looks fine is exactly the window in which it gets committed.
Reverted from a `wp-config.php` backup.

It will be reached for again — it is the obvious lever whenever admin URLs are
wrong, and the rule above (`siteurl` must stay public for canonicals) does not
by itself explain why the constant is dangerous. The admin-URL problem has a
different answer; see the next entry.

**The admin lives on the CMS host through FILTERS, never through core
constants.** `siteurl` is public, so every admin URL WordPress builds from it
points at a path Next.js now serves — a 404 for the editor. The fix is
`wordpress/mu-plugins/tf-admin-host.php`, rewriting admin, login, asset and
media-library URLs to `wp.thefinance.ir` while leaving `siteurl` alone. The
filters are documented in that file and are not re-listed here.

Two findings from building it generalise beyond WordPress, and both are why the
file cannot be trimmed:

**A per-source URL filter only catches what was registered with an ABSOLUTE
URL.** jQuery is not, and without jQuery every admin script fails. That is why
`tf-admin-host.php` also runs an output buffer over the finished admin HTML —
one pass that cannot miss a source, after thirteen filters that each can. The
buffer looks redundant next to the filters and removing it breaks the admin.
Same shape as an invariant sweep that passes because it only ever saw
well-formed cases: a check that sees only the registered URLs reports clean.

**A relative path cannot be filtered in PHP at all** — there is no host to
rewrite. `wp.ajax.settings.url` prints as `/mag/wp-admin/admin-ajax.php`, so the
media library sent every request to a path Next.js owns and got a 404: an empty
library, and no uploading from inside an article. Two halves, neither sufficient
alone — `wp_add_inline_script` after `wp-util`, which is where `wp.ajax` is
defined (`admin_print_scripts` runs too early and the value was overwritten
again), AND `rewrite ^/mag(/wp-.*)$ $1 last;` at server level on the CMS host,
for everything else WordPress builds the same way.

**`--locale=fa_IR` on every `wp core download`.** A `--force` download without it
put English core files on a Persian install: 31 `wp is not defined` errors and
the whole admin JavaScript dead, because the JS translation files no longer
matched core. `wp core verify-checksums` confirms the repair.

(The 404 that prompted the download was for `wp-admin/css/colors/fresh/`, which
does not exist — `fresh` was removed in WordPress 7.1 and `modern` replaced it.
The missing file was not the problem it looked like.)

**Config sync runs repo → server, never the reverse.** A sync on 2026-09-09
found the server's nginx carrying `location = /graphql` where the repo had
`location = /mag/graphql`. `=` is an exact match, so it had never fired: the
GraphQL rate limit had been configured for months and applied to nothing.

Before committing anything taken FROM a server, read `git diff` for what
DISAPPEARS, not for what arrives. That same sync found rules living only on the
server — public-page 404s, an `?author=` enumeration guard — which had to be
added to the repo rather than overwritten by it.

**A rate limit is for scrapers, and a build must never be what it stops.**
`limit_req zone=graphql burst=20` went live and the next production build failed
with `GraphQL responded 503` — measured, 21 of 40 concurrent requests rejected,
because Next prerenders 82 pages in parallel. Raised to `burst=200`: 40 of 40
answered 200.

The build is the only legitimate caller that bursts this hard. Any limit on an
endpoint the build reads has to be sized against the page count, and the page
count grows with the archive.

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

## Navigation

**One control, one taxonomy.** Decided 2026-09-09.

Content types are flat links in the header; markets are behind a disclosure
labelled «بازارها». Mixing them in one row — which is what shipped — gives a
reader two axes with nothing to say they are different, and it is the same
defect the filter chips had. The fix in both places is to NAME the axis, never
to merge them: `decisions.md` chose two axes over six because taxonomy bloat is
this category's documented failure, and a nav that blurs them undoes that
quietly.

**The masthead links to the magazine.** Every publication's masthead links to
that publication's home. The route back to the main site is a separate, quieter
link at the end of the row — an exit, not a destination the magazine promotes,
and exactly one of them, because InChart, Academy and Paradigm live in the
footer and a header full of products is not the magazine's navigation.

**A thin section shows its count; an empty one is suppressed.** Four of six
markets hold fewer than three articles. Showing «طلا و دلار ۱» sets an honest
expectation before the click; hiding the thin ones would make the menu change
shape as articles are tagged, which is confusing in a worse way. Zero is
different — a link to nothing is not a promise worth making, and it returns on
its own when the term has an article.

**The nav is hand-picked, and this is why.** It is not derived from what the CMS
returns. A route is not a nav slot: «مقالات» has 39 posts and stays out because
it is a catch-all tag nobody chose as a section, and «گزارش» stays out because
the category does not exist yet.

---

## Wide content

**Nothing in the article body may be wider than the body.** Decided
2026-09-09.

Anything that can exceed the column — a table, a `pre`, an embed, an element
with an inline pixel width — either scrolls inside its own `overflow-x: auto`
box or is clamped to `max-width: 100%`. The page body never scrolls sideways.

Clamp in CSS, do not strip in the sanitizer: an author's deliberate
`width: 60%` is intent, and stripping every width would destroy it to fix a
`width: 900px` that CSS can simply cap.

**Fixtures are not evidence about real bodies.** A twelve-route, fifteen-width
sweep reported no overflow while production scrolled sideways, because every
fixture body was written against this design and real ones are not. When a
check covers content, it has to run against content shaped like the real thing —
`check-invariants.mjs` carries fixtures built from migrated markup for exactly
this reason, and names the offending element rather than reporting a number.

---

## Hero proportion

**The hero is bounded by width, not by a height cap.** Decided 2026-09-09;
closes backlog B19.

A height cap with `object-fit: cover` crops, and the crop lands worst on the
most common image: measured, a 480px cap takes 33% off a 1200×630 that
currently loses nothing. Constraining the hero to the title block's measure
produces a shorter hero with no new cropping at all, because the per-image
aspect clamp already does the work at any width.

**Never crop through baked-in text.** Several featured images have the headline
in the artwork. Until where that text sits has actually been measured (B14), any
treatment that crops is a guess, and the width constraint is the treatment that
does not need the answer.

Desktop only. Mobile keeps full width and natural ratio.

---

## Missing media

**A missing image leaves no trace.** Decided 2026-09-09.

No placeholder, no icon, no alt text sitting alone. A reader who sees a broken
image learns the site is broken; a reader who sees clean text learns nothing,
which is correct, because the missing image was never load-bearing.

The one exception is a CARD THUMBNAIL, which keeps its reserved box: its
neighbours in the grid have images, and a card that loses its box makes the row
reflow. Everything else — hero, in-body figure — is removed entirely, so a dead
image and an absent one look identical to a reader.

**Never substitute.** No category cover, no gradient, no generated art. An
invented image is worse than none: it tells the reader something about the
article that nobody wrote.

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

**But only ONE WordPress may be REACHABLE, and the rollback install is not
free.** On 2026-09-09 a `location ^~ /mag/wp-admin/` block was pointed at the
old Jannah install on port 9080 while fixing admin assets. Every editor who
opened `thefinance.ir/mag/wp-admin/` was then writing into **the wrong
WordPress** — an installation no longer connected to the site.

One article was published that way (`best-crypto-wallets`, ID 2284) and 404'd on
the live site. It was recovered with `wp export` and re-imported; its featured
image did not survive the import.

So the rollback install stays on disk and is `docker stop`ped, not running. Two
reachable installs means one of them eventually swallows content, and the
discovery takes days because NOTHING FAILS — the editor sees a successful
publish. Kept a few weeks to confirm nothing depends on it, then removed; B26.

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
