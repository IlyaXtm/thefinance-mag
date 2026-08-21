# Claude Design — Mag Listing Pass 1: Audit & Corrections

**Reviewed:** `Mag_Listing_-_Pass_1_Cards_dc.html`
**Date:** 2026-08-18
**Verdict:** Strong pass. Three blocking corrections, three should-fix, three notes. Pass 2 is not briefed until the blocking items are resolved.

---

## What passed

| Criterion | Result |
|---|---|
| Zero hardcoded colors below the token block | ✅ Every color is a `var()`. Even the image placeholder gradient uses tokens. |
| Logical properties only | ✅ No `left`/`right` anywhere. `padding-inline`, `margin-block-start`, `border-block-end` used correctly. |
| Persian digits | ✅ Throughout, including section numbers and the Jalali dates. |
| Latin fragment isolation | ✅ `dir="ltr"` + `unicode-bidi:isolate`. The title data is even pre-split into `titleStart` / `titleLtr` / `titleEnd`. Better than asked for. |
| Title clamps at 2 lines; equal card heights | ✅ `line-clamp:2` with `min-height:51px` (17px × 1.5 × 2 = 51 — the math is right). Long and short titles sit in the same row to prove it. |
| Fixed 16:9 image box | ✅ `aspect-ratio:16/9` on every variant including the no-image fallback. |
| Skeleton geometry match | ✅ Same 16:9 box, 30px chip row, 51px title block, meta line. Verifiable at a glance. |
| Hover is border/surface only | ✅ No transform, no scale, no shadow growth. |
| `prefers-reduced-motion` | ✅ Global rule kills transitions *and* the skeleton pulse. |
| Chip vs. type label hierarchy | ✅ `ContentTypeLabel` is text-only `text-muted`; it doesn't compete. |
| Touch targets | ✅ Correctly distinguished: chips on cards are non-interactive spans; the interactive filter-bar variant has `min-height:44px`. |
| Card is one link, no nested CTA | ✅ |
| `اخبار` absent | ✅ And annotated as a deliberate omission pending the product question. |
| Body text contrast | ✅ v2-light `text-muted` on `surface-raised` = **6.43:1**; `text-secondary` = 8.96:1; `text-primary` = 16.98:1. |

---

## Blocking corrections

### C1 — Focus ring fails 3:1 in v2-light *(system-level)*

`--focus-ring:#4D9AFE` is reused unchanged across all three themes. Measured against WCAG 2.2 SC 1.4.11 (non-text contrast, 3:1 minimum for focus indicators):

| Theme | vs `--surface` | vs `--surface-raised` | Result |
|---|---|---|---|
| v1 navy | 6.84 | 6.43 | pass |
| v2 dark | 6.95 | 6.29 | pass |
| **v2 light** | **2.85** | **2.59** | **fail** |

Keyboard focus is effectively invisible on the light theme.

**Fix:** in v2-light, `--focus-ring` must take the darker accent value, not the dark-theme blue. `#1A5FBF` (already the light theme's `--accent`) measures **6.12** / **5.55** and passes comfortably.

**This is not a Mag-local fix.** `--focus-ring` is a system token. Every focus indicator on the light theme site-wide has the same defect. Log it against the design system, the same way the warning-surface token issue was handled during Markets Pass 1 — patch it at the token layer, not per component.

### C2 — `aria-label` doesn't match visible text on one card

`ARTICLES[4]` has inconsistent data:

- `titleFull`: «هالوینگ بیت‌کوین چگونه بر عرضه اثر می‌گذارد» (Persian «بیت‌کوین»)
- split parts render: «هالوینگ **Bitcoin** چگونه بر عرضه اثر می‌گذارد» (Latin)

The anchor's `aria-label` uses `titleFull`, so the screen-reader name and the visible title are **different words**. That's a WCAG 2.5.3 (Label in Name) failure and it will confuse voice-control users.

**Fix:** make `titleFull` the exact concatenation of `titleStart + titleLtr + titleEnd` for every record. Pick one form for this article — recommend the Persian «بیت‌کوین», since the Latin fragment adds nothing here and the split machinery is already proven by the `DXY` record.

**Then:** drop the `aria-label` from the card anchor entirely. The link's content *is* the title, so the accessible name computes correctly from it. Clamping is visual only — the full text node is present. A redundant `aria-label` is one more thing that can drift out of sync.

### C3 — Unselected `MarketChip` is invisible against the card body

The chip uses `background:var(--surface-raised)` and sits inside a card whose body is also `surface-raised`. The chip renders as a bare outlined pill — and its appearance changes depending on what's behind it, which means it isn't a stable component.

In Pass 2 the same chip sits on `--surface` in the filter bar, where it *will* read as a filled pill. Same component, two different appearances.

**This is a token gap, not a styling preference.** The system has no third surface level.

**Fix — pick one and apply consistently:**
- **(a)** Add `--surface-sunken` (one step below `surface-raised` in dark themes, one step above in light) and use it for chips. Cleanest, but it's a new system token — needs sign-off.
- **(b)** Define the chip as intentionally outline-only in both contexts: transparent background, `border-subtle`, `text-secondary`. No new token, guaranteed consistent.

**Recommendation: (b)** for Pass 1. It needs nothing from the design system, it can't drift, and the selected state (`accent` fill) still provides plenty of contrast against it. Revisit only if the filter bar reads as too weak in Pass 2.

---

## Should fix

### C4 — Two different card implementations in one artifact

The states board (§3) positions the meta row with `margin-block-start:12px`; the in-context grid (§4, §5) uses `margin-block-start:auto; padding-block-start:12px`. The `auto` version is correct — it pins the meta row to the bottom so cards with differing content still align.

**Fix:** one implementation. Use the `auto` version everywhere. The states board currently shows something that isn't the real component.

### C5 — Mobile grid gap is hardcoded

`--gap-grid` is defined as `24px`, but the mobile frame writes `gap:16px` literally, and the token board's label reads `24px / 16px موبایل` — describing a token that doesn't exist.

**Fix:** add `--gap-grid-mobile: 16px` (or make `--gap-grid` responsive via media query) and reference it. The token board should describe real tokens only.

### C6 — `--skeleton-strong` missing from the token board and `THEMES`

It's defined in CSS per theme and used for the skeleton title lines, but it isn't in the `THEMES` object and doesn't appear on the token board. The board is meant to be the complete inventory for the find-and-replace swap.

**Fix:** add it to both.

---

## Notes (no action this pass)

**N1 — Font is declared but not loaded.** The stack names Vazirmatn/IRANSans but there's no `@font-face` or `next/font`. Expected in an artifact. Flagging so it isn't forgotten: implementation requires a **self-hosted, subset** Persian face with preload — no Google Fonts, no foreign CDN, per the Iran reachability constraint.

**N2 — No-image fallback repeats the market name.** The placeholder reads «{market} — بدون تصویر» and the chip directly below repeats it. Consider a neutral treatment instead. Cosmetic.

**N3 — `border-subtle` in v2-light measures 1.17:1 against `surface-raised`.** That's below the 3:1 non-text threshold *if* the border is the only thing conveying the card's boundary. Here the `surface-raised` fill already differentiates the card, so it's decorative and acceptable. Recording it so it isn't re-litigated later.

---

## Resubmit checklist

- [ ] C1 — v2-light `--focus-ring` → darker accent; verified ≥3:1 against both `surface` and `surface-raised`
- [ ] C1b — issue logged against the design system as a site-wide light-theme focus defect
- [ ] C2 — `titleFull` matches the rendered split for every record; `aria-label` removed from the card anchor
- [ ] C3 — chip surface treatment unified across contexts (recommend outline-only)
- [ ] C4 — single card implementation; meta row uses `margin-block-start:auto` everywhere
- [ ] C5 — mobile gap tokenized
- [ ] C6 — `--skeleton-strong` added to the token board and `THEMES`

Once these land I'll do the final check and brief Pass 2 (lead block + market filter bar).
