# Mag — Architecture Decision Brief

**ID:** `mag-architecture-001`
**Title:** Headless WordPress + Next.js vs. Hello Elementor theme for `thefinance.ir/mag`
**Date:** 2026-08-18
**Status:** ✅ Decided
**Decision owner:** Mol
**Supersedes:** —
**Related:** `mag-roadmap.md`, `mag-listing-design-spec.md`, `mag-phase0-verification.md`

---

## Context

Mag currently runs on headless WordPress + WPGraphQL + Next.js (App Router) under `src/features/mag/`. Already built:

- An 18-file Next.js SEO layer
- A WordPress mu-plugin
- ISR article pages via server components
- Redirects in middleware with a TTL cache

The documented next step was the React component layer, which was never started.

The decision was reopened for one stated reason: **the blog's appearance doesn't match the rest of the site.** A secondary requirement was raised at the same time — the technical team should set Mag up once, after which the content team must be able to publish without developer involvement.

The site-wide redesign (`IlyaXtm/thefinance-front-redesign`, staging `new.thefinance.ir`) uses a two-tier semantic token architecture with three themes (v1 navy dark, v2 dark, v2 light). Its design bundle already includes Mag.

## Options considered

**A. Continue headless.** Finish the React component layer against the redesign's design tokens; solve editor ergonomics inside WordPress.

**B. Hello Elementor + Elementor page builder.** Abandon the headless work; rebuild Mag as a classic WordPress theme with a visual page builder.

**C. Hybrid.** Either a hand-built classic theme (no Elementor) consuming the tokens, or Gutenberg full-site-editing with a `theme.json` generated from the tokens.

## Decision

**Option A.** Continue with headless WordPress + WPGraphQL + Next.js.

Editor ergonomics are solved *inside* the headless architecture: Gutenberg + a token-generated `theme.json` + a small set of custom, locked blocks mapped 1:1 to React components + Next.js Draft Mode preview + webhook-driven ISR revalidation.

## Rationale

Priorities were ranked by the decision owner as: **(1) SEO & Core Web Vitals, (2) consistency with the redesign, (3) speed of launch, (4) lowest maintenance cost.**

| Priority | Winner | Reasoning |
|---|---|---|
| 1. SEO & CWV | **A** | Pre-rendered ISR pages with minimal client JS vs. Elementor's all-widget CSS/JS payload and deeply nested DOM. Passing CWV requires clearing LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 *simultaneously* at the 75th percentile — a lean Next.js page does this far more reliably. |
| 2. Redesign consistency | **A** | Next.js components consume the redesign tokens directly — one source of truth. Elementor requires *porting* the token system into Global Styles/Kits and maintaining it in parallel, which guarantees drift over time. |
| 3. Launch speed | **A (marginal)** | Elementor's drag-and-drop advantage applies to a from-scratch build. Here the SEO layer, mu-plugin, ISR pages and middleware redirects already exist; switching discards them and re-incurs SEO, RTL, font and design-parity work inside Elementor. |
| 4. Maintenance cost | **A** | A public Elementor site is a recurring optimization and security burden; page builders are a known vulnerability vector and the WordPress plugin ecosystem carries a large and growing volume of disclosed vulnerabilities. Headless keeps WordPress private and removes the public theme layer entirely. |

**The central finding:** the appearance complaint is evidence of *unfinished work*, not of a wrong architecture. Elementor would not fix it — it would institutionalize it, by creating a second design source of truth that diverges from the redesign on every change.

**Iranian infrastructure** reinforces the decision: Cloudflare CDN/SNI has been intermittently blocked and some Google-hosted services geoblock Iran. Persian webfonts must be self-hosted and subset. Next.js self-hosts fonts by default; an Elementor build needs extra configuration to avoid CDN dependencies.

## Trade-offs accepted

1. **No true in-place WYSIWYG for editors.** Mitigated by a `theme.json`-styled Gutenberg editor plus one-click Draft Mode preview. Accepted as a real but bounded cost.
2. **More upfront developer work** to build custom blocks and the preview/revalidation pipeline.
3. **Version coupling** between WPGraphQL, Rank Math and `wp-graphql-rank-math` — breaking changes across major releases must be managed deliberately.
4. **New layout types require a developer** to build a block. (Note: this is also true of any disciplined Elementor build with locked branding.)

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Content team finds headless authoring too painful and stops publishing | **High** | Ship a rich starter block/pattern library; run a real unaided-publish test in Phase 5 before declaring done |
| Rank Math GraphQL schema differs from what the SEO layer assumes | Medium | Phase 0 verification (V1, V2) before any further SEO work |
| Leftover `noindex` / robots block on `/mag` | High, silent | Phase 0 verification (V3), plus Search Console confirmation post-launch |
| WordPress-side work has no clear owner after the backend team change | **High** | Assign an owner before Phase 1; the full backend PRD gap is a known outstanding item |
| Design tokens still moving | Medium | Sequence component work after tokens stabilize |

## Open questions (product, not technical)

1. Does Mag carry `اخبار` as a content type, or does **Khabarchi own news entirely**? This is a product-boundary question — answering it wrong creates two parallel paths for the same content.
2. Final market taxonomy. Proposed: بورس ایران، طلا و دلار، کریپتو، فارکس، اقتصاد جهانی، مسکن.
3. Will the content team commit to writing the «چرا مهم است» line per lead article? Cheap to add now, expensive to retrofit across an archive.

## Revisit triggers

Reopen this decision if **any** of the following becomes true:

- After Phase 5 training and an expanded block library, editors still cannot publish a standard article unaided.
- Frontend capacity drops to zero and no one can write or maintain the component layer.
- Staging article pages cannot reach mobile LCP ≤2.5s after `next/font`, `next/image` and ISR are correctly applied. *(Note: this would not favour Elementor, which is heavier — it would trigger a different investigation.)*

## Constraints that apply to all downstream work

The brand book prohibits signal-selling, hype, and guaranteed-profit claims. Any Mag copy, CTA, badge or content structure implying performance promises requires explicit sign-off and should be flagged rather than implemented.
