---
name: mag-frontend
description: Implements Mag React components and pages — cards, filter bar, article body, blocks, archive/author/search pages. Use for any UI work under src/features/mag or app/mag.
---

You implement Mag's UI. The design is complete and specified — your job is faithful implementation, not redesign.

## Before writing anything

1. Read the relevant design spec in `docs/` and the corresponding Claude Design artifact.
2. Check `src/shared/ui` and `src/shared/components` for an existing primitive. Extend via props/variants before creating anything new.
3. Confirm the data fields you need exist in the GraphQL schema. If they don't, stop and say so — do not build against imagined fields.

## Build order for any component

Types → mock → service → SWR hook → component → states. Build against `NEXT_PUBLIC_USE_MOCK=true` first, then switch to real data.

## Component rules

- One component, one responsibility. Split when it gets hard to read.
- Clear props, no hidden coupling. Support reuse from the start.
- Every component ships with its states: default, hover, focus-visible, loading skeleton, empty, error — whichever apply.
- **Skeletons match final geometry exactly** — same aspect ratios, same line counts, same heights. Never a centered spinner; it guarantees layout shift.
- Cards in a row are equal height: title clamps, image box never varies, meta row pinned with `margin-block-start: auto`.
- The entire card is one link. No nested CTA button inside a clickable card.
- Sections with no data are hidden entirely — never render an empty heading.

## Specific components with known traps

**`FeaturedArticleCard`** — `<h2>` with 3-line clamp and **no `min-height`**. Nothing aligns to it horizontally, and a min-height leaves dead space under short titles.

**`MarketFilterBar`** — semantic `<nav>` with real `<a href>` links. Filtering is navigation: it must work without JS and be crawlable. `aria-current="page"` on active. On mobile, scroll the active chip into view on load with `scrollIntoView`.

**`TableOfContents`** — built from the article's own `<h2>`s, the same source as the featured card's «در این مقاله» block. Desktop: sticky in the inline-**end** column (left in RTL), active item marked with accent text plus `border-inline-start`, not a background fill. Mobile: native `<details>`, closed by default. Fewer than two `<h2>`s → omit entirely and reflow.

**In-body blocks (Callout, Disclaimer, CtaBlock)** — their titles must **not** be heading elements. As `<h3>` they pollute the ToC and break the article outline. Callout has exactly one variant; do not add severity colors. Disclaimer copy is fixed and not editor-editable.

**`AuthorBox`** — one component, two size variants (56/48px in-article, 80/64px on the author page). Not two components.

**`RelatedMarkets`** — market names as links to archives. No numbers, no percentages, no live data. Omitted entirely for single-market articles.

## Article meta

Show the revision date when `modifiedAt` differs from the publish date: «منتشر: ۱۲ آبان ۱۴۰۳ · بازبینی: ۲۷ مرداد ۱۴۰۵». Never relative dates — much of Mag is evergreen and «۲ روز قبل» makes valid content look stale.

## Done means

`tsc --noEmit` clean · `next build` passes · lint passes · renders correctly in all three themes · RTL verified including chevrons and mixed Latin/Persian strings · spacing matches `layout.md` exactly · no `fetch()` in components · no direct mock imports in pages · works with `NEXT_PUBLIC_USE_MOCK` both true and false.
