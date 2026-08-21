# Mag — Frontend Build Plan

**Date:** 2026-08-19
**Prerequisite:** design complete (six artifacts, all audited)
**Agents:** `mag-frontend`, `mag-seo`, `mag-wordpress`, `mag-reviewer`

---

## Decisions locked

| Decision | Value |
|---|---|
| CDN | Iranian server + ArvanCloud. **No Cloudflare on Iranian-facing traffic.** |
| CMS host | `wp.thefinance.ir`, public subdomain **with mandatory hardening** |
| Public host | `thefinance.ir/mag` — all SEO equity accrues here |
| Analytics | Matomo self-hosted is the source of truth. GTM/GA4 only if a named consumer exists, loaded post-interaction, INP cost measured. |
| Content model | `market`, `contentType`, `readingTime`, `modifiedAt`, market `description` — nothing else |
| Dropped | `reviewedBy`, `factCheckedBy`, `tickerRelations`, `اخبار`, `Asset`/`Company`/`Topic` taxonomies |
| URL structure | **Unchanged during migration.** Market/category mapping is a separate release, decided from the Phase 0 audit. |

---

## S0 — Verification (~half a day) · `mag-wordpress` + `mag-seo`

Nothing is built until these are facts.

```bash
# GraphQL schema — the robots field shape decides the SEO layer's types
curl -s https://wp.thefinance.ir/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first:1){ nodes { seo { __typename title description canonicalUrl robots breadcrumbs { text url } jsonLd { raw } openGraph { title twitterMeta { card } } } } } }"}' | jq .

# Plugin versions
docker compose exec wordpress wp plugin list --allow-root \
  --format=table --fields=name,status,version

# mu-plugin safety
docker compose exec wordpress sh -c \
  'for f in /var/www/html/wp-content/mu-plugins/*.php; do echo "-- $f"; php -l "$f"; done'

# Indexability — production must NOT block /mag; wp subdomain MUST be noindex
curl -s  https://thefinance.ir/robots.txt
curl -sI https://thefinance.ir/mag/    | grep -i 'x-robots-tag\|^HTTP'
curl -sI https://wp.thefinance.ir/     | grep -i 'x-robots-tag'

# What already exists content-wise
docker compose exec wordpress wp taxonomy  list --allow-root --format=table
docker compose exec wordpress wp post-type list --allow-root --format=table
```

Also: URL audit — do existing categories correspond to markets? This decides the market/category question, and it cannot be answered by guessing.

**Exit:** `robots` shape confirmed · `/mag` crawlable · `wp.` noindexed · mu-plugins parse and load · category→market mapping known.

---

## S1 — Tokens and font (~3 days) · `mag-frontend`

Blocked on: real token identifiers from the redesign repo. Resolve with a grep — this is still outstanding and it gates everything visual.

- Map the design artifacts' semantic role names to real token identifiers
- Add the three system tokens: `--border-interactive`, `--danger`, and the light-theme `--focus-ring` fix
- Self-hosted subset Persian font via `next/font`, preloaded, `font-display: swap`
- Throwaway test route exercising every token and type size

**Exit:** renders correctly in all three themes, RTL, both spacing breakpoints · zero external font requests · light-theme contrast verified by measurement.

---

## S2 — WordPress content model (~4 days) · `mag-wordpress`

Runs in parallel with S1 — different owner, no shared files.

- Register `market` and `contentType` taxonomies; add market `description`
- Compute `readingTime` in the mu-plugin
- Expose `modifiedAt`
- Seed 10–15 realistic articles across markets and types
- Decide and implement the reports/monthlies source (CPT or elsewhere)

**Exit:** one GraphQL query returns every field the design needs, against real seeded content, confirmed in GraphiQL.

---

## S3 — Feature scaffolding (~2 days) · `mag-frontend`

Depends on nothing. Can start immediately, before S1 and S2 finish.

```
src/features/mag/
  types/       mag.types.ts · mag-seo.types.ts · mag-blocks.types.ts
  api/v1/      mag.api.ts · mag.mock.ts · mag.service.ts
  queries/     use-mag-articles · use-mag-article · use-mag-markets · use-mag-search
  lib/         seo.ts · blocks.tsx
```

Mocks must simulate loading and error states so UI states are testable before real data exists.

**Exit:** `NEXT_PUBLIC_USE_MOCK=true` returns realistic data through the service · `tsc --noEmit` clean · no direct mock imports outside the service.

---

## S4 — Listing page (~1 week) · `mag-frontend`

`ArticleCard` · `FeaturedArticleCard` · `SecondaryArticleCard` · lead block (62/38) · `MarketChip` · `ContentTypeLabel` · `MarketFilterBar` · `ArticleGrid` · `ReportsBand` · `NewsletterCta` · `Pagination` · loading/empty/error states.

**Exit:** matches the design in all three themes · mobile LCP ≤2.5s and CLS ≤0.1 on staging · filter state in the URL · `mag-reviewer` clean.

---

## S5 — Article page (~1 week) · `mag-frontend`

`Breadcrumbs` · article header with revision date · hero · `TableOfContents` (sticky desktop, `<details>` mobile, omitted below two `<h2>`s) · body typography · `Callout`/`Disclaimer`/`CtaBlock` renderers · `RelatedMarkets` · `AuthorBox` · `RelatedArticles` · `ShareRow` · loading/error/404.

**Exit:** one `<h1>`, no level skips in the assembled page · block titles are not headings · no italic, no justify · ZWNJ renders · measure lands 70–73 characters.

---

## S6 — Remaining routes (~4 days) · `mag-frontend`

Market archive (with and without description) · author page · authors index · search (results, loading, empty, no-query) · reports index · 404. Almost entirely reuse — if you're building a new component here, check again.

---

## S7 — SEO layer (~1 week) · `mag-seo`

Runs in parallel with S4–S6 once S0 is green.

Metadata mapping with **canonical host rewriting** · `Article` and `BreadcrumbList` JSON-LD · `sitemap.ts` emitting frontend URLs · `robots.ts` · middleware redirects with TTL cache · `X-Robots-Tag: noindex` on the whole `wp.` host at nginx.

**Exit:** rendered HTML shows correct canonicals on the frontend host · JSON-LD validates · sitemap contains no `wp.` URLs · `wp.thefinance.ir` returns noindex.

---

## S8 — Editor enablement (~2 weeks) · `mag-wordpress` + `mag-frontend`

`theme.json` from tokens · three Gutenberg blocks · patterns and block locking · React block registry · Draft Mode preview through nginx · publish webhook → `revalidatePath`.

**Exit:** editor preview resembles the frontend · a draft previews end-to-end · publishing revalidates within seconds · Editor-role users cannot break branded blocks.

---

## S9 — Content team enablement (~3 days)

Persian runbook · roles configured · training session.

**Hard pass/fail: a content team member publishes a complete article, including disclaimer and CTA, with zero developer help.** If it fails, log exactly where they got stuck and expand the block library. Failure here is a block-library problem, not an architecture problem.

---

## S10 — QA, staging parallel run, cutover · all agents

`mag-reviewer` full audit · SEO regression against the S0 baseline · staging parallel run · backup and rollback rehearsal · cutover · Search Console monitoring weekly for 8–12 weeks.

---

## Critical path

```
S0 ──┬── S1 ──┐
     ├── S2 ──┼── S4 ── S5 ── S6 ──┬── S8 ── S9 ── S10
     └── S7 ──┘                    │
S3 (no dependencies) ──────────────┘
```

S3 starts today. S1 needs the token grep. S2 needs nothing but your time.

---

## Still open

1. **Real token identifiers** — blocks S1. A grep in the redesign repo.
2. **Category → market mapping** — blocks the URL decision. Comes out of S0.
3. **Khabarchi boundary** — does Mag carry `اخبار`? Currently excluded by default.
4. **Reports source** — CPT inside Mag, or a separate system?
5. **Analytics** — confirm whether GTM/GA4 have a named consumer, or Matomo alone.
