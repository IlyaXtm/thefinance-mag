# Claude Design — Mag Listing, Pass 1 Brief

**Pass:** 1 of 3 — Base card components
**Date:** 2026-08-18
**Source spec:** `mag-listing-design-spec.md`
**Reviewer:** two-stage (audit → corrections → final check) before Pass 2 is briefed

---

## Pass plan (context — build Pass 1 only)

| Pass | Scope |
|---|---|
| **1 — this brief** | `ArticleCard` (grid variant), `MarketChip`, `ContentTypeLabel`, meta row, card skeleton |
| 2 | Lead block — `FeaturedArticleCard` + `SecondaryArticleCard` asymmetric split, `MarketFilterBar` |
| 3 | Full page assembly — grid section, `ReportsBand`, `NewsletterCta`, pagination, empty/error states |

Pass 1 is deliberately the least blocked: it doesn't depend on the three open product questions or on the «چرا مهم است» field, which appears only on lead cards.

---

## Context

Mag is the Persian-language magazine section of TheFinance (`thefinance.ir/mag`) — a multi-market financial analysis platform. Content is analysis, reports, and education across Iranian equities, gold/FX, crypto, forex, global macro, and housing.

The brand is explicitly **anti-hype**: no signal-selling, no price predictions, no guaranteed-return language, no urgency devices. The tone is calm, explanatory, data-anchored. A reader should feel informed, not urged. This is not a stylistic preference — it's a documented brand constraint and a legal one in the Iranian market.

Mag inherits the site's existing design system and shell. **This pass is not an opportunity to introduce a new visual language.** The job is to build correct, reusable card components inside an established system.

---

## Build this

### 1. `ArticleCard` — grid variant

**Anatomy**, in reading order (RTL, right to left, top to bottom):

```
┌──────────────────────────────┐
│                              │
│      image, 16:9 fixed       │
│                              │
├──────────────────────────────┤
│  [MarketChip]  ContentType   │
│  عنوان مقاله که حداکثر        │
│  دو خط ادامه پیدا می‌کند       │
│  ۷ دقیقه · ۲۷ مرداد ۱۴۰۵     │
└──────────────────────────────┘
```

**Rules:**
- Image: fixed `16:9` aspect-ratio box, `object-fit: cover`. Never let the image shrink to accommodate a longer title.
- Chip row: `MarketChip` then `ContentTypeLabel`, with a small gap. Single line — never wraps.
- Title: `<h3>`, **2-line clamp**, no ellipsis-free overflow.
- Meta row: read time · date, `text-muted`, small size.
- **No excerpt.** The title plus the type label carry the load; excerpts make a grid ragged.
- The **entire card is one link**. Do not nest a separate "read more" button inside it.
- All cards in a row are **equal height**. Titles clamp; the image box never varies.

**Surface:** `surface-raised` background, `border-subtle` border, radius from the existing scale.

**States:**
| State | Treatment |
|---|---|
| Default | as above |
| Hover | subtle `border` and/or `surface` shift **only** |
| Focus-visible | visible focus ring using the existing focus token, offset so it isn't clipped by the card radius |
| Skeleton | matches final geometry **exactly** — same 16:9 box, same chip row height, two title lines, one meta line |
| No image | graceful fallback that keeps the 16:9 box and card height intact |

**Do not:** lift/translate on hover, scale the card or image, grow a shadow, animate the border color over a long duration, or add a gradient overlay on the image. These read as templated and cost motion budget for nothing.

Respect `prefers-reduced-motion` — disable all transitions.

### 2. `MarketChip`

Small pill carrying the market taxonomy term. Two states:

- **Unselected:** `surface-raised` background, `border-subtle`, `text-secondary`
- **Selected:** `accent` background, `accent-contrast` text

In Pass 1 only the unselected/static state appears on cards, but build both — Pass 2's filter bar reuses this component.

Markets (proposed list, pending confirmation — build against these):
بورس ایران · طلا و دلار · کریپتو · فارکس · اقتصاد جهانی · مسکن

Chip text never wraps or truncates. Sizing is content-driven.

### 3. `ContentTypeLabel`

Text-only. **Not a colored badge** — it must not compete with `MarketChip` for attention. Small size, `text-muted`, possibly with a subtle separator between it and the chip.

Values: تحلیل · گزارش · آموزش

*(`اخبار` is deliberately omitted — an open product question about whether Khabarchi owns news. Do not add it.)*

### 4. Meta row

Read time and date, separated by a middot. `text-muted`, small.
Format: `۷ دقیقه · ۲۷ مرداد ۱۴۰۵`

---

## Design system constraints (hard)

### Tokens
The real token identifiers from the redesign bundle are **not yet available**. Define a placeholder token layer as CSS custom properties at the top of the artifact, named by semantic role, so swapping to the real system is a single find-and-replace:

```
--surface, --surface-raised, --border-subtle,
--text-primary, --text-secondary, --text-muted,
--accent, --accent-contrast, --focus-ring,
--radius-card, --gap-grid
```

**Zero hardcoded color values anywhere below that block.** No hex, no rgb, no named colors in component styles.

### Three themes
Every component must render correctly in **v1 navy dark**, **v2 dark**, and **v2 light**. Provide a theme toggle in the artifact so all three can be reviewed.

Define plausible values for all three placeholder theme sets. **Check light theme first** — `text-muted` on `surface-raised` is the most common contrast failure, and it must clear WCAG AA (4.5:1 body, 3:1 large text).

### Direction
**RTL is the base direction, not a mirrored afterthought.**
- Logical properties only: `padding-inline-start`, `margin-inline-end`, `border-inline-start`. Never `left`/`right`.
- Latin fragments inside Persian text (`Bitcoin`, `S&P 500`, `AI`) need `<span dir="ltr">` so punctuation doesn't scramble.
- Persian digits (۱۲۳) for read time and dates.

### Typography
- Persian needs more line-height than Latin: **1.8** for body/meta, **1.5** for the card title. Do not reuse a Latin-tuned scale unchanged.
- Assume a self-hosted Persian face (Vazirmatn is a reasonable stand-in). No Google Fonts, no foreign CDN — Iran reachability.

### Grid
| Breakpoint | Columns | Gap |
|---|---|---|
| <768px | 1 | 16px |
| 768–1279px | 2 | 24px |
| ≥1280px | 3 | 24px |

Page horizontal padding: `20px` mobile / `100px` desktop (from `layout.md`). The card component itself must not assume page padding — that's the section's job.

### Accessibility
- Card is an `<article>` containing one link with a meaningful accessible name — **not** "ادامه مطلب".
- Card title is `<h3>`.
- Touch targets ≥44px.
- Visible keyboard focus on the card link.
- Images have real `alt` text in the sample data, not empty strings.

---

## Sample content (use this — no lorem, no placeholder titles)

These are brand-compliant: explanatory, no predictions, no performance claims.

| Title | Market | Type | Read | Date |
|---|---|---|---|---|
| صورت‌های مالی شش‌ماهه: چه چیزی در گزارش بانک‌ها تغییر کرد | بورس ایران | گزارش | ۹ دقیقه | ۲۷ مرداد ۱۴۰۵ |
| رابطه نرخ بهره آمریکا با قیمت طلای داخلی | طلا و دلار | تحلیل | ۷ دقیقه | ۲۶ مرداد ۱۴۰۵ |
| هالوینگ بیت‌کوین چگونه بر عرضه اثر می‌گذارد | کریپتو | آموزش | ۶ دقیقه | ۲۵ مرداد ۱۴۰۵ |
| چرا اسپرد در جفت‌ارزها تغییر می‌کند | فارکس | آموزش | ۵ دقیقه | ۲۴ مرداد ۱۴۰۵ |
| شاخص دلار و اثر آن بر بازارهای نوظهور | اقتصاد جهانی | تحلیل | ۸ دقیقه | ۲۳ مرداد ۱۴۰۵ |
| بازار مسکن تهران در بهار ۱۴۰۵: داده‌های معاملات | مسکن | گزارش | ۱۱ دقیقه | ۲۲ مرداد ۱۴۰۵ |

Include at least one **deliberately long title** that exercises the 2-line clamp, and one **short title** to verify cards still align at equal height.

---

## Deliverable

A single artifact containing, in this order:

1. **Token block** — the placeholder custom properties, with values for all three themes
2. **Component board** — each component in isolation, all variants and states side by side, labelled
3. **Card in context** — a 3-card row at desktop width, a 2-card row at tablet, a single card at mobile
4. **Skeleton row** — three skeleton cards beside three real cards, so geometry match is verifiable at a glance
5. **Theme toggle** — switch all of the above between the three themes

Label everything. The board is for review, so it should be readable without cross-referencing this brief.

---

## Out of scope for this pass

Do not build: the lead/featured block, the market filter bar, the reports band, the newsletter CTA, pagination, page header, search, or the site shell (header/footer). Do not design an article page.

---

## Review criteria

Pass 1 will be audited against:

- [ ] Zero hardcoded colors below the token block
- [ ] Renders correctly in all three themes; AA contrast verified in v2 light
- [ ] Logical properties only — no `left`/`right`
- [ ] Persian digits; Latin fragments correctly isolated
- [ ] Title clamps at 2 lines; cards in a row are equal height regardless of title length
- [ ] Image box is a fixed 16:9 that never distorts
- [ ] Skeleton geometry matches the real card exactly
- [ ] Hover is a border/surface shift only — no lift, scale, or shadow growth
- [ ] Focus-visible ring present and not clipped
- [ ] `ContentTypeLabel` does not compete visually with `MarketChip`
- [ ] Card is one link; no nested CTA
- [ ] `prefers-reduced-motion` respected
- [ ] No hype devices — no urgency badges, no flame/rocket icons, no performance language
- [ ] `اخبار` not present as a content type
