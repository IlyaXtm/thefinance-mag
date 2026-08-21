# Claude Design — Mag Article Page, Pass B Brief

**Pass:** B of B — In-body custom blocks, author box, related articles, share, article-page states
**Date:** 2026-08-18
**Prerequisite:** Article Pass A approved
**Related:** `mag-design-article-passA-brief.md`, `mag-roadmap.md` (Phase 4)

---

## Why these components specifically

The three in-body blocks in this pass are not decoration — they are **the entire custom-block library the content team will get**. The roadmap deliberately caps Phase 4 at Callout, Disclaimer, and CTA; chart embeds and product cards are deferred until editors actually ask for them.

That makes this the highest-stakes design pass in the project. Whatever is built here defines what an editor can express in an article without a developer. If a block is awkward, editors work around it with raw formatting and the page drifts off-brand.

---

## Carried forward — reuse, do not redesign

**Token layer:** all three themes, `--border-interactive`, `--focus-ring`, `--danger`, `--skeleton` / `--skeleton-strong`, `--radius-card`.

**Approved components:** `ArticleCard` (grid variant, Pass 1) · `MarketChip` · `ContentTypeLabel` · meta row · article body type scale from Pass A (p 18/17 at 1.9, h2 24/22, h3 20/19, content column 700px).

**Persian typography rules from Pass A still bind:** no italic anywhere · no `text-align: justify` · real font weights only · ZWNJ must render · line-height 1.9 body / 1.5 headings.

**Standing rules:** zero hardcoded colors below the token block · logical properties only · Persian digits · Latin fragments isolated · absolute Jalali dates · no text overlaid on images · no urgency, scarcity, or profit language · hover is background/border shift only · `prefers-reduced-motion` respected.

---

## Build this

### 1. `Callout` block

General-purpose editorial aside — a definition, a clarification, a worked example.

- Sits inline in the body at content-column width.
- Distinguished by `surface-raised` + `border-inline-start` in `--accent`, not by a coloured fill.
- Optional short title (bold weight, not a heading level — it must not disturb the `<h2>`/`<h3>` outline or the ToC).
- Body text one step smaller than article body (`17px` desktop) at line-height 1.9.
- Supports paragraphs and lists inside. Show both.
- **One variant only.** Do not build info/warning/success/error colour variants — that's four decisions an editor has to make correctly every time, and three of them will be wrong. If a warning is genuinely needed later it can be added deliberately.

### 2. `Disclaimer` block

The compliance block. Iranian securities law and the brand book both prohibit signal-selling and guaranteed-return claims, so investment-related articles carry a standing disclaimer.

- **Visually distinct from Callout** — an editor must never confuse the two. Suggest `border-subtle` all round on `--surface` with a small icon-free label, deliberately quieter than a Callout.
- Fixed copy, **not editor-editable**. Editors insert the block; they do not write its text. Show this constraint in the board.
- Proposed text: **این مطلب صرفاً جنبه آموزشی و اطلاع‌رسانی دارد و توصیه به خرید یا فروش نیست. مسئولیت هر تصمیم سرمایه‌گذاری بر عهده خود شماست.**
- Smaller type (`15px`), `text-secondary`, line-height 1.8.
- Typically the last element before the author box, but insertable mid-body — show both positions.

### 3. `CTA` block

Points readers to InChart, Academy, or a specific tool.

- `surface-raised` + `border-subtle`, contained — **not full-bleed, not accent-filled**.
- Short heading, one line of description, one button.
- **Brand-locked copy rules:** no profit language, no urgency, no scarcity, no "فرصت". The value proposition is the tool's capability, not an outcome.
- Sample: **ابزار تحلیل چندبازاره** / «نمودار بورس ایران، طلا، کریپتو و فارکس در یک ابزار.» / button **اینچارت را ببینید**
- Show a second sample pointing at Academy so the block reads as reusable, not InChart-specific.
- Button uses the approved interactive treatment; 44px target.

### 4. Author box

- Sits after the article body, before related articles.
- Avatar (`1:1`, `56px` desktop / `48px` mobile), name, one-line role, optional two-line bio.
- Name links to `/mag/author/<slug>/`.
- **No follower counts, no social-proof metrics, no "expert" claims.** Role is factual — «تحلیل‌گر بازار سرمایه», not «بهترین تحلیل‌گر».
- Graceful state when no avatar exists: initial-based placeholder that keeps the box height stable.

### 5. Related articles

- Heading `<h2>`: **مطالب مرتبط**
- Three `ArticleCard`s from Pass 1, unchanged. Do not invent a new card.
- Grid: `3` cols ≥1280px · `2` cols 768–1279px · `1` col mobile. Same gaps as the listing.
- **If fewer than three related articles exist, hide the section entirely** — same rule as the reports band. Build that case.

### 6. Share

- Placement: after the body, near the author box. **Not a floating sticky rail** — it competes with the ToC and adds motion cost.
- Native platform links only: Telegram, WhatsApp, X, copy-link. No third-party widget scripts (they're render-blocking, they leak data, and several are unreachable from Iran).
- Icon buttons with accessible names (`aria-label`), 44px targets, `border-interactive` boundaries.
- Copy-link needs a confirmed state — **کپی شد** — announced via `aria-live`.

### 7. Article page states

| State | Treatment |
|---|---|
| **Loading** | Skeleton matching Pass A geometry: breadcrumb line, chip row, three title lines, meta line, 3:2 hero box, then paragraph lines. ToC column shows its own skeleton at desktop. |
| **Error** | **بارگذاری مقاله انجام نشد.** + **تلاش دوباره**. States what happened, offers the fix, no apology. |
| **Not found (404)** | **این مقاله پیدا نشد.** + links to **مگ** and the market archive. A 404 must offer a route onward, never a dead end. |

### 8. Full assembly

Article page end-to-end at `1280px` and `390px`:

```
Breadcrumbs → header → hero → [ToC | body with blocks inline] →
Disclaimer → Share → Author box → Related articles
```

- Page padding `20px` / `100px`; section spacing `60px` / `96px` below the body.
- Heading outline must stay clean: single `<h1>` (article title), `<h2>` for body sections **and** «مطالب مرتبط», `<h3>` for card titles. **Callout and CTA titles are not heading elements** — verify no level skip and no ToC pollution.

---

## Sample content

Continue the Pass A article — «تحلیل فاندامنتال (Fundamental Analysis) چیست؟». Place a Callout inside «صورت‌های مالی و نسبت‌های کلیدی», a CTA after «تفاوت آن با تحلیل تکنیکال», and the Disclaimer at the end.

Author: **مریم رضایی** · «تحلیل‌گر بازار سرمایه» · two-line factual bio.

Related articles: reuse three records from Passes 1–2 (the Zig Zag, Notcoin, and gold/interest-rate pieces).

---

## Deliverable

Single artifact:

1. Callout — with title and without; containing a paragraph and containing a list
2. Disclaimer — end-of-article and mid-body positions
3. CTA — the InChart sample and the Academy sample; desktop and mobile
4. Author box — with avatar and without; desktop and mobile
5. Related articles — three-card row and the hidden under-three case
6. Share — default and copy-confirmed states
7. Article states — loading, error, 404
8. Full assembly — `1280px` and `390px`

Theme toggle across all of it.

---

## Review criteria

- [ ] Zero hardcoded colors below the token block; all three themes correct
- [ ] No italic; no justify; real font weights
- [ ] Callout has exactly one variant — no colour-coded severity set
- [ ] Callout and Disclaimer are unmistakably different from each other
- [ ] Disclaimer copy is fixed and marked non-editable
- [ ] Callout and CTA titles are not heading elements; ToC is unaffected
- [ ] CTA copy contains no profit, urgency, or scarcity language
- [ ] Author box carries no follower counts or superlative claims
- [ ] Related articles reuse the Pass 1 `ArticleCard` unchanged
- [ ] Related section hides entirely below three items
- [ ] Share uses native links only — no third-party widget scripts
- [ ] Copy-link confirmation announced via `aria-live`
- [ ] 404 offers a route onward
- [ ] Loading skeleton matches Pass A geometry
- [ ] Single `<h1>`; no heading level skips in the full assembly
- [ ] Logical properties only; 44px targets; `prefers-reduced-motion` respected
