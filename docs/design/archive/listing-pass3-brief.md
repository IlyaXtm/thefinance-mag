# Claude Design — Mag Listing, Pass 3 Brief

**Pass:** 3 of 3 — Grid section, reports band, newsletter CTA, pagination, states
**Date:** 2026-08-18
**Prerequisite:** Pass 1 and Pass 2 approved
**Source spec:** `mag-listing-design-spec.md` §5.1, §5.4–§5.7, §7

This is the final pass. After it, the listing page is fully specified and goes to implementation.

---

## Carried forward — reuse, do not redesign

**Token layer:** all three themes including `--border-interactive`, the corrected light-theme `--focus-ring`, `--skeleton` / `--skeleton-strong`, `--gap-grid` / `--gap-grid-mobile`, `--radius-card`.

**Components already approved:**
- `ArticleCard` (Pass 1) — 16:9 image, chip row, `<h3>` 2-line clamp with `min-height:51px`, meta pinned with `margin-block-start:auto`
- `MarketChip` — transparent + `border-subtle` when passive; `border-interactive` when interactive; `accent` fill when selected
- `ContentTypeLabel` — text-only, `text-muted`, `·` separator
- Card skeleton — geometry-matched
- Hover = background + border shift only. No lift, scale, or shadow.
- Card link carries no `aria-label`
- `prefers-reduced-motion` respected

**Rules that apply to everything new in this pass:**
- Zero hardcoded colors below the token block
- Logical properties only
- Persian digits; Latin fragments through the `dir="ltr"` + `unicode-bidi:isolate` path
- Absolute Jalali dates, never relative
- No text overlaid on images
- No flame, fire, trending, urgency, or scarcity devices
- Line-height 1.8 body / 1.5 headings

---

## Build this

### 1. Page header

- `<h1>`: **مگ فایننس**
- Subtitle, `text-secondary`: **تحلیل، گزارش و آموزش برای بازارهای مالی**
- Search entry on the reading-end side: icon-only button at mobile, icon + input at desktop. Placeholder **جستجو در مگ**.
- No background image, no gradient, no decorative rule beneath.

The search input is a real `<form>`-less control for this artifact — a labelled input plus a submit link/button. Give it a visible label for screen readers even if visually hidden.

### 2. Latest articles grid

- Section heading `<h2>`: **تازه‌ترین‌ها**
- Grid: `1` col <768px · `2` cols 768–1279px · `3` cols ≥1280px
- Gap: `var(--gap-grid-mobile)` / `var(--gap-grid)`
- Six `ArticleCard`s from Pass 1, unchanged
- Cards in a row end at equal height regardless of title length

The section component owns the page padding (`20px` / `100px`); the card must not assume it.

### 3. Reports & monthlies band

- Heading `<h2>`: **گزارش‌ها و ماهنامه‌ها**, with **همه گزارش‌ها ←** on the reading-end side. **The chevron must point in the RTL reading direction** — it flips relative to an LTR layout.
- Cover cards: `3:2` — *see note below*. Horizontal scroll with snap at all breakpoints, using the same `mask-image` edge-fade technique approved in Pass 2.
- Each cover card: cover image, title (2-line clamp), and issue/date line. No market chip — these aren't market-scoped.
- **If fewer than three reports exist, the whole section is hidden.** Build that empty case as a visible state in the board so the rule is unambiguous.

> **Aspect ratio decision needed from you.** The spec originally said `3:4` (portrait, PDF-cover shape). But the current Mag has no report covers, and there's no confirmed source for these artifacts yet (open question #5 — whether reports are a WordPress CPT inside Mag or live elsewhere). Build `3:4` as specified, but if you think a different ratio reads better beside the 16:9 grid above it, show both and say which you'd pick and why.

### 4. Newsletter CTA

Copy is final and brand-checked. Do not rewrite it:

> **خلاصه هفتگی بازارها**
> هر هفته یک ایمیل: چه چیزی در بازارها اتفاق افتاد و چرا.
> `[ ایمیل شما ]` `[ عضویت ]`
> هر زمان بخواهید می‌توانید لغو عضویت کنید.

- Container: `surface-raised` + `border-subtle`. **No full-bleed accent panel** — too loud for this brand.
- Desktop: input and button on one row. Mobile: stacked, button full-width.
- Build three states: **default**, **inline validation error**, **success**.
- Error copy: **ایمیل معتبر نیست. آدرس را بررسی کنید.** — states the problem and the fix, no apology.
- Success: **عضو شدید** — same verb as the button label.
- Error state must be announced (`role="alert"` or `aria-live`), and the input associated with its message via `aria-describedby`.
- No subscriber-count boast, no scarcity, no profit language.

### 5. Pagination

Real paginated links (`/mag/page/2`), not an infinite-scroll button — crawlable and back-button-safe.

- Numbered pages with prev/next. **Chevrons flip for RTL.**
- Current page marked with `aria-current="page"`, using the same selected treatment as the filter chip (`accent` fill).
- Interactive boundaries use `--border-interactive`, consistent with Pass 2.
- 44px touch targets.
- Show a truncated state (e.g. ۱ ۲ ۳ … ۱۲) so long ranges are covered.

### 6. Page states

Three full-page states, each rendered at desktop width:

| State | Content |
|---|---|
| **Loading** | Six card skeletons in the grid. Filter bar and header render normally — they don't depend on article data. |
| **Empty (filtered)** | **هنوز مطلبی در این بازار منتشر نشده.** plus a link **همه مطالب**. An empty screen must offer an exit. |
| **Error** | **بارگذاری مطالب انجام نشد.** plus a **تلاش دوباره** button. States what happened, offers the fix, doesn't apologise. |

Empty and error states occupy the grid region only — header, filter bar, newsletter and footer regions stay intact.

### 7. Full page assembly

Everything stacked in final order, at `1280px` and `390px`:

```
Page header → Lead block (Pass 2) → Filter bar (Pass 2) →
تازه‌ترین‌ها grid → Reports band → Newsletter CTA → Pagination
```

- Horizontal page padding: `20px` mobile / `100px` desktop
- Vertical section spacing: `60px` mobile / `96px` desktop
- **These spacing values are non-negotiable** — they're the global baseline from `layout.md`, not a suggestion for this page.
- Sections are separated by whitespace, not by full-bleed background blocks.

Heading hierarchy across the assembled page: one `<h1>` (page header), `<h2>` for section headings **and** the featured card title, `<h3>` for secondary and grid card titles. Verify there's no level skip.

---

## Sample content

Reuse all nine article records from Passes 1 and 2. For the grid, use the six Pass 1 records so long/short title alignment stays exercised.

Reports band — three sample items:

| Title | Issue |
|---|---|
| ماهنامه بازارهای مالی — مرداد ۱۴۰۵ | شماره ۱۲ |
| گزارش فصلی صنعت بانکداری | بهار ۱۴۰۵ |
| مروری بر بازار مسکن تهران | تیر ۱۴۰۵ |

---

## Deliverable

Single artifact, in this order:

1. Page header — desktop and mobile
2. Latest-articles grid — 3-col, 2-col, 1-col frames
3. Reports band — populated, plus the hidden/under-three case
4. Newsletter CTA — default, error, success; desktop and mobile
5. Pagination — normal and truncated
6. Page states — loading, empty, error
7. Full page assembly — `1280px` and `390px`

Theme toggle across all of it.

---

## Review criteria

- [ ] Zero hardcoded colors below the token block
- [ ] All three themes correct; AA contrast verified in v2 light
- [ ] Page padding 20/100 and section spacing 60/96 exact
- [ ] Grid columns and gaps correct at all three breakpoints; equal card heights per row
- [ ] All chevrons flip for RTL
- [ ] Newsletter error state announced and associated via `aria-describedby`
- [ ] Newsletter copy unchanged from this brief
- [ ] Pagination is real links with `aria-current="page"`
- [ ] Interactive boundaries use `--border-interactive`; 44px targets
- [ ] Loading skeletons match final card geometry
- [ ] Empty and error states offer a way forward
- [ ] Reports band hides entirely below three items
- [ ] Heading hierarchy: single `<h1>`, no level skips
- [ ] Logical properties only; `prefers-reduced-motion` respected
- [ ] No hype devices; no profit or scarcity language
- [ ] `اخبار` still absent
