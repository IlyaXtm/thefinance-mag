# Mag — Listing / Home Page Design Spec (v0.1)

**Route:** `thefinance.ir/mag`
**Status:** Draft for review · **Date:** 2026-08-18
**Companion docs:** `layout.md`, `skill.md`, Mag architecture decision brief, brand book (شناسنامه برند)

---

## 1. Scope

This spec covers **only the Mag home / listing page**. Single article, category archive, author, and search pages are out of scope and will be specified separately.

**The page's single job:** let a reader who arrived from Google, the site nav, or Telegram find the one thing worth reading right now, and understand within one screen that this is a multi-market analysis publication — not a signal channel.

**Explicitly not in scope:** header, footer, and theme switcher. These are inherited unchanged from the redesign shell. Mag does not get its own chrome.

---

## 2. Inherited constraints (non-negotiable)

### 2.1 Theming
Mag **inherits the active site theme** and must render correctly in all three: `v1 navy dark`, `v2 dark`, `v2 light`.

- **No hardcoded color values anywhere.** Every color comes from the redesign's two-tier semantic token layer.
- The spec below names colors by **semantic role only** (surface, surface-raised, border-subtle, text-primary, text-secondary, text-muted, accent, accent-contrast). Mapping these role names to the actual token identifiers in the redesign bundle is an implementation step — see Open Questions.
- **Do not introduce a Mag-only accent color.** If a section needs separation, use `surface-raised` and `border-subtle`, not a new hue.
- Every surface/text pair must pass **WCAG AA (4.5:1 body, 3:1 large text)** in all three themes. Light theme is the one that usually breaks — check it first, not last.

### 2.2 Layout spacing (from `layout.md`)
| Token | Mobile | Desktop |
|---|---|---|
| Page horizontal padding | `20px` | `100px` |
| Section vertical spacing (top/bottom) | `60px` | `96px` |

No exceptions on this page. Sections are separated by whitespace, not by full-bleed background blocks.

### 2.3 Direction & typography
- **RTL is the base direction**, not a mirrored afterthought. Logical properties only (`padding-inline-start`, `margin-inline-end`, `border-inline-start`) — never `left`/`right`.
- Latin-script fragments (`TradingView`, `Bitcoin`, `S&P 500`, `AI`) appear inline inside Persian sentences. Wrap them in a `<span dir="ltr">` utility so punctuation and parentheses don't scramble.
- **Numbers:** use Persian digits (۱۲۳) for editorial content — dates, read time, counts. Use Latin digits for ticker symbols and price-like values. Pick one rule and enforce it in the component, not per-article.
- Persian webfont must be **self-hosted and subset**, loaded via `next/font` with `font-display: swap` and preloaded for the lead card. No Google Fonts, no foreign CDN (Iran reachability).
- Persian text needs more line-height than Latin. Body copy in cards: `1.8`. Headings: `1.5`. Do not reuse a Latin-tuned type scale unchanged.

### 2.4 Brand book (hard constraints)
The brand book explicitly forbids signal-selling, hype marketing, guaranteed-profit claims, and "شلوغ یا خسته‌کننده" graphics. Applied to this page:

- **No** urgency badges (`فوری`, `هشدار`, `آخرین فرصت`), no countdown timers, no flame/rocket iconography.
- **No** performance claims anywhere in CTA copy ("سود", "بازدهی", "تضمین").
- **No** live price ticker strip. It's an API dependency, it invites a signal-channel reading of the page, and it competes with the editorial content for attention. If market data is wanted later it belongs in InChart, not in Mag.
- Tone: calm, explanatory, data-anchored. A reader should feel informed, not urged.

---

## 3. The organizing idea

Most magazine listings organize by generic category. This one organizes by **market**, because multi-market coverage is the actual product differentiator (بورس ایران، طلا و دلار، کریپتو، فارکس، اقتصاد جهانی، مسکن) and it's how the reader already thinks about their portfolio.

Two structural devices carry real information and appear on every card:

1. **Market label** — which market the piece is about. This is the primary filter axis.
2. **Content type** — `تحلیل` / `گزارش` / `آموزش` / `اخبار`. This sets the reader's expectation of what they're about to get, and it's the honest alternative to hype badges.

Deliberately **not** used: numbered markers (`۰۱ / ۰۲ / ۰۳`). The articles are not a sequence, so numbering them would be decoration pretending to be structure.

### Signature element — «چرا مهم است»
The lead article and the three secondary lead cards each carry **one plain sentence beneath the title explaining why the piece matters**, written by the editor.

Why this is the signature: it is the anti-hype move made visible. A signal channel writes "طلا در آستانه جهش". This page writes "چرا مهم است: نرخ بهره آمریکا هفته آینده اعلام می‌شود و مستقیماً بر قیمت طلای داخلی اثر می‌گذارد." It is explanation, not prediction — which is exactly the brand's stated position, and it gives the reader a reason to click that isn't curiosity-bait.

**It is a content contract, not a design flourish:** this maps to a required WordPress field (`whyItMatters`, max ~120 chars, plain text, no formatting). If the field is empty the line is omitted and the card reflows — it must not render an empty row. Editors need to be told about this field in the Phase 5 runbook.

---

## 4. Page anatomy

Section order, top to bottom:

1. Page heading + search entry
2. Lead block (1 featured + 3 secondary)
3. Market filter bar
4. Latest articles grid
5. Reports & monthlies band
6. Newsletter CTA
7. Load more / pagination

### 4.1 Desktop wireframe (≥1280px, RTL — content flows right to left)

```
│←100px→                                                        ←100px→│
┌──────────────────────────────────────────────────────────────────────┐
│                                          مگ فایننس        [ جستجو ⌕ ] │
│                     تحلیل، گزارش و آموزش برای بازارهای مالی           │
├──────────────────────────────────────────────────────────────────────┤  60/96
│  ┌────────────────────────────────┐  ┌────────────────────────────┐  │
│  │                                │  │ ▭ [طلا و دلار] تحلیل        │  │
│  │        LEAD IMAGE (3:2)        │  │   عنوان مقاله دو خطی        │  │
│  │                                │  │   ۵ دقیقه · ۲۷ مرداد        │  │
│  │                                │  ├────────────────────────────┤  │
│  └────────────────────────────────┘  │ ▭ [کریپتو] گزارش            │  │
│  [بورس ایران]  تحلیل                 │   عنوان مقاله دو خطی        │  │
│  عنوان اصلی مقاله، حداکثر دو خط      │   ۸ دقیقه · ۲۶ مرداد        │  │
│  چرا مهم است: یک جمله توضیحی…        ├────────────────────────────┤  │
│  ۱۲ دقیقه مطالعه · ۲۷ مرداد ۱۴۰۵     │ ▭ [فارکس] آموزش             │  │
│                                      │   عنوان مقاله دو خطی        │  │
│                                      │   ۶ دقیقه · ۲۵ مرداد        │  │
│                                      └────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤  96
│  [ همه ] [ بورس ایران ] [ طلا و دلار ] [ کریپتو ] [ فارکس ] [ … ]    │
├──────────────────────────────────────────────────────────────────────┤  96
│  تازه‌ترین‌ها                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                        │
│  │  ▭ 16:9   │  │  ▭ 16:9   │  │  ▭ 16:9   │                        │
│  │ [تگ] نوع  │  │ [تگ] نوع  │  │ [تگ] نوع  │                        │
│  │ عنوان     │  │ عنوان     │  │ عنوان     │                        │
│  │ ۶ دقیقه   │  │ ۶ دقیقه   │  │ ۶ دقیقه   │                        │
│  └───────────┘  └───────────┘  └───────────┘                        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                        │
│  │    …      │  │    …      │  │    …      │                        │
│  └───────────┘  └───────────┘  └───────────┘                        │
├──────────────────────────────────────────────────────────────────────┤  96
│  گزارش‌ها و ماهنامه‌ها                              همه گزارش‌ها ←    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │ ▭ جلد ۳:۴    │ │ ▭ جلد ۳:۴    │ │ ▭ جلد ۳:۴    │   → افقی اسکرول │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
├──────────────────────────────────────────────────────────────────────┤  96
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  خلاصه هفتگی بازارها                                            │  │
│  │  هر هفته یک ایمیل: چه چیزی در بازارها اتفاق افتاد و چرا.        │  │
│  │  [ ایمیل شما            ]  [ عضویت ]                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤  96
│                        [ مطالب بیشتر ]                               │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Mobile wireframe (<768px)

```
│←20px→                              ←20px→│
┌──────────────────────────────────────────┐
│  مگ فایننس                          [⌕] │
│  تحلیل، گزارش و آموزش برای بازارها       │
├──────────────────────────────────────────┤ 60
│  ┌────────────────────────────────────┐  │
│  │        LEAD IMAGE (3:2)            │  │
│  └────────────────────────────────────┘  │
│  [بورس ایران]  تحلیل                     │
│  عنوان اصلی مقاله                        │
│  چرا مهم است: یک جمله توضیحی…            │
│  ۱۲ دقیقه · ۲۷ مرداد                     │
├──────────────────────────────────────────┤ 40
│  ┌────────────────────────────────────┐  │
│  │ ▭  [طلا و دلار] تحلیل              │  │  ← افقی: تصویر کوچک
│  │ 96 عنوان دو خطی · ۵ دقیقه          │  │     سمت راست
│  └────────────────────────────────────┘  │
│  (× ۳ کارت ثانویه)                       │
├──────────────────────────────────────────┤ 60
│  ← [همه][بورس ایران][طلا و دلار][…]  →   │  ← اسکرول افقی، snap
├──────────────────────────────────────────┤ 60
│  تازه‌ترین‌ها                             │
│  ┌────────────────────────────────────┐  │
│  │  ▭ 16:9                            │  │
│  │  [تگ] نوع · عنوان · ۶ دقیقه        │  │
│  └────────────────────────────────────┘  │
│  (تک‌ستونه، ۱۶px فاصله)                  │
├──────────────────────────────────────────┤ 60
│  گزارش‌ها و ماهنامه‌ها          همه ←     │
│  ← [جلد][جلد][جلد]  اسکرول افقی      →   │
├──────────────────────────────────────────┤ 60
│  خلاصه هفتگی بازارها                     │
│  [ ایمیل شما          ]                  │
│  [        عضویت        ]                 │  ← تمام‌عرض
├──────────────────────────────────────────┤ 60
│         [ مطالب بیشتر ]                  │
└──────────────────────────────────────────┘
```

---

## 5. Section specs

### 5.1 Page heading + search
- `<h1>`: **مگ فایننس**
- Subtitle (`text-secondary`): **تحلیل، گزارش و آموزش برای بازارهای مالی**
- Search: icon-only button on mobile, icon + placeholder field on desktop. Placeholder: **جستجو در مگ**. Submitting routes to `/mag/search?q=`.
- No background image, no gradient, no decorative divider under the heading.

### 5.2 Lead block
- **Featured (1):** image `3:2`, `priority` loading — this is the LCP element. Market chip + content-type label, `<h2>` title (max 2 lines, clamp), «چرا مهم است» line (`text-secondary`, max 2 lines, clamp), meta row (read time · date).
- **Secondary (3):** stacked vertically beside the featured on desktop; on mobile they become horizontal cards with a small thumbnail on the reading-start side. Chip + type + title (2-line clamp) + meta. **No «چرا مهم است» on secondary cards on mobile** — it pushes the fold too far down.
- Desktop split: featured `~62%` / secondary column `~38%`. The asymmetry is the point; do not make it 50/50.
- The whole card is one link. Do not nest a separate CTA button inside a clickable card.

### 5.3 Market filter bar
- Chips: `همه` (default, selected) + market taxonomy terms.
- Horizontally scrollable with scroll-snap on mobile; wraps to a single row on desktop. Selected state uses `accent` background + `accent-contrast` text; unselected uses `surface-raised` + `text-secondary` with `border-subtle`.
- Filtering **must update the URL** (`/mag?market=gold` or a route segment) so the state is shareable and crawlable. Client-only filtering is not acceptable.
- Rendered as a `<nav>` with real links, not buttons, so it works without JS and is crawlable.

### 5.4 Latest articles grid
- Section heading: **تازه‌ترین‌ها** (`<h2>`)
- Grid: `1` col <768px · `2` cols 768–1279px · `3` cols ≥1280px
- Gap: `16px` mobile / `24px` desktop
- Card: image `16:9` (fixed aspect ratio, `object-fit: cover`), market chip + content type, `<h3>` title (2-line clamp), meta row (read time · date). No excerpt — the title and the type label carry the load, and excerpts make the grid ragged.
- Card surface: `surface-raised` with `border-subtle`, radius from the existing token scale. Hover: subtle border/`surface` shift only. **No lift/scale/shadow-grow animation** — reads as templated and adds motion cost for nothing.
- All cards in a row must be equal height. Titles clamp; they do not shrink the image.

### 5.5 Reports & monthlies band
- Heading **گزارش‌ها و ماهنامه‌ها** with a `همه گزارش‌ها ←` link on the reading-end side (chevron must flip in RTL).
- Cover-style cards, `3:4` aspect, horizontal scroll with snap on all breakpoints. These are a distinct artifact type (PDF-style covers) and deserve a distinct shape from the article grid.
- If fewer than 3 reports exist, hide the section entirely rather than rendering a sparse row.

### 5.6 Newsletter CTA
Copy — final, brand-checked:

> **خلاصه هفتگی بازارها**
> هر هفته یک ایمیل: چه چیزی در بازارها اتفاق افتاد و چرا.
> `[ ایمیل شما ]` `[ عضویت ]`
> فوتنوت: هر زمان بخواهید می‌توانید لغو عضویت کنید.

- No profit language, no scarcity, no subscriber-count boast.
- Button label `عضویت` → success toast must read `عضو شدید` (same verb through the flow).
- Inline validation. Error copy states the problem and the fix: **ایمیل معتبر نیست. آدرس را بررسی کنید.** — no apology, no vagueness.
- Container: `surface-raised` + `border-subtle`. Full-bleed accent panel is too loud for this brand.

### 5.7 Load more / pagination
- Prefer **real paginated links** (`/mag/page/2`) over an infinite-scroll button — crawlable, back-button-safe.
- If a `مطالب بیشتر` button is used, it must still be backed by a real `<a href>` to the next page for no-JS and crawler access.

---

## 6. Component inventory & reuse

| Component | Source | Notes |
|---|---|---|
| `MagPageHeader` | new — `app/mag/_components/` | h1 + subtitle + search entry |
| `MagSearchEntry` | reuse input from `src/shared/ui` | wrapper is new |
| `FeaturedArticleCard` | new — `features/mag` | LCP owner; `priority` image |
| `SecondaryArticleCard` | new — `features/mag` | horizontal variant on mobile |
| `ArticleCard` | new — `features/mag` | grid variant; `standard` \| `compact` |
| `MarketChip` | extend `src/shared/ui` tag/chip | add `selected` state if absent |
| `ContentTypeLabel` | new, small — `features/mag` | text-only, not a colored badge |
| `MarketFilterBar` | new — `features/mag` | `<nav>` + links, URL-driven |
| `ArticleGrid` | new — `features/mag` | responsive grid + skeleton states |
| `ReportsBand` | new — `features/mag` | scroll-snap carousel |
| `NewsletterCta` | new — `features/mag` | brand-locked copy |
| `Pagination` | reuse/extend `src/shared/ui` | RTL chevron flip |
| Buttons, inputs, typography, image wrapper, skeleton, section container | reuse `src/shared/ui` | no new primitives |

Per `skill.md`: page file orchestrates sections only. All data access goes through `features/mag/api/v1/mag.service.ts` via `queries/use-mag-*.swr.ts`. **No `fetch()` in components; no direct mock import in page files.** Build against `NEXT_PUBLIC_USE_MOCK=true` first.

---

## 7. States

| State | Behavior |
|---|---|
| **Loading** | Skeletons matching final card geometry exactly (same aspect ratios, same line counts). Never a centered spinner — it guarantees layout shift. |
| **Empty (filtered)** | `هنوز مطلبی در این بازار منتشر نشده.` + link `همه مطالب`. An empty screen is an invitation to act. |
| **Empty (unfiltered)** | Should be impossible in production; render the same pattern rather than a blank page. |
| **Error** | `بارگذاری مطالب انجام نشد.` + `تلاش دوباره` button. States what happened, offers the fix, does not apologize. |
| **Partial** | If the reports band or lead block has no data, hide that section — never render an empty heading. |

Reduced motion: respect `prefers-reduced-motion` — disable scroll-snap smoothing and any hover transitions.

---

## 8. Performance & SEO constraints

These are design constraints because SEO/CWV is the #1 priority for Mag.

- **LCP** = the featured article image. `priority`, `next/image`, correct `sizes`, modern format. Target ≤2.5s on mobile.
- **CLS**: every image has a fixed aspect-ratio box. Fonts preloaded with a matched fallback metric. Filter chips must not reflow the grid height on selection. Target ≤0.1.
- **INP**: filtering is navigation, not client-side JS churn. Target ≤200ms.
- Semantic structure: one `<h1>`, section headings as `<h2>`, card titles as `<h3>`. Cards are `<article>` elements.
- Every card link has a meaningful accessible name — not `ادامه مطلب`.
- Section headings are real headings, not styled `<div>`s.

---

## 9. Accessibility floor

- Visible keyboard focus ring on every interactive element, using an existing focus token — check it against all three themes.
- Filter chips are keyboard-navigable links with `aria-current="page"` on the active one.
- Horizontal scroll regions are keyboard-scrollable and are not the only path to content (the reports band has a `همه گزارش‌ها` link).
- Contrast checked in `v2 light` specifically — `text-muted` on `surface-raised` is the likely failure.
- Touch targets ≥44px.

---

## 10. Data contract required from WordPress

Per article card, the listing needs:

`title` · `slug` · `excerpt` (unused on cards, kept for meta) · `featuredImage {url, alt, width, height}` · `market` (taxonomy term) · `contentType` (taxonomy or ACF select: تحلیل/گزارش/آموزش/اخبار) · `readingTime` (int, minutes) · `publishedAt` · `whyItMatters` (string, ≤120 chars, lead cards only)

**Flagged as new work:** `market`, `contentType`, `readingTime`, and `whyItMatters` are not standard WordPress fields. Per the standing rule — verify the data exists in the source before building the feature — these must be registered (taxonomy or ACF) and confirmed queryable in GraphiQL **before** the components are built, not after. `readingTime` should be computed server-side in the mu-plugin, not in React.

---

## 11. Open questions — need a decision before implementation

1. **Token names.** This spec uses semantic role names (`surface-raised`, `border-subtle`, `text-muted`, `accent-contrast`). Need the actual identifiers from the redesign token bundle, and confirmation that all three themes define every role used here.
2. **Market taxonomy — final list.** Proposed: بورس ایران، طلا و دلار، کریپتو، فارکس، اقتصاد جهانی، مسکن. Matches the brand book's stated multi-market coverage. Confirm or amend.
3. **Content type taxonomy.** Proposed: تحلیل / گزارش / آموزش / اخبار. Is `اخبار` in scope for Mag, or does Khabarchi own news entirely? If Khabarchi owns it, drop the type.
4. **`whyItMatters` field.** Does the content team accept writing this per lead article? If not, the signature element has to change — say so now rather than shipping empty cards.
5. **Reports band source.** Are گزارش‌ها/ماهنامه‌ها a WordPress CPT inside Mag, or a separate system? If separate, this section is deferred.
6. **Persian digits.** Confirm the editorial rule (Persian digits for dates/read time, Latin for symbols/prices).
7. **Pagination vs load-more.** Recommendation is real pagination for SEO. Confirm.
8. **Font.** Which Persian face does the redesign use, and is a subset build already in the repo?

---

## 12. Review checklist (pass one)

- [ ] Renders correctly in `v1 navy dark`, `v2 dark`, `v2 light`
- [ ] Zero hardcoded colors
- [ ] Spacing matches `layout.md` exactly at both breakpoints
- [ ] Logical properties only; no `left`/`right`
- [ ] RTL verified: chevrons, scroll direction, mixed Latin/Persian strings
- [ ] AA contrast verified in light theme
- [ ] No hype copy, no profit language, no urgency devices
- [ ] Filter state lives in the URL
- [ ] Skeletons match final geometry
- [ ] Lead image is `priority`; all images have fixed aspect ratios
- [ ] All data flows through `mag.service.ts`; builds with `NEXT_PUBLIC_USE_MOCK=true`
