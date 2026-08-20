# Claude Design — Mag Article Page, Pass A Brief

**Pass:** A of B — Article header, table of contents, long-form body typography
**Date:** 2026-08-18
**Prerequisite:** Listing Passes 1–3 approved
**Related:** `mag-listing-design-spec.md`, `mag-design-pass1/2/3-brief.md`

---

## Why this page matters more than the listing

Search traffic lands on articles, not on the listing. The listing is mostly internal navigation. Since SEO and Core Web Vitals are the #1 priority for Mag, this is the page where LCP, font strategy, and heading structure actually get decided.

It's also the page where the Persian typography problem is real. On the listing every string is clamped to one or two lines. Here we have thousand-word bodies, and Persian long-form has rules that a Latin-tuned type scale gets wrong.

---

## Carried forward — reuse, do not redesign

**Token layer:** all three themes, `--border-interactive`, corrected `--focus-ring`, `--danger`, `--skeleton` / `--skeleton-strong`, `--radius-card`.

**Approved components:** `MarketChip`, `ContentTypeLabel`, meta row treatment, `ArticleCard` (needed in Pass B, not here).

**Rules that still apply:** zero hardcoded colors below the token block · logical properties only · Persian digits · Latin fragments through `dir="ltr"` + `unicode-bidi:isolate` · absolute Jalali dates · no text overlaid on images · no urgency devices · hover is background/border shift only · `prefers-reduced-motion` respected.

---

## Persian long-form typography rules

These are the substance of this pass. Get them wrong and the page is unreadable regardless of layout.

1. **Never italicise Persian.** There is no true italic for Persian faces; browsers synthesise a slant that looks broken. Emphasis is a weight change or a colour change, never `font-style: italic`. This applies to blockquotes and figure captions, which are the two places it usually creeps in.
2. **Never rely on synthetic bold.** Use real weights the loaded face actually ships (400 / 600 / 700). Don't set `font-weight: bold` against a single-weight subset.
3. **Do not justify Persian text.** `text-align: justify` without kashida support produces rivers of whitespace. Use `text-align: start` throughout the body.
4. **ZWNJ (نیم‌فاصله) must render correctly.** Test explicitly with «می‌شود», «نمی‌کند», «کتاب‌ها», «سرمایه‌گذاری». If the font falls back mid-word the ZWNJ breaks visibly — this is the fastest way to spot a font-loading failure.
5. **Line-height is higher than Latin.** Body `1.9`. Headings `1.5`. Lists `1.9`. Captions `1.7`.
6. **Measure:** Persian reads comfortably at roughly `65–75` characters per line. Target a content column of about `680–720px` at desktop. Wider than that and long paragraphs become hard to track.
7. **Body size:** `18px` desktop, `17px` mobile. Smaller than that and Persian diacritic-free text loses legibility.

---

## Build this

### 1. Breadcrumbs

`مگ ← بازار ← عنوان مقاله`

- Semantic `<nav>` with an ordered list, last item `aria-current="page"` and not a link.
- **Separator chevrons must point in the RTL reading direction.**
- Truncate the article title if long; the market segment never truncates.
- `text-muted`, small.

### 2. Article header

Order, top to bottom:

- Breadcrumbs
- `MarketChip` + `ContentTypeLabel`
- `<h1>` — the article title. **This is the page's only `<h1>`.** 2–4 lines, no clamp; the full title always shows.
- Meta row: read time · publish date · **updated date when it differs**
- Hero image

**Updated date is not optional.** Much of Mag is educational content that stays valid for years. An article written in ۱۴۰۳ and revised in ۱۴۰۵ should show both — «منتشر: ۱۲ آبان ۱۴۰۳ · بازبینی: ۲۷ مرداد ۱۴۰۵». It signals maintenance rather than staleness, and it's the honest version of the freshness signal that relative dates fake.

**Hero image:** `3:2`, full content-column width, `--radius-card`. This is the LCP element. **No text overlay** — Mag's images frequently have the title baked in already. No gradient scrim.

Author attribution is **out of scope for this pass** — it belongs with the author box in Pass B.

### 3. Table of contents

Built from the article's `<h2>` headings — the same source as the listing's «در این مقاله» block, so the two never disagree.

**Desktop (≥1024px):** sticky in the inline-end column (the left side in RTL), aligned to the top of the body. Heading **در این مقاله**, then the H2 links.
- Active-section highlight via scroll position. The active item uses `accent` text plus a `border-inline-start` marker — not a background fill, which is too heavy for a sidebar.
- Sticky offset must account for the site header; leave a comment noting the value is a placeholder.
- Do not force `scroll-behavior: smooth` — and if you use it, gate it behind `prefers-reduced-motion`.

**Mobile (<1024px):** a collapsed `<details>` block above the body, summary **در این مقاله**, closed by default. Native disclosure, no custom JS.

**If the article has fewer than two `<h2>`s, omit the ToC entirely** — same rule as the listing lead card. Build that variant.

### 4. Body typography scale

Specify and demonstrate every element below. This is the deliverable's core.

| Element | Desktop | Mobile | Notes |
|---|---|---|---|
| `p` | 18px / 1.9 | 17px / 1.9 | margin-block-end ≈ `1.4em`, no first-line indent |
| `h2` | 24px / 1.5 | 22px / 1.5 | generous `margin-block-start` (≈ `2em`) — it's the section break |
| `h3` | 20px / 1.5 | 19px / 1.5 | |
| `ul` / `ol` | 18px / 1.9 | 17px / 1.9 | `padding-inline-start`; markers on the reading-start side |
| `blockquote` | 18px / 1.9 | 17px / 1.9 | `border-inline-start` in `--accent`, `text-secondary`, **not italic** |
| inline `<a>` | inherit | inherit | `accent` **plus underline** — colour alone isn't sufficient |
| `figure` + `figcaption` | 14px / 1.7 | 14px / 1.7 | caption `text-muted`, below the image, not italic |
| `table` | 16px | 15px | header row on `surface-raised`, horizontally scrollable on mobile, `border-subtle` cell borders |
| `hr` | — | — | `border-subtle`, generous vertical space |
| `strong` | 600 | 600 | real weight |

Also show: two consecutive paragraphs (so paragraph rhythm is visible), an `h2` immediately followed by an `h3`, a list nested one level, and an image with a caption mid-body.

### 5. Layout

- **≥1024px:** content column (max `720px`) + ToC column (`260px`), gap `40px`. Content column sits on the reading-start side.
- **<1024px:** single column, ToC as the collapsed `<details>`.
- Page horizontal padding `20px` / `100px`; the content column is centred within that.
- Section vertical spacing `60px` / `96px` applies between the article body and whatever follows in Pass B.

---

## Sample article

Use a real-shaped article so the typography is tested against actual Persian, not filler.

**Title:** تحلیل فاندامنتال (Fundamental Analysis) چیست؟
**Market:** بورس ایران · **Type:** آموزش · **Read:** ۱۴ دقیقه
**Published:** ۱۲ آبان ۱۴۰۳ · **Updated:** ۲۷ مرداد ۱۴۰۵

H2 headings (these also populate the ToC):
- تحلیل فاندامنتال چیست
- تفاوت آن با تحلیل تکنیکال
- صورت‌های مالی و نسبت‌های کلیدی
- محدودیت‌های این روش

Write two or three real Persian paragraphs per section — explanatory, no predictions, no profit language. Include at least one paragraph containing ZWNJ-heavy words («می‌شود», «نمی‌کند», «سرمایه‌گذاری», «کتاب‌ها») and at least one with an inline Latin fragment («نسبت P/E», «شاخص S&P 500»).

Include one table (a small ratio comparison), one blockquote, one bulleted list, and one mid-body image with caption.

---

## Deliverable

Single artifact:

1. Breadcrumbs — normal and long-title truncation
2. Article header — desktop and mobile, including the published/updated meta variant
3. ToC — desktop sticky (with an active item), mobile `<details>` collapsed and open, and the omitted variant
4. Body typography specimen — every element from the table above, labelled
5. Full article page assembly — `1280px` and `390px`
6. A short note stating the content column width and characters-per-line you landed on

Theme toggle across all of it.

---

## Out of scope — Pass B

Custom in-body blocks (Callout, Disclaimer, CTA), author box, related articles, share buttons, comments, article-page loading/error states.

---

## Review criteria

- [ ] Zero hardcoded colors below the token block; all three themes correct
- [ ] No `font-style: italic` anywhere
- [ ] No `text-align: justify`
- [ ] ZWNJ renders correctly in the sample text
- [ ] Body 18/17px at line-height 1.9; measure lands in the 65–75 character range
- [ ] Single `<h1>`; body headings are `<h2>`/`<h3>` with no level skip
- [ ] ToC source is the article's own `<h2>`s; omitted below two headings
- [ ] ToC active state uses text + border marker, not a fill
- [ ] Mobile ToC is a native `<details>`, closed by default
- [ ] Breadcrumb chevrons point in the RTL reading direction; last item `aria-current="page"`
- [ ] Updated date shown when it differs from publish date
- [ ] Hero is 3:2 with no text overlay and no scrim
- [ ] Inline links are underlined, not colour-only
- [ ] Tables scroll horizontally on mobile without breaking the page
- [ ] Logical properties only; `prefers-reduced-motion` respected
- [ ] No urgency devices, no profit or prediction language in the sample copy
