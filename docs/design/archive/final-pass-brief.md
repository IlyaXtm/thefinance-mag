# Claude Design — Mag Archive, Author & Search Pages

**Pass:** Final — the three remaining routes
**Date:** 2026-08-19
**Prerequisite:** Listing Passes 1–3 and Article Passes A–B approved

After this pass the Mag design is complete and work moves to frontend implementation.

---

## The shape of this pass

These three pages are **assembly, not invention**. Almost every element already exists and is approved. The design work here is deciding what sits at the top of each page and what happens when there's nothing to show — not building new components.

If you find yourself designing a new component, stop and check: it's probably already built.

**Reuse without modification:**

| Element | Source |
|---|---|
| `ArticleCard` (grid variant) | Listing Pass 1 |
| `MarketChip`, `ContentTypeLabel`, meta row | Listing Pass 1 |
| Card skeleton | Listing Pass 1 |
| `MarketFilterBar` | Listing Pass 2 |
| Article grid, pagination, empty/error states | Listing Pass 3 |
| Breadcrumbs | Article Pass A |
| Author box | Article Pass B |

**Token layer:** all three themes, `--border-interactive`, `--focus-ring`, `--danger`, `--skeleton` / `--skeleton-strong`, `--radius-card`, `--gap-grid` / `--gap-grid-mobile`.

**Standing rules:** zero hardcoded colors below the token block · logical properties only · Persian digits · Latin fragments isolated · absolute Jalali dates · no text overlaid on images · no italic · no `text-align: justify` · no urgency, scarcity, or profit language · hover is background/border shift only · 44px targets · `prefers-reduced-motion` respected.

---

## 1. Category (market) archive — `/mag/market/<slug>/`

The page a reader lands on from the filter bar or from search results about one market.

**Header:**
- Breadcrumbs: `مگ ← بورس ایران`
- `<h1>`: the market name — **بورس ایران**
- One-line description beneath, `text-secondary`. This is editorial copy per market, e.g. «تحلیل، گزارش و آموزش درباره بازار سهام تهران.»
- Article count, `text-muted`: **۲۴ مطلب**

**No hero image.** An archive is a list, not a story. A decorative banner here costs LCP for nothing.

**Body:** `MarketFilterBar` with this market selected → article grid → pagination. All unchanged from the listing.

**Description field flag:** the per-market description is a taxonomy field that doesn't exist yet in WordPress. Build the page assuming it exists, and also build the variant where it's absent — the `<h1>` and count must sit correctly without it.

---

## 2. Author page — `/mag/author/<slug>/`

**Header:**
- Breadcrumbs: `مگ ← نویسندگان ← مریم رضایی`
- Author identity block: avatar (`1:1`, `80px` desktop / `64px` mobile — larger than the in-article box), `<h1>` with the name, role line, bio (up to three lines)
- Article count: **۱۲ مطلب**

This is a **larger variant of the Pass B author box**, not a new component. Keep the same structure and the same constraints: no follower counts, no social-proof metrics, no superlative claims. Role is factual.

**No market filter bar** — an author's output spans markets, and filtering by market inside an author page is a rare need that adds a control to every page load.

**Body:** article grid → pagination.

**Empty state:** **این نویسنده هنوز مطلبی منتشر نکرده.** plus a link to **همه مطالب**.

---

## 3. Search results — `/mag/search/?q=`

The page with the most states and the least existing design. Give this one the most attention.

**Header:**
- `<h1>`: **نتایج جستجو**
- The search input, pre-filled with the query, prominent and focusable — a reader who lands here often wants to refine immediately
- Result count with the query echoed: **۷ نتیجه برای «تحلیل فاندامنتال»**
- The query must be rendered through the LTR-isolation path — users will search for `P/E`, `Bitcoin`, `S&P 500`, and an unisolated query breaks the sentence

**Body:** article grid → pagination.

**Four states, all required:**

| State | Content |
|---|---|
| **Results** | Count line + grid |
| **Loading** | Count line replaced by a skeleton line; six card skeletons |
| **Empty** | **نتیجه‌ای برای «{query}» پیدا نشد.** plus concrete next steps — see below |
| **No query** | Landed on `/mag/search/` with no `q`. Show the input and a short prompt: **عبارتی برای جستجو وارد کنید.** Do not show an error. |

**The empty state is the important one.** A dead end here loses the reader. It must offer:
- The market chips as browsable entry points (reuse `MarketFilterBar`, none selected)
- A link to **تازه‌ترین مطالب**

Do not suggest spelling corrections or "did you mean" — that implies a capability the backend doesn't have.

---

## Shared requirements

- Page padding `20px` / `100px`; section spacing `60px` / `96px`
- Grid: `3` cols ≥1280px · `2` cols 768–1279px · `1` col mobile; gaps as on the listing
- **Exactly one `<h1>` per page.** Section headings `<h2>`, card titles `<h3>`. No level skips.
- Every page must render correctly with zero results — that's the state most likely to ship broken
- Search input needs a visually-hidden `<label>`, as on the listing

---

## Deliverable

Single artifact:

1. Category archive — with description and without; `1280px` and `390px`
2. Author page — populated and empty; `1280px` and `390px`
3. Search — results, loading, empty, and no-query; `1280px` and `390px`
4. A short note listing which components were reused unchanged and which (if any) needed a new variant, with the reason

Theme toggle across all of it.

---

## Out of scope

Site header and footer, the Mag home listing, the article page, in-body blocks. All previously delivered.

---

## Review criteria

- [ ] Zero hardcoded colors below the token block; all three themes correct
- [ ] `ArticleCard`, filter bar, pagination, breadcrumbs and skeletons reused **unchanged**
- [ ] Author identity block is a size variant of the Pass B box, not a new component
- [ ] Exactly one `<h1>` per page; no heading level skips
- [ ] Search query rendered through the LTR-isolation path
- [ ] All four search states built, including no-query
- [ ] Empty search state offers browsable routes onward, no "did you mean"
- [ ] Author page has no filter bar; archive page has one, correctly pre-selected
- [ ] Archive renders correctly without the market description
- [ ] No hero images on archive or author pages
- [ ] No follower counts or superlative claims on the author page
- [ ] Spacing 20/100 and 60/96 exact
- [ ] Logical properties only; 44px targets; `prefers-reduced-motion` respected
