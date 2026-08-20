# Mag — Implementation Roadmap

**Version:** 1.0 · **Date:** 2026-08-18
**Scope:** `thefinance.ir/mag` — headless WordPress + WPGraphQL + Next.js
**Related:** `mag-decision-brief.md`, `mag-listing-design-spec.md`, `mag-phase0-verification.md`

---

## Sequencing principle

The default instinct is to build the editorial infrastructure first — blocks, preview, webhooks — and reach visible output at the end. This roadmap deliberately inverts that.

**Visible output comes early.** The reason the architecture decision was reopened was that Mag doesn't look like the site. That problem is solved in Phase 2, which is reachable in weeks without building a single custom block. Editorial infrastructure follows in Phase 4, once there's something real for the editor preview to preview.

**The content team is tested, not assumed.** Phase 5 has a hard pass/fail: someone from the content team publishes a complete article with zero developer help. If that fails, the block library expands — the architecture doesn't change.

**Three blocks, not five.** Build Callout, Disclaimer, and CTA. Chart embed and product card are built when the content team actually asks for them. The five-block list in the research document is a ceiling, not a starting point.

---

## Dependency graph

```
Phase 0 (verification)
   │
   ├──► V1,V2 ──────────────► Phase 3 (SEO layer + sitemaps)
   │
   ├──► V5 ──► Phase 1b (WP fields) ──┐
   │                                   ├──► Phase 2 (components) ──► Phase 4 ──► Phase 5
   ├──► V7,V8 ──► Phase 1a (tokens) ──┘                                            │
   │                                                                               │
   └──► V3,V9 ──────────────────────────────────────────► Phase 6 (SEO cutover) ◄──┘

Phase 1a and 1b run in parallel — different owners, no shared files.
Phase 3 can run in parallel with Phase 2 once V1/V2 are green.
```

---

## Phase 0 — Verification

**Goal:** replace eight assumptions with facts.
**Entry:** none — start here.
**Owner:** Frontend + WordPress
**Effort:** ~0.5 day

- [ ] Run all nine checks in `mag-phase0-verification.md`
- [ ] Fill the results table
- [ ] Answer the three product questions (اخبار boundary, market list, «چرا مهم است» commitment)
- [ ] **Assign a WordPress-side owner** — this is currently unassigned and blocks Phase 1b

**Acceptance:**
- `robots` field shape confirmed against the installed plugin version
- `/mag` confirmed crawlable in production; staging confirmed `noindex`
- All mu-plugins pass `php -l` and load
- Token map filled for all three themes
- Every one of the four content fields classified as *exists* or *needs creating*

**Blocks:** everything.

---

## Phase 1a — Token integration & shared primitives

**Goal:** Mag renders correctly in all three themes before any Mag-specific UI exists.
**Entry:** V7, V8 green.
**Owner:** Frontend
**Effort:** ~3–5 days

- [ ] Replace the design spec's semantic role names with real token identifiers
- [ ] Wire theme tokens into `app/mag/layout.tsx`; confirm theme switching works from the site shell
- [ ] Verify reused `src/shared/ui` primitives render correctly in RTL
- [ ] Self-hosted subset Persian font via `next/font`, preloaded, `font-display: swap`
- [ ] Build a throwaway token/typography test route covering every role and type size
- [ ] Verify AA contrast in **v2 light first** — it's the usual failure

**Acceptance:** test route renders correctly in v1 navy dark, v2 dark and v2 light, in RTL, at both spacing breakpoints; zero external font requests; zero hardcoded colors.

---

## Phase 1b — WordPress content fields

**Goal:** the data the components need actually exists and is queryable.
**Entry:** V5 answered; WordPress owner assigned; product questions answered.
**Owner:** WordPress
**Effort:** ~3–5 days

- [ ] Register `market` taxonomy (final list from the product answer)
- [ ] Register `contentType` (تحلیل / گزارش / آموزش / — `اخبار` only if Mag owns news)
- [ ] Compute `readingTime` server-side in the mu-plugin (**not** in React)
- [ ] Add `whyItMatters` field (≤120 chars, plain text) — only if the content team committed
- [ ] Expose all of the above to WPGraphQL
- [ ] Decide and implement the reports/monthlies source (CPT vs. separate system)
- [ ] Seed 10–15 realistic test articles across markets and content types

**Acceptance:** a single GraphQL query returns every field the listing spec requires, for real seeded content. Confirmed in GraphiQL, not assumed.

> **Standing rule:** components are not built against fields that don't exist yet. This phase gates Phase 2.

---

## Phase 2 — Components & pages *(this is where the original complaint gets fixed)*

**Goal:** Mag looks and behaves like the rest of the site.
**Entry:** Phase 1a and 1b complete.
**Owner:** Frontend
**Effort:** ~2–3 weeks

**2.1 — Listing page** (spec: `mag-listing-design-spec.md`)
- [ ] Feature scaffolding: `api/v1/{mag.api,mag.mock,mag.service}.ts`, `queries/use-mag-*.swr.ts`, `types/`
- [ ] Build against `NEXT_PUBLIC_USE_MOCK=true` first
- [ ] `MagPageHeader`, `FeaturedArticleCard`, `SecondaryArticleCard`, `ArticleCard`
- [ ] `MarketFilterBar` — URL-driven, real links, crawlable
- [ ] `ArticleGrid` with skeletons matching final geometry
- [ ] `ReportsBand`, `NewsletterCta`, pagination
- [ ] Loading / empty / error states
- [ ] Switch to `NEXT_PUBLIC_USE_MOCK=false` and verify against real data

**2.2 — Article page**
- [ ] Restyle the existing ISR page against tokens
- [ ] `TableOfContents`, `Breadcrumbs`, `AuthorBox`, `RelatedArticles`, `ShareButtons`

**2.3 — Archive / author / search**
- [ ] Category archive reusing `ArticleGrid`
- [ ] Author page, search results page

**Acceptance:**
- Visually consistent with the redesign in all three themes
- Mobile LCP ≤2.5s, CLS ≤0.1 on listing and article, measured on staging
- `tsc --noEmit` and `next build` pass; lint gates green
- No `fetch()` in components; no direct mock imports in page files
- Spacing matches `layout.md` exactly (20/100 horizontal, 60/96 vertical)

---

## Phase 3 — SEO layer & sitemaps

**Goal:** full SEO parity, emitted by Next.js.
**Entry:** V1, V2 green. Can run parallel to Phase 2.
**Owner:** Frontend
**Effort:** ~1 week (layer partly built)

- [ ] Correct the SEO layer types to the *verified* `robots` shape
- [ ] Fix any field names that failed V2
- [ ] Map Rank Math fields → Next.js `Metadata` (title, description, canonical, OG, Twitter, robots)
- [ ] JSON-LD: Article + BreadcrumbList
- [ ] Native `sitemap.ts` emitting `/mag` **frontend** URLs (not WordPress URLs)
- [ ] `robots.ts` — confirm `/mag` is allowed
- [ ] Keep redirects in Next.js middleware (Rank Math redirects don't resolve via `nodeByUri`)
- [ ] Decide whether to disable Rank Math's public sitemap module

**Acceptance:** rendered HTML contains correct canonical on the frontend domain, valid JSON-LD, complete OG/Twitter tags and correct robots directives. Sitemap lists only frontend URLs. Verified by viewing source, not by trusting the code.

---

## Phase 4 — Editor enablement

**Goal:** WordPress becomes an on-brand authoring environment.
**Entry:** Phase 2 complete (there must be real components for blocks to map onto).
**Owner:** Frontend + WordPress
**Effort:** ~2–3 weeks

- [ ] Generate `theme.json` from the design tokens (palette, type scale, spacing presets)
- [ ] Disable freeform color and font-size controls (`customFontSize: false`) so editors stay on-brand
- [ ] Build three custom blocks: **Callout**, **Disclaimer**, **CTA**
- [ ] Register block patterns; apply block locking / `templateLock` to branded structures
- [ ] React block registry (`features/mag/lib/blocks.tsx`) mapping block name → component
- [ ] Draft Mode route (`/mag/api/draft`) with a preview secret; wire WordPress Preview to it
- [ ] Route preview through nginx to the Next.js container; mark preview `noindex`
- [ ] Publish/update webhook → `/api/revalidate` calling `revalidatePath` + `revalidateTag`
- [ ] Keep a time-based ISR TTL as fallback for missed webhooks
- [ ] Exclude sitemap and revalidation routes from nginx caching
- [ ] Post starter template so new articles begin on-brand

**Acceptance:** the editor preview visually resembles the frontend; a draft previews end-to-end through nginx; publishing revalidates `/mag/<slug>` within seconds; branded blocks cannot be structurally broken by an Editor-role user.

> Chart embed and product-card blocks are **deferred** until the content team requests them.

---

## Phase 5 — Content team enablement

**Goal:** developer-free publishing. **Do not defer this to the end of the project.**
**Entry:** Phase 4 complete.
**Owner:** Frontend + Content
**Effort:** ~2–4 days

- [ ] Persian runbook: writing an article, choosing market + content type, using blocks, previewing, scheduling, publishing
- [ ] Configure roles: content team as Editor/Author only — no plugin, theme, or user administration
- [ ] Live training session
- [ ] **Pass/fail test:** a content team member publishes a complete article — including disclaimer and CTA — with zero developer help

**Acceptance:** the unaided publish succeeds. If it fails, log exactly where they got stuck, expand the block/pattern library, and retest. Failure here is a block-library problem, not an architecture problem.

---

## Phase 6 — SEO verification & cutover

**Goal:** launch without losing rankings.
**Entry:** Phases 2, 3, 5 complete; V3 and V9 answered.
**Owner:** Frontend
**Effort:** ~3–5 days + 8–12 weeks monitoring

- [ ] If URL structure is unchanged: confirm it, and skip the redirect map
- [ ] If it changed: build a complete **1:1** 301 map — never blanket-redirect to the homepage; no redirect chains (single hop → 200)
- [ ] Final robots.txt / `X-Robots-Tag` / meta robots check on production
- [ ] Submit the updated sitemap in Search Console
- [ ] URL Inspection on a sample of live URLs
- [ ] Weekly Search Console monitoring for 8–12 weeks against the Phase 0 baseline
- [ ] Keep redirects live for at least 12 months

**Acceptance:** no `noindex` leak; all old URLs resolve in one hop; indexed count within ~5–10% of baseline after stabilization. Expect fluctuation through roughly weeks 3–8 and stabilization around weeks 4–12.

---

## Rough timeline

Assumes one frontend developer plus intermittent WordPress work. Treat as ranges, not commitments.

| Phase | Effort | Cumulative |
|---|---|---|
| 0 — Verification | 0.5 day | day 1 |
| 1a / 1b — Tokens + WP fields *(parallel)* | ~1 week | week 1–2 |
| 2 — Components & pages | 2–3 weeks | week 3–5 |
| 3 — SEO layer *(parallel with 2)* | 1 week | week 5 |
| 4 — Editor enablement | 2–3 weeks | week 6–8 |
| 5 — Content enablement | 2–4 days | week 8–9 |
| 6 — Cutover | 3–5 days + monitoring | week 9+ |

**Mag looks like the site by roughly week 5.** Everything after that is editorial capability and launch safety.

---

## Risk register

| Risk | Severity | Owner | Mitigation |
|---|---|---|---|
| No WordPress-side owner assigned | **High** | Mol | Assign before Phase 1b; Mag's WP work is a subset of the outstanding backend PRD gap |
| Content team rejects headless authoring | **High** | Content | Phase 5 pass/fail test; expand blocks before questioning architecture |
| `noindex` / robots block leaks to production | **High, silent** | Frontend | V3 now, and again in Phase 6; confirm in Search Console |
| Rank Math schema differs from assumptions | Medium | Frontend | V1/V2 gate Phase 3 |
| Design tokens still changing | Medium | Frontend | Delay Phase 2 until stable, or accept rework |
| Persian font hurts LCP | Medium | Frontend | Subset + preload + fallback metric matching; measure in Phase 1a |
| Scope creep into live market data on Mag | Medium | Mol | Out of scope by decision — market data belongs in InChart |
| WPGraphQL / Rank Math version drift | Low–Medium | WordPress | Pin versions; test schema after any upgrade |

---

## Open decisions log

| # | Question | Status | Blocks |
|---|---|---|---|
| 1 | Does Mag carry `اخبار`, or does Khabarchi own news? | **Open** | Phase 1b taxonomy |
| 2 | Final market taxonomy list | **Open** | Phase 1b taxonomy |
| 3 | Content team commitment to «چرا مهم است» | **Open** | Design spec §3, Phase 1b |
| 4 | Real token identifiers for all three themes | **Open** | Phase 1a |
| 5 | Reports/monthlies — CPT inside Mag or separate? | **Open** | Design spec §5.5 |
| 6 | Persian digits vs Latin — editorial rule | **Open** | Phase 2 |
| 7 | Pagination vs load-more *(recommendation: real pagination)* | **Open** | Phase 2 |
| 8 | Rank Math public sitemap — keep or disable? | **Open** | Phase 3 |

---

## Definition of done (per `skill.md`)

A phase is done when:

- Components are modular, reusable, and readable — one responsibility each
- Styling follows `layout.md` spacing and the existing design system; no new primitives without justification
- No duplicated logic or components introduced
- Responsive behavior verified mobile → desktop, RTL throughout
- Strict typing; no `any`; no dead code or unused imports
- `tsc --noEmit`, `next build` and lint all pass
- Verified on staging (`new.thefinance.ir`) before anything touches production

---

## Working agreements

- Staging is the validation environment. Nothing reaches production unverified there.
- Production repo `xthefinance/thefinance-front` is not touched without explicit instruction. Work happens on `new` in `IlyaXtm/thefinance-front-redesign`; `main` is the release branch.
- Two-pass review on design work: audit → redesign → check → check → finalize.
- Decisions get logged as briefs in this directory, following the established pattern.
- Ambiguities get flagged, not assumed.
- Brand book is a hard constraint: no signal-selling, no hype, no guaranteed-return language. Flag violations rather than implementing them.
