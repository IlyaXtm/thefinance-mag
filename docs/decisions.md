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

---

## Repository

**Flat structure, not a monorepo.** One app; `apps/web/` would add a level for
nothing. Matches the convention used by the other products.

**Independent of `codex/phase0-foundation`.** This branch makes its own
structural choices. If both tracks continue, one has to win or they have to
merge — worth deciding before the work diverges further.
