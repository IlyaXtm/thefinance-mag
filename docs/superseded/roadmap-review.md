# Review — `thefinance-headless-wordpress-roadmap.md`

**Reviewed:** 2026-08-19
**Against:** `mag-decision-brief.md`, `mag-design-summary.md`, `layout.md`, `skill.md`, brand book
**Verdict:** Sound infrastructure roadmap. Six blocking conflicts with locked decisions, four risks, and several gaps where it doesn't meet the completed design.

---

## What this document does better than ours

Adopt these:

- **"Do not redesign the URL structure during the headless migration."** This is the single best rule in the document. Infrastructure migration and URL migration are separately risky; doing both at once makes a regression impossible to diagnose. Our roadmap didn't state it this clearly.
- **Phase 30 rollback plan and Phase 27 staging parallel run.** We had neither. A parallel run against production traffic before cutover is the right way to de-risk.
- **Phase 26 SEO regression testing with required targets.** More rigorous than our Phase 6.
- **The framing "100,000 article views must not become 100,000 WordPress requests."** Correct and worth keeping as the rendering-strategy north star.
- **Phase 24 backup strategy.** Missing from ours entirely.
- **CMS separated from the public site.** Right principle — see C4 for the caveat.

The ISR strategy table (Phase 9) matches what we decided independently. Keep it.

---

## Blocking conflicts

### C1 — Taxonomy: six taxonomies proposed, two designed

**Roadmap (Phase 5):** Market, Asset, Ticker, Company, Content Type, Topic — plus WordPress's existing Categories and Tags. That's eight classification axes.

**Design:** two. `market` (بورس ایران، طلا و دلار، کریپتو، فارکس، اقتصاد جهانی، مسکن) and `contentType` (تحلیل، گزارش، آموزش).

Taxonomy bloat is the documented failure mode of exactly this category. Competitor audit found one Persian crypto blog running 12+ overlapping categories and another running 20+ that mix crypto with cars, health, tourism, and architecture. Every axis is a decision an editor must make correctly on every article, and the content team currently doesn't even write excerpts — auto-truncated mid-sentence.

**Resolution:** ship `market` and `contentType` in R1. Add `ticker` only when InChart integration is real and there's a consumer for it. `Asset`, `Company`, and `Topic` are speculative until a feature needs them — and Topic in particular will become the same tag-soup the competitors have.

Nothing is lost by deferring: adding a taxonomy later is cheap; un-teaching editors a taxonomy is not.

### C2 — URL structure: `/mag/category/` vs `/mag/market/`

**Roadmap:** `/mag/category/<slug>` and `/mag/tag/<slug>`, preserving WordPress defaults.
**Design:** `/mag/market/<slug>`, with market as the primary navigation axis.

Both positions are defensible and they're in direct conflict. The roadmap's own rule — don't change URLs during migration — argues for keeping `/mag/category/`. The design argues that market-first organisation is the product differentiator.

**Resolution:** the roadmap's rule wins for R1. Keep existing category URLs exactly as they are. Introduce `market` as a **new taxonomy** with its own routes, and treat the market/category relationship as a mapping decision:

- If the existing categories already correspond to markets, map them and make `/mag/category/<slug>` the canonical market archive. Rename the label in the UI, not the URL.
- If they don't correspond, run both: categories keep their URLs and their SEO equity, markets get new routes with `noindex` until R2, then a planned 301 consolidation as a **separate release** with its own redirect map.

Either way this needs the Phase 0 audit output before it can be decided. Do not guess.

### C3 — Cloudflare in the stack

**Roadmap (Phase 3, stack table):** Cloudflare as CDN/WAF.

This is the most dangerous line in the document. Cloudflare's CDN and SNI have been intermittently blocked in Iran — the block targets SNI to Cloudflare IPs. Putting `thefinance.ir` behind Cloudflare risks the entire site becoming unreachable for the Iranian audience, which is the whole audience.

**Resolution:** do not front Iranian-facing traffic with Cloudflare. Use nginx with a domestic or self-hosted caching layer. If a WAF is needed, use one that terminates inside a reachable network. `macrothefinance.com` (the international/ad-facing property) is a different question and may use Cloudflare safely.

The same reachability question applies to the "Object Storage/CDN" line for media — specify the provider and verify it resolves from inside Iran before committing.

### C4 — CMS as a public subdomain

**Roadmap:** `cms.thefinance.ir` serving `/wp-admin`, `/graphql`, and media publicly.
**Decision brief:** WordPress admin should not be publicly reachable; WP sits on an internal Docker network or behind an IP allow-list.

The Patchstack 2026 report basis for that decision: 11,334 new WordPress-ecosystem vulnerabilities in 2025, 91% of them in plugins, and 46% without a vendor fix at disclosure. A public `/wp-admin` is the largest avoidable surface in this architecture.

**Resolution:** a public subdomain is acceptable **only** with all of:
- `/wp-admin` and `/wp-login.php` restricted by IP allow-list or VPN
- `/graphql` rate-limited, with mutations and preview requiring authentication
- XML-RPC disabled
- 2FA enforced on all administrator accounts

If those can't be guaranteed, keep WordPress on the internal network and reach it only from the Next.js container.

### C5 — Analytics: three stacks, two of them Google

**Roadmap (Phase 20):** GTM + GA4 + Matomo.

Three conflicts at once. GTM and GA4 are render-blocking third-party scripts, which contradicts the performance rule the design was built to ("no third-party scripts anywhere") and works directly against the product's #1 priority, Core Web Vitals. They're also Google-hosted, with the same Iran reachability and sanctions exposure as Cloudflare. And running GA4 alongside Matomo means maintaining two analytics truths.

**Resolution:** self-hosted Matomo alone, loaded deferred. If GTM is genuinely required for a marketing dependency, load it after interaction and measure its INP cost explicitly before keeping it.

### C6 — Content model contains fields that will ship empty

**Roadmap (Phase 5):** `tickerRelations`, `source`, `sourceUrl`, `reviewedBy`, `factCheckedBy`.

`reviewedBy` and `factCheckedBy` imply an editorial review process that doesn't exist. This is the same trap we already hit and corrected once: the «چرا مهم است» field was designed, then dropped after the live site showed that excerpts are auto-truncated because nobody writes them. A field that's always empty is worse than no field — it renders as a hole in the UI and it makes the schema lie.

**Resolution:** ship only fields with a confirmed producer:
- `readingTime` — computed server-side in the mu-plugin, no editorial cost ✅
- `modifiedAt` — automatic, and required by the design's revision-date rule ✅
- `market`, `contentType` — one dropdown each ✅
- `relatedArticles` — start with taxonomy-derived (Phase 19 V1), not manual ✅
- `source` / `sourceUrl` — only if translated/attributed content is actually in scope (Khabarchi boundary question)
- `tickerRelations` — deferred with the ticker taxonomy
- `reviewedBy` / `factCheckedBy` — **drop until a review process exists**

---

## Risks

**R1 — `MarketWidget` and `TickerCard` in the component list (Phase 8).**
The design explicitly excludes live market data from Mag: it's an API dependency, it invites a signal-channel reading of an anti-hype publication, and it competes with editorial content. Market data belongs in InChart. The design's cross-market element is `RelatedMarkets` — market names as links to archives, no numbers, no percentages. Remove both components or redefine them as navigation.

**R2 — Tailwind CSS without a stated token binding.**
Tailwind is fine, but the design system is a two-tier semantic token architecture with three themes (v1 navy dark, v2 dark, v2 light). Tailwind must consume those tokens via CSS custom properties — it must not introduce a parallel palette through arbitrary utilities. State this as a rule, or the "Mag doesn't match the site" problem returns through a different door.

**R3 — Repository structure doesn't follow the project convention.**
The roadmap proposes a flat `components/` directory. The documented convention is business/domain code in `src/features/<feature-name>`, shared UI in `src/shared`, route-specific UI in `_components` folders, and a feature API layer with `api/v1/*.api.ts` + `*.mock.ts` + `*.service.ts` behind a `NEXT_PUBLIC_USE_MOCK` toggle, with SWR hooks importing only from the service. See the reconciled structure below.

**R4 — No Phase 0 check for the two failure modes we already identified.**
The Discovery phase inventories content but doesn't verify: (a) the shape of the `robots` field returned by `wp-graphql-rank-math` on the installed version — the SEO layer's types depend on it, and (b) whether `/mag` is currently blocked from Googlebot in robots.txt, which is a silent, high-severity failure. Both are in `mag-phase0-verification.md`. Fold them in.

---

## Gaps — present in the design, absent from the roadmap

| Missing | Where it comes from |
|---|---|
| Reports & monthlies as a content type, plus `/mag/reports` | Design: reports band + reports index |
| `/mag/authors` index | Design: authors index page |
| Revision date (`modifiedAt`) surfaced in article meta | Design decision: evergreen content, honest freshness signal |
| Market taxonomy **description** field | Design: market archive header |
| Persian typography constraints | Design: no italic, no justify, ZWNJ, 1.9 line-height, 700px column |
| RTL constraints | Design: logical properties, chevron flipping, LTR isolation, no manual `scrollLeft` |
| Design token integration as an explicit phase | Design: three themes, `--border-interactive` and `--danger` are new system tokens |
| Accessibility floor | Design: one `<h1>`, no level skips, 3:1 focus rings, 44px targets |
| The three in-body Gutenberg blocks, scoped | Design: Callout, Disclaimer, CTA — and **only** these three |
| Newsletter CTA with its three states | Design: default / error / success, copy brand-locked |
| Self-hosted subset Persian font | Design + Iran reachability |

Phase 6 (Gutenberg Component System) is the natural home for the block scoping. It currently doesn't name which blocks, which is how a three-block library becomes fifteen.

---

## Reconciled repository structure

```
src/
  features/
    mag/
      api/
        v1/
          mag.api.ts          # WPGraphQL fetchers
          mag.mock.ts         # mock implementation, same return shape
          mag.service.ts      # single source-switch point
      queries/
        use-mag-articles.swr.ts
        use-mag-article.swr.ts
        use-mag-markets.swr.ts
        use-mag-search.swr.ts
      types/
        mag.types.ts          # Article, Market, ContentType, Author, Report
        mag-seo.types.ts      # robots: string[] — pending V1 verification
        mag-blocks.types.ts   # Callout / Disclaimer / CTA attributes
      lib/
        seo.ts                # Rank Math fields -> Next.js Metadata + JSON-LD
        blocks.tsx            # block name -> React component registry
        reading-time.ts       # display only; computed server-side in WP
      components/
        ArticleCard.tsx
        FeaturedArticleCard.tsx
        SecondaryArticleCard.tsx
        MarketChip.tsx
        ContentTypeLabel.tsx
        MarketFilterBar.tsx
        ArticleGrid.tsx
        TableOfContents.tsx
        Breadcrumbs.tsx
        AuthorBox.tsx
        RelatedArticles.tsx
        RelatedMarkets.tsx
        ReportsBand.tsx
        NewsletterCta.tsx
        ShareRow.tsx
        blocks/
          Callout.tsx
          Disclaimer.tsx
          CtaBlock.tsx

app/
  mag/
    layout.tsx                # tokens, RTL, Mag chrome
    page.tsx                  # listing
    sitemap.ts
    robots.ts
    _components/              # listing-only UI
    [slug]/
      page.tsx                # article (ISR)
      _components/
    market/[slug]/page.tsx
    author/[slug]/page.tsx
    authors/page.tsx
    reports/page.tsx
    search/page.tsx
    page/[n]/page.tsx
    not-found.tsx
    api/
      draft/route.ts
      revalidate/route.ts
```

Rules that come with it: no `fetch()` in components · no direct mock import in page files · `mag.service.ts` is the only source-switch point · switching mock ↔ real is an env change, not a refactor · pages orchestrate sections and hold no business logic.

---

## Reconciled execution order

The roadmap's 24-step order is sound but reaches visible output around step 8. Two changes:

1. **Fold the token integration in early**, before the article renderer. Building components against placeholder tokens and swapping later means touching every component twice — and all six design artifacts are currently on a placeholder layer.
2. **Move content-team enablement earlier.** The roadmap has no explicit training or acceptance step. The hard test stands: a content team member publishes a complete article, including disclaimer and CTA, with zero developer help. If that fails, the answer is a larger block library — not an architecture change.

```
00 Discovery + SEO/URL baseline + robots.txt and GraphQL schema verification
01 Infrastructure (nginx, Docker, no Cloudflare on Iranian-facing traffic)
02 Headless WordPress + hardening
03 Content model — market, contentType, readingTime, modifiedAt ONLY
04 WPGraphQL layer + schema verification
05 Design token integration + Persian font pipeline
06 Next.js foundation + feature scaffolding against mocks
07 Article renderer
08 Archive / author / search / reports pages
09 SEO layer + canonical + sitemap + structured data
10 Gutenberg blocks — Callout, Disclaimer, CTA only
11 Preview + revalidation
12 Content team enablement + unaided-publish test
13 Analytics (Matomo, deferred)
14 Performance + security
15 QA + SEO regression
16 Staging parallel run
17 Backup + rollback test
18 Production cutover
19 Monitoring
20 Product integrations / entity layer / semantic search
```

---

## Decisions needed before frontend work starts

1. **Market vs category URLs** — depends on the Phase 0 audit. Do existing categories map to markets?
2. **Cloudflare** — confirm it's off the Iranian-facing path, and name the media CDN.
3. **CMS exposure** — public subdomain with hardening, or internal-only?
4. **Analytics** — Matomo only, or is GTM a hard marketing dependency?
5. **`reviewedBy` / `factCheckedBy`** — is there a review process, or do these get dropped?
6. **Real design token identifiers** — still outstanding. All six design artifacts are on a placeholder layer.
7. **`اخبار` / Khabarchi boundary** — still open, and it determines whether `source`/`sourceUrl` are in scope.
