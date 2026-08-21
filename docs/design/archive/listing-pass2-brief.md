# Claude Design — Mag Listing, Pass 2 Brief

**Pass:** 2 of 3 — Lead block + market filter bar
**Date:** 2026-08-18
**Prerequisite:** Pass 1 approved (all seven corrections verified)
**Source spec:** `mag-listing-design-spec.md` §5.2, §5.3

---

## Carried forward from Pass 1

These are settled. Reuse, don't redesign:

- Token layer, three themes, and the corrected `--focus-ring` (light theme uses the darker accent)
- `MarketChip` — **transparent** background, `border-subtle`, `text-secondary` when unselected; `accent` fill with `accent-contrast` text when selected
- `ContentTypeLabel` — text-only, `text-muted`, separated from the chip by a `·`
- Meta row — read time · date, `text-muted`, pinned to card bottom with `margin-block-start:auto`
- Card link carries no `aria-label`; the title text is the accessible name
- Hover = background + border shift only. No lift, scale, or shadow growth.
- `prefers-reduced-motion` respected

---

## Decision made since Pass 1: «چرا مهم است» is dropped

The original signature element was a one-line editor-written explanation under the lead title. **It is removed.**

Evidence from the current live Mag: card excerpts are auto-truncated mid-sentence («…اگر برای شما سوال است که نات کوین چیست، داستان این پروژه…»). The content team is not writing summaries today. A new mandatory per-article editorial field would predictably ship empty or copy-pasted, and a signature element that's usually absent is worse than no signature element.

**Replacement — «در این مقاله»:** the featured card shows **two or three of the article's own H2 headings** as short lines beneath the title.

Why this works: it requires **zero new editorial habit** — it's derived server-side in the mu-plugin from content that already exists. It is always accurate because it *is* the article's structure. It tells the reader what they'll actually get, which is the same job the dropped line was doing, without depending on anyone remembering to write it. And it's inherently anti-hype: headings are descriptive, not promotional.

**Degradation:** if the article has fewer than two H2s, omit the block entirely and let the card reflow. It must not render an empty region or a partial list of one.

Build both variants in this pass — with the block and without — so the reflow is reviewable.

---

## Constraints derived from the current live Mag

Four rules that come from what the existing content actually looks like, not from theory:

1. **Never overlay text on the article image.** Thumbnails frequently have the title baked into the image already. Any overlaid text will collide or duplicate. Title, chip, and meta all sit outside the image box.
2. **Absolute Jalali dates only** — «۲۷ مرداد ۱۴۰۵», never «۲ روز قبل». Much of Mag is educational content that stays valid for years; relative dates make it look stale.
3. **No flame/fire icons, no heat or trending indicators.** Brand book prohibits urgency devices. If a popularity signal is wanted later, it's a plain view count with no icon.
4. **Titles routinely contain parenthetical Latin** — «نات کوین (Notcoin) چیست؟», «اندیکاتور زیگ زاگ (Zig Zag) چیست؟». Every title must render through the `titleStart` / `titleLtr` / `titleEnd` isolation path. This is the common case, not an edge case.

---

## Build this

### 1. `FeaturedArticleCard`

The single lead article. This element is the page's LCP owner.

**Anatomy** (RTL):

```
┌──────────────────────────────────────┐
│                                      │
│         image — 3:2 fixed            │
│                                      │
├──────────────────────────────────────┤
│  [بورس ایران]  ·  تحلیل              │
│                                      │
│  عنوان اصلی مقاله که تا سه خط        │
│  می‌تواند ادامه پیدا کند             │
│                                      │
│  در این مقاله                        │
│  ─ سرفصل اول از خود مقاله            │
│  ─ سرفصل دوم                         │
│  ─ سرفصل سوم                         │
│                                      │
│  ۱۲ دقیقه · ۲۷ مرداد ۱۴۰۵            │
└──────────────────────────────────────┘
```

- Image: `3:2` fixed box (not 16:9 — the lead gets a taller, more editorial crop)
- Title: `<h2>`, **3-line clamp**, larger than the grid card's `<h3>`
- «در این مقاله»: small `text-muted` label, then 2–3 heading lines at `text-secondary`, each **1-line clamp**. Use a restrained marker — a short dash or inline separator. **Not numbered**, since the headings aren't a ranked sequence.
- Meta row identical in treatment to Pass 1

### 2. `SecondaryArticleCard`

Three of these stack in the narrow column beside the featured card.

**Horizontal layout at all breakpoints** — thumbnail on the reading-start side, text alongside:

```
┌────────────────────────────────────┐
│ ┌────────┐  [طلا و دلار] · تحلیل   │
│ │ 16:9   │  عنوان مقاله که تا دو   │
│ │ thumb  │  خط ادامه دارد          │
│ └────────┘  ۵ دقیقه · ۲۶ مرداد     │
└────────────────────────────────────┘
```

- Thumbnail: `16:9`, fixed width — roughly `120px` desktop, `96px` mobile. Fixed width, not percentage, so the three cards align perfectly.
- Title: `<h3>`, 2-line clamp
- **No «در این مقاله»** — no room, and it would compete with the featured card
- Separated from each other by `border-subtle` dividers, or as discrete cards — your call, but justify it and keep it consistent

### 3. Asymmetric split

- **≥1280px:** featured `~62%` / secondary column `~38%`, gap `24px`. The asymmetry is deliberate — do not drift toward 50/50.
- **1024–1279px:** same split, tighter proportions acceptable
- **<1024px:** stack — featured full width, then the three secondaries beneath it
- **<768px:** same stacked order, thumbnails at `96px`

The featured card and the secondary column must be **equal height** at desktop widths. The secondary cards distribute within their column.

### 4. `MarketFilterBar`

```
[ همه ] [ بورس ایران ] [ طلا و دلار ] [ کریپتو ] [ فارکس ] [ اقتصاد جهانی ] [ مسکن ]
```

- Semantic `<nav>` containing **real `<a>` links** — not buttons. Filtering is navigation; it must work without JS and be crawlable.
- `همه` is the default selected state.
- Selected chip: `accent` fill, `accent-contrast` text, `aria-current="page"`.
- **Unselected chip boundary must measure ≥3:1 against the page surface in all three themes.** This is the open issue from Pass 1: `border-subtle` measures **1.28:1** in v2-light and **1.27:1** in v1 — fine for a passive label on a card, insufficient for an interactive control whose border is its only boundary. `border-strong` only reaches **1.68:1**, so it doesn't solve it either.

  **This likely needs a new system token** — something like `--border-interactive`, sitting between `border-strong` and `text-muted` in weight. Propose values for all three themes and state the measured ratios. Flag it clearly as a system-token addition, not a local override, so it can be logged the same way the focus-ring defect was.

- Touch targets `min-height:44px`.
- **Mobile:** horizontal scroll with scroll-snap. The **currently selected chip must be scrolled into view on load** — a filter bar that opens with the active chip off-screen is a common and frustrating failure.
- **Desktop:** single row; wrap only if it genuinely overflows.
- Scroll affordance at the edge (subtle fade or equivalent) so it's clear there's more — but nothing that looks like a gradient decoration.

---

## Sample content

Reuse the six Pass 1 records. Add these three, drawn from the real Mag so the parenthetical-Latin case and long titles are properly exercised:

| Title | Market | Type | Read | Date |
|---|---|---|---|---|
| نات کوین (Notcoin) چیست؟ راهنمای کامل پروژه و مکانیزم توزیع توکن | کریپتو | آموزش | ۱۰ دقیقه | ۲۱ مرداد ۱۴۰۵ |
| اندیکاتور زیگ زاگ (Zig Zag) چیست؟ | فارکس | آموزش | ۶ دقیقه | ۲۰ مرداد ۱۴۰۵ |
| تحلیل فاندامنتال (Fundamental Analysis) چیست؟ | بورس ایران | آموزش | ۱۴ دقیقه | ۱۹ مرداد ۱۴۰۵ |

Use the long Notcoin title as the featured card so the 3-line clamp is exercised.

Sample «در این مقاله» headings for the featured card:
- نات کوین چگونه کار می‌کند
- مکانیزم توزیع توکن
- ریسک‌های پروژه

---

## Deliverable

Single artifact, in this order:

1. **Featured card** — with the «در این مقاله» block, isolated
2. **Featured card** — without the block (fewer than two H2s), to show the reflow
3. **Secondary card** — default, hover, focus states
4. **Full lead block** — featured + three secondaries at `1280px`, `1024px`, and `390px` frames
5. **Filter bar** — desktop row and mobile scroll state, with the selected chip mid-list to demonstrate scroll-into-view
6. **Token additions** — any new token proposed, with measured contrast ratios for all three themes

Theme toggle across all of it, as in Pass 1.

---

## Out of scope

Latest-articles grid, reports band, newsletter CTA, pagination, page header, search, site shell. Those are Pass 3.

---

## Review criteria

- [ ] Zero hardcoded colors below the token block
- [ ] All three themes correct; new tokens measured and stated
- [ ] Unselected filter chip boundary ≥3:1 in all three themes
- [ ] Featured card reflows cleanly with the «در این مقاله» block absent
- [ ] No text overlaid on any image
- [ ] Absolute Jalali dates; no relative dates
- [ ] No flame, fire, trending, or urgency iconography
- [ ] All titles route through the LTR isolation path
- [ ] Featured `<h2>` clamps at 3 lines; secondary `<h3>` at 2
- [ ] Featured column and secondary column equal height at desktop
- [ ] Filter bar is `<nav>` + real links; `aria-current` on the active chip
- [ ] Selected chip scrolls into view on mobile load
- [ ] 44px touch targets on all filter chips
- [ ] Logical properties only
- [ ] `prefers-reduced-motion` respected
- [ ] `اخبار` still absent
