# Mag — Design Phase Summary

**Status:** ✅ Design complete · **Date:** 2026-08-19
**Next phase:** Frontend implementation (Roadmap Phase 2)
**Related:** `mag-decision-brief.md`, `mag-roadmap.md`, `mag-listing-design-spec.md`

---

## What was produced

Six design artifacts across six passes, covering every Mag route.

| Pass | Artifact | Covers |
|---|---|---|
| Listing 1 | `Mag_Listing_-_Pass_1_Cards_dc__1_.html` | `ArticleCard`, `MarketChip`, `ContentTypeLabel`, meta row, card skeleton |
| Listing 2 | `Mag_Listing_-_Pass_2_Lead_Block_dc.html` | `FeaturedArticleCard`, `SecondaryArticleCard`, 62/38 split, `MarketFilterBar` |
| Listing 3 | `Mag_Listing_-_Pass_3_Full_Page_dc.html` | Page header, article grid, reports band, newsletter CTA, pagination, page states, full assembly |
| Article A | `Mag_Article_-_Pass_A_Typography_dc.html` | Breadcrumbs, article header, ToC, long-form Persian body typography |
| Article B | `Mag_Article_-_Pass_B_Page_dc.html` | Callout, Disclaimer, CTA blocks, author box, related articles, share, article states, full assembly |
| Final | `Mag_Archive_-_Author_-_Search_dc.html` | Category archive, author page, search (4 states) |

All six passed a two-stage audit. Corrections issued and verified: 7 in Listing Pass 1, 3 in Listing Pass 2, 2 in Listing Pass 3, 0 in Article Pass A, 2 missing deliverables in Article Pass B, 0 in the final pass.

---

## Routes designed

| Route | Status |
|---|---|
| `/mag` — home / listing | ✅ |
| `/mag/<slug>` — article | ✅ |
| `/mag/market/<slug>` — category archive | ✅ |
| `/mag/author/<slug>` — author | ✅ |
| `/mag/search?q=` — search results | ✅ |
| `/mag/page/<n>` — pagination | ✅ |

Site header, footer, theme switcher and auth state are inherited from the redesign shell and were deliberately out of scope throughout.

---

## Component inventory

**New primitives — build in `src/features/mag/`:**

| Component | Variants / states | Notes |
|---|---|---|
| `ArticleCard` | default, hover, focus, skeleton, no-image | 16:9 fixed box; `<h3>` 2-line clamp, `min-height:51px`; meta pinned with `margin-block-start:auto` |
| `FeaturedArticleCard` | with «در این مقاله», without | 3:2 image, LCP owner; `<h2>` 3-line clamp, **no** min-height |
| `SecondaryArticleCard` | default, hover, focus | Horizontal at all breakpoints; thumb `120px` / `96px` |
| `MarketChip` | passive (`border-subtle`), interactive (`border-interactive`), selected (`accent` fill) | Transparent background in all unselected states |
| `ContentTypeLabel` | — | Text-only, `text-muted`, `·` separator |
| `MarketFilterBar` | desktop row, mobile scroll-snap | `<nav>` + real links; `aria-current`; selected chip scrolls into view via `scrollIntoView` |
| `ArticleGrid` | populated, loading, empty, error | 3/2/1 cols; `--gap-grid` / `--gap-grid-mobile` |
| `ReportsBand` | populated, hidden below 3 items | 3:4 covers, scroll-snap, `mask-image` edge fade |
| `NewsletterCta` | default, error, success | Copy brand-locked; `role="alert"` + `aria-describedby` on error |
| `Pagination` | normal, truncated | Real links; `aria-current="page"`; RTL chevrons |
| `Breadcrumbs` | normal, long-title truncation | SVG chevron pointing RTL; last item `aria-current`, not a link |
| `TableOfContents` | desktop sticky, mobile `<details>`, omitted below 2 headings | Active state = text + `border-inline-start`, not a fill |
| `Callout` | with title, without; paragraph and list content | **One variant only** — no severity colour set |
| `Disclaimer` | end-of-body, mid-body | Copy fixed, **not editor-editable** |
| `CtaBlock` | InChart sample, Academy sample | Contained, not full-bleed; no profit/urgency language |
| `AuthorBox` | in-article (56/48px), author-page (80/64px), no-avatar | Size variant, not two components |
| `RelatedArticles` | 3-card row, hidden below 3 | Reuses `ArticleCard` unchanged |
| `ShareRow` | default, copy-confirmed | Native links only; `aria-live` on copy |
| `SearchEntry` / `SearchResults` | results, loading, empty, no-query | Query rendered through LTR isolation |

**Reused from `src/shared/ui`:** buttons, inputs, typography, image wrapper, skeleton primitive, section container.

---

## Design system additions required

These emerged from Mag but are **system-level**. They must be applied to the redesign token layer, not patched locally — otherwise the rest of the site keeps the defect.

### 1. `--focus-ring` — light theme fix *(defect)*

The dark-theme blue was reused unchanged across all themes. Measured against WCAG 2.2 SC 1.4.11 (3:1 minimum for focus indicators):

| Theme | vs `surface` | vs `surface-raised` | |
|---|---|---|---|
| v1 navy | 6.84 | 6.43 | pass |
| v2 dark | 6.95 | 6.29 | pass |
| **v2 light** | **2.85** | **2.59** | **fail** |

Fix: light theme uses the darker accent (`#1A5FBF` in the placeholder layer) → **6.12** / **5.55**.

**Scope:** every focus indicator on the light theme, site-wide. Same class of issue as the warning-surface token found during Markets Pass 1.

### 2. `--border-interactive` — new token *(gap)*

Interactive control boundaries need 3:1. Neither existing border token reaches it: `border-subtle` measures **1.28**, `border-strong` **1.68** (v2-light vs surface).

| Theme | Placeholder value | vs `surface` | vs `surface-raised` |
|---|---|---|---|
| v1 navy | `#63718A` | 3.95 | 3.72 |
| v2 dark | `#757575` | 4.30 | 3.89 |
| v2 light | `#737B8F` | 4.23 | 3.84 |

Used by: filter chips, pagination, search input, newsletter input, share buttons.

### 3. `--danger` — new token *(gap)*

Needed for form validation. All values clear 4.5:1 comfortably on every surface in the system (measured range 6.27–10.43). Placeholder values: v1 `#FF9E9E`, v2-dark `#FCA5A5`, v2-light `#A8180F`.

### 4. Confirm these exist

`--gap-grid` / `--gap-grid-mobile` · `--skeleton` / `--skeleton-strong` · `--radius-card` · `--surface-hover`. If any are absent from the real system, they need adding.

---

## Decisions made during design

| Decision | Rationale |
|---|---|
| Organise the listing by **market**, not generic category | Multi-market coverage is the actual product differentiator, and it's how readers think about their portfolio |
| **«چرا مهم است» dropped**, replaced by «در این مقاله» | Live Mag excerpts are auto-truncated mid-sentence — the content team doesn't write summaries today. The replacement derives from the article's own `<h2>`s server-side, needing zero new editorial habit |
| **No live price ticker** on Mag | API dependency, invites a signal-channel reading, competes with editorial content. Market data belongs in InChart |
| **Absolute Jalali dates**, plus a revision date when it differs | Much of Mag is evergreen educational content; relative dates make it look stale. The revision date is the honest freshness signal |
| **Callout has one variant**, not four severity colours | Four options means an editor chooses correctly once and wrongly three times |
| **Disclaimer copy is locked** | Signal-selling is prohibited under Iranian securities law — this is legal protection, not brand voice |
| **Share uses native links only** | Third-party widgets are render-blocking, leak user data, and several are unreachable from Iran |
| **No hero images** on archive and author pages | An archive is a list, not a story; a decorative banner costs LCP for nothing |
| **Reports band uses 3:4 covers** | Distinct artifact type; differentiates from the 16:9 article grid above it |
| **No text overlaid on any image** | Mag thumbnails frequently have the title baked in already |
| Visually-hidden `<h2>` before archive/author/search grids | Removing it entirely would create an `h1 → h3` level skip; showing it adds nothing |

---

## Constraints carried into implementation

**Persian typography** — no `font-style: italic` anywhere (browsers synthesise a broken slant) · no `text-align: justify` (rivers without kashida support) · real font weights only · ZWNJ must render (test «می‌شود», «نمی‌کند», «سرمایه‌گذاری») · body 18px desktop / 17px mobile at line-height 1.9 · content column **700px**, measuring 70–73 characters per line.

**RTL** — logical properties only, never `left`/`right` · all chevrons flip · Latin fragments wrapped in `dir="ltr"` + `unicode-bidi:isolate` · avoid manual `scrollLeft` maths, use `scrollIntoView`.

**Performance** — featured/hero image is the LCP element, `priority` + `next/image` · every image in a fixed aspect-ratio box · Persian font self-hosted, subset, preloaded, `font-display: swap` — **no Google Fonts, no foreign CDN** · filtering is navigation, not client-side churn.

**Layout** — page padding `20px` / `100px`; section spacing `60px` / `96px`. No exceptions.

**Brand** — no urgency devices, no flame/trending iconography, no profit or scarcity language, no follower counts or superlative claims.

---

## Open debts — these block implementation

### 1. Real token identifiers — **blocking**
All six artifacts are built on a placeholder token layer using semantic role names. Swapping to the real system should be a find-and-replace, but only if every role exists in all three themes. A `grep` in the redesign repo resolves this in minutes.

### 2. WordPress fields — **blocking**
None of these exist yet: `market` (taxonomy), `contentType` (taxonomy), `readingTime` (computed server-side in the mu-plugin), `modified` (exposed for the revision date), market **description** (taxonomy field, surfaced on the archive page), reports/monthlies source (CPT or separate system — still undecided).

Standing rule: no component is built against a field that doesn't exist. This gates Phase 2.

### 3. Phase 0 verification — **not yet run**
Nine checks in `mag-phase0-verification.md`. Most critical: the `robots` field shape from `wp-graphql-rank-math`, and whether `/mag` is currently blocked from Googlebot.

### 4. System token additions — **should land before implementation**
The three items in the Design System Additions section above.

### 5. Product questions — **still open**
Does Mag carry `اخبار`, or does Khabarchi own news? (Deliberately omitted from every artifact pending this answer.) Final market taxonomy list. Reports/monthlies ownership.

---

## Recommended next step

Resolve debts 1 and 2 — both are yours, both are short, and together they unblock the entire frontend phase. Debt 1 is a `grep`. Debt 2 is taxonomy registration plus a mu-plugin addition, which you now own directly.

Frontend implementation can then start immediately with the feature scaffolding (`api/v1` service split, SWR hooks, types) built against mocks, and switch to real data as the fields land.
