# TheFinance Mag — Agent Instructions

Persian-language (RTL) financial magazine at `thefinance.ir/mag`. Headless WordPress + WPGraphQL + Next.js App Router.

---

## Domain model — get this right or SEO breaks

| Domain | Role |
|---|---|
| `thefinance.ir/mag` | **Public.** Where articles live and where all SEO equity accrues. Served by Next.js. |
| `wp.thefinance.ir` | **CMS only.** `/wp-admin`, `/graphql`, media. Never a public reading surface. |

Three rules that follow:

1. **Canonical URLs always point at `thefinance.ir/mag/<slug>`.** Rank Math returns WordPress URLs — the SEO layer must rewrite the host, never pass them through.
2. **`wp.thefinance.ir` is fully de-indexed** via `X-Robots-Tag: noindex` at the nginx level. Without this the same article indexes from two hosts and creates duplicate content. This is the most common headless-migration failure.
3. **Sitemaps are generated in Next.js**, listing frontend URLs only. Do not proxy Rank Math's sitemap.

---

## Stack

Next.js (App Router) · TypeScript strict · Tailwind consuming design tokens · WPGraphQL · SWR · Docker · nginx · **Iranian server, ArvanCloud CDN — no Cloudflare, no Google-hosted assets on the critical path.**

---

## Repository conventions

Business/domain code in `src/features/<feature>`. Shared UI in `src/shared/ui` and `src/shared/components`. Route-specific UI in `_components` folders.

Feature API layer — this pattern is not optional:

```
src/features/mag/
  api/v1/
    mag.api.ts       # real WPGraphQL calls
    mag.mock.ts      # mock, identical return shape
    mag.service.ts   # the ONLY source-switch point
  queries/
    use-mag-*.swr.ts # imports only from mag.service.ts
  types/
  lib/
  components/
```

- Never call `fetch()` from a page or component when a feature API exists.
- Never import a mock directly in a page or component file.
- Switching mock ↔ real is an env change (`NEXT_PUBLIC_USE_MOCK`), never a refactor.
- Pages orchestrate sections. They hold no business logic.
- Mock and real responses stay in sync with the shared types.
- Mocks simulate loading and error states so UI states are actually testable.

## Code quality

Strict types, no `any`. Small focused components, one responsibility each. Composition over duplication. Read related files before editing. Small focused changes; no broad refactors unless asked. Remove dead code and unused imports. `tsc --noEmit`, `next build` and lint must pass.

---

## Design system — hard constraints

**Tokens.** Two-tier semantic tokens, three themes: `v1 navy dark`, `v2 dark`, `v2 light`. Zero hardcoded colors anywhere. Tailwind consumes tokens via CSS custom properties — it must never introduce a parallel palette through arbitrary values.

Two tokens are new system additions introduced by Mag: `--border-interactive` (interactive control boundaries need ≥3:1; `border-subtle` measures ~1.3 and `border-strong` ~1.7) and `--danger` (form validation). `--focus-ring` has a known light-theme defect — it must use the darker accent, not the dark-theme blue.

**Spacing.** Page horizontal padding `20px` mobile / `100px` desktop. Section vertical spacing `60px` mobile / `96px` desktop. No exceptions.

**Grid.** 1 col <768px · 2 cols 768–1279px · 3 cols ≥1280px. Gap 16px mobile / 24px desktop.

---

## RTL — base direction, not a mirror

- Logical properties only: `padding-inline-start`, `margin-inline-end`, `border-inline-start`, `inset-inline-start`. **Never `left`/`right`.**
- All chevrons flip. In RTL "forward" points left.
- Latin fragments inside Persian are the common case, not an edge case — «نات کوین (Notcoin) چیست؟», «شاخص دلار (DXY)», «نسبت P/E». Every one wrapped in `<span dir="ltr" style="unicode-bidi:isolate">` or punctuation scrambles.
- Never use manual `scrollLeft` arithmetic — RTL semantics differ across browsers. Use `element.scrollIntoView({inline:'nearest', block:'nearest'})`.
- Horizontal scroller edge fades use `mask-image`, not colored gradients.

## Persian typography

1. **Never `font-style: italic`.** No true italic exists for Persian faces; browsers synthesize a broken slant. Emphasis is weight or color. Watch blockquotes and figure captions.
2. **Never `text-align: justify`.** Without kashida support it creates rivers of whitespace. Use `text-align: start`.
3. Real font weights only (400/600/700) — no synthetic bold.
4. ZWNJ (نیم‌فاصله) must render: «می‌شود», «نمی‌کند», «سرمایه‌گذاری». A mid-word fallback break is the fastest sign of a font failure.
5. Line-height: body `1.9`, headings `1.5`, captions `1.7`.
6. Body `18px` desktop / `17px` mobile. Content column `700px` (measures 70–73
   characters in IRANYekanX). The column is calibrated to the face — a typeface
   change means re-measuring it. Blog v4 tried Vazirmatn and had to cut the
   column to `570px` to stay near 70; both were reverted together.
7. Persian digits (۱۲۳) for dates, read time, counts. Latin digits for tickers and prices.
8. Font self-hosted and subset via `next/font`, preloaded. **No Google Fonts, no
   foreign CDN.** The face is **IRANYekanX**, and it is not Mag's to change:
   it is the design system's typeface across the whole product, so swapping it
   here alone rebuilds the visual detachment this project exists to remove.
   Blog v4 shipped Vazirmatn and it was reverted for that reason, not a
   technical one — see `docs/changelog.md`, 2026-08-29.

---

## Brand constraints — these are legal, not stylistic

Signal-selling and guaranteed-return claims are prohibited by Iranian securities law and by the brand book. Flag violations rather than implementing them.

**REVERSED BY BLOG v4: the one-image index.** The previous listing showed
artwork exactly once, because every featured image had the article's headline
baked into it and a card grid printed each title twice. The v4 design is
deliberately image-led — a featured image on every card — and that is now the
built design. The reasoning behind the old rule has not gone away, it has moved:
the artwork is now a real dependency, so a missing or wrong-aspect image reads
as broken rather than as restraint. `CardImage` fixes every box so the grid
cannot reflow, and every image needs a real Persian `alt`.

**Never build:** view counts, comment counts, reaction counts, trending/popular sections, urgency badges, countdown timers, flame or rocket icons, live price tickers anywhere in Mag, follower counts or superlative claims on author pages, "did you mean" spelling suggestions.

Their absence is deliberate and documented. Do not add them back thinking they were forgotten.

**This list survived Blog v4 intact, and two of its items were tested by it.**
The v4 handoff specified «پرخواننده‌های این ماه» (a most-read ranking) and
«تابلوی امروز» (a market-data board with price rows and an update stamp). Both
were dropped. The ranking is a popular section, which this list rules out and
which the handoff's own Compliance section rules out two paragraphs later. The
board is live price data, which `decisions.md` excludes because it invites a
signal-channel reading of an anti-hype publication — market data belongs in
InChart. Their sidebar slots carry editorially-chosen link lists instead
(«پرونده‌های مرتبط», «ادامه‌ی مسیر»), which do the same navigational job.

---

## Content model — only these fields exist

`market` (taxonomy) · `contentType` (taxonomy: تحلیل / گزارش / آموزش / اخبار) · `readingTime` (computed server-side in the mu-plugin) · `modifiedAt` (revision date, shown when it differs from publish date) · market `description` (taxonomy field, may be empty).

**`اخبار` is a real content type.** It was originally excluded pending the Mag/Khabarchi boundary decision, but an RSS automation publishes roughly two items a day and they are meant to be indexed. News gets `NewsArticle` schema; everything else gets `Article`, because publication date is the signal for translated news while revision date is the signal for evergreen education.

**Deliberately excluded:** `reviewedBy`, `factCheckedBy` (no review process exists), `tickerRelations`, `source`/`sourceUrl`.

**Standing rule: never build a component against a field that doesn't exist in the source.** Verify in GraphiQL first.

---

## Accessibility floor

Exactly one `<h1>` per page; `<h2>` sections, `<h3>` card titles, no level skips. If a grid is the only content and a visible heading adds nothing, use a visually-hidden `<h2>` rather than skipping h1 → h3.

Cards are `<article>` containing one link whose accessible name is the title — **no `aria-label` duplicating the title**, it drifts out of sync with visible text. Visible focus ring on every interactive element, offset so card radius doesn't clip it. 44px touch targets on controls (passive card labels are exempt). Real `alt` text. Labels on every input. `prefers-reduced-motion` disables transitions, animations and scroll smoothing.

## Performance — SEO/CWV is this product's #1 priority

LCP is the featured card image (listing) and hero (article): `priority` + `next/image`, fixed aspect ratio. Target ≤2.5s mobile. Every image in a fixed aspect-ratio box; filter selection must not reflow grid height. Target CLS ≤0.1. Filtering and pagination are navigation, not client-side churn. Target INP ≤200ms. **No third-party scripts.** Hover is a background/border shift only — no lift, scale, or shadow growth.

---

## Working agreements

- Staging (`new.thefinance.ir`) validates everything before production.
- Production repo `xthefinance/thefinance-front` is not touched without explicit instruction. Work happens on `new` in `IlyaXtm/thefinance-front-redesign`; `main` is the release branch.
- Ambiguities get flagged, not assumed.
- Decisions get logged as briefs in `docs/`.
