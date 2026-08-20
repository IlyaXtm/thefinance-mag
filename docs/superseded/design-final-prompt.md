Design the complete UI/UX for a Persian-language (RTL) financial magazine — "مگ فایننس" at thefinance.ir/mag. Every route, every component, every state. This is a production design-system deliverable, not a mockup.

════════════════════════════════════════════════════════
PART 1 — CONTEXT AND COMPETITIVE POSITION
════════════════════════════════════════════════════════

TheFinance is an Iranian multi-market financial analysis platform covering the Tehran Stock Exchange, gold and FX, crypto, forex, global macro, and housing. Mag is its magazine: analysis, reports, and education. All content is Persian, RTL.

The brand is explicitly ANTI-HYPE. Signal-selling and guaranteed-return claims are prohibited both by Iranian securities law and by the brand book. The tone is calm, explanatory, data-anchored. A reader should feel informed, never urged. This is a hard constraint, not a stylistic preference.

WHAT THE COMPETITION DOES — and why we can't copy it

Persian financial content sites (farachart, khanesarmaye, pcmfa.blog, arzdigital, iranicard, various trader academies) converge on the same playbook:

1. Engagement metrics as the click driver — view counts and comment counts printed on every listing item.
2. Signal-selling as the conversion mechanic — newsletters promising exclusive trading signals and "unmatched investment opportunities," articles rating signal channels by "win rate."
3. One content format — endless «X چیست؟» and «از صفر تا صد» SEO explainers, indistinguishable from each other.
4. Bloated, overlapping taxonomies — one site lists 20+ categories mixing crypto with cars, health, tourism and architecture.
5. Auto-truncated excerpts — summaries cut mid-sentence because nobody writes them.

Both of their primary mechanics — engagement metrics and profit promises — are unavailable to us. That is a constraint, but it is also the opening: it forces differentiation into STRUCTURE, which is the one thing a competitor can't copy without abandoning their business model.

THE DESIGN POSITION

Mag competes on editorial integrity made visible and on cross-market thinking made navigable. Concretely:

- NO view counts, NO comment counts, NO trending indicators, NO flame icons. Their absence is the statement. Do not substitute a different engagement metric.
- Organize by MARKET, not by a sprawling topic taxonomy. Multi-market coverage is the actual product differentiator and it's how a reader with a portfolio already thinks.
- Make the content contract explicit: every card and every article states what kind of piece it is (تحلیل / گزارش / آموزش) so the reader knows what they're getting before they click. Competitors mix news, education and promotion indiscriminately.
- Preview by STRUCTURE, not by truncated prose. See the signature element in Part 4.

════════════════════════════════════════════════════════
PART 2 — SCOPE
════════════════════════════════════════════════════════

ROUTES TO DESIGN — all of them:

  /mag                    home / listing
  /mag/<slug>             single article
  /mag/market/<slug>      market archive
  /mag/author/<slug>      author page
  /mag/search?q=          search results
  /mag/page/<n>           pagination
  /mag/reports            reports & monthlies index
  /mag/authors            authors index
  404 within /mag

OUT OF SCOPE — inherited from the site's existing redesign shell, do not design these:
site header, footer, theme switcher, auth state, login, user panel.

════════════════════════════════════════════════════════
PART 3 — DESIGN SYSTEM CONSTRAINTS (HARD)
════════════════════════════════════════════════════════

TOKEN LAYER

The real token identifiers from the redesign bundle are NOT yet available. Define a placeholder token layer as CSS custom properties at the top of each artifact, named by SEMANTIC ROLE, so swapping to the real system is a single find-and-replace:

  --surface, --surface-raised, --surface-hover
  --border-subtle, --border-strong, --border-interactive
  --text-primary, --text-secondary, --text-muted
  --accent, --accent-contrast, --focus-ring, --danger
  --skeleton, --skeleton-strong
  --radius-card, --gap-grid, --gap-grid-mobile

ZERO hardcoded color values below that block. No hex, no rgb, no named colors in any component style.

THREE THEMES — all must render correctly: v1 navy dark, v2 dark, v2 light. Provide a theme toggle. Define plausible values for all three.

CONTRAST — measure, don't estimate:
  - Body text ≥4.5:1 against its surface.
  - Focus indicators and interactive control boundaries ≥3:1 (WCAG 2.2 SC 1.4.11).
  - Check the LIGHT theme FIRST. It is where contrast fails.
  - Do NOT reuse a dark-theme accent as the light-theme focus ring — a bright blue that measures ~7:1 on dark measures ~2.8:1 on white and fails. Light theme needs a darker value.
  - A typical "subtle border" measures ~1.3:1 and a "strong border" ~1.7:1 — neither is sufficient for an interactive control boundary. That is why --border-interactive exists as its own token.
  - Publish only ratios you actually computed, and state which surface each was measured against. Do not invent plausible-looking numbers.

SPACING — global baseline, no exceptions:
  Page horizontal padding:  20px mobile / 100px desktop
  Section vertical spacing: 60px mobile / 96px desktop
  Sections are separated by whitespace, never by full-bleed background blocks.

GRID:
  <768px: 1 column · 768–1279px: 2 columns · ≥1280px: 3 columns
  Gap: 16px mobile / 24px desktop

════════════════════════════════════════════════════════
PART 4 — THE ORGANIZING IDEA
════════════════════════════════════════════════════════

Two structural devices carry real information and appear on every card and every article:

  MARKET       بورس ایران · طلا و دلار · کریپتو · فارکس · اقتصاد جهانی · مسکن
  CONTENT TYPE تحلیل · گزارش · آموزش

Market is the primary filter axis. Content type sets the reader's expectation.

Do NOT use numbered markers (۰۱ / ۰۲ / ۰۳). The articles are not a ranked sequence, so numbering them is decoration pretending to be structure.

SIGNATURE ELEMENT — «در این مقاله»

The featured card and the article's table of contents both display two or three of the article's own <h2> headings. One source, two consumers, so they can never disagree.

Why this instead of an editor-written teaser: the live Mag's excerpts are auto-truncated mid-sentence, which tells us the content team doesn't write summaries today. A new mandatory editorial field would ship empty or copy-pasted, and a signature element that's usually absent is worse than none. Headings are derived server-side from content that already exists, they're always accurate, and they're inherently anti-hype because headings describe rather than promote.

Degradation: fewer than two <h2>s → omit the block entirely and reflow. It must never render an empty region or a list of one.

CROSS-MARKET CONTEXT — the differentiator made navigable

An article about US interest rates affects gold, the dollar, and Iranian equities. Competitors silo content by asset class; we don't have to.

Build a "related markets" row on the article page: the markets this piece touches, as links to their archives. Primary market first (matching the card chip), secondary markets after. Visually quieter than the primary chip in the header — these are navigation, not classification.

This is NOT a price ticker. No numbers, no percentages, no live data. Just the markets, as links.

Degradation: single-market article → the row is omitted entirely, not rendered with one item.

READER LEVEL — proposed, build both variants

The whole competitive category ships «از صفر تا صد» explainers with no signal of who they're for, so readers constantly land on something too basic or too advanced.

Proposal: a level indicator — مبتدی / متوسط / حرفه‌ای — on educational content only (نوع = آموزش). Not on تحلیل or گزارش.

Editorial cost is one dropdown per article, not writing, so the burden is far lower than a prose field. But it is still a per-article decision, so BUILD BOTH VARIANTS: with the level shown and without it. Treat it as a proposal pending an editorial decision, and note it in your delivery notes.

Render it as a quiet text label in the meta row, NOT as a colored badge and NOT as filled dots or bars — those read as a difficulty rating, which invites "harder = better" and slides toward the status signaling we're avoiding.

WHAT IS DELIBERATELY ABSENT

State these in your delivery notes as intentional, so nobody adds them later thinking they were forgotten:
  - No view counts, comment counts, or reaction counts
  - No trending, popular, or "hot" sections
  - No live price ticker or market-data strip anywhere in Mag
  - No urgency badges, countdown timers, flame or rocket iconography
  - No social-proof metrics on author pages
  - No "did you mean" spelling suggestions in search

════════════════════════════════════════════════════════
PART 5 — RTL IS THE BASE DIRECTION, NOT A MIRROR
════════════════════════════════════════════════════════

- Logical properties ONLY: padding-inline-start, margin-inline-end, border-inline-start, inset-inline-start. Never left/right.
- ALL chevrons and directional arrows flip. In RTL, "forward" points LEFT. This applies to breadcrumbs, "see all" links, pagination, and carousels.
- Latin fragments appear inside Persian sentences constantly — real Mag titles include «نات کوین (Notcoin) چیست؟», «اندیکاتور زیگ زاگ (Zig Zag) چیست؟», «شاخص دلار (DXY)», «نسبت P/E», «شاخص S&P 500». Every one must be wrapped in <span dir="ltr" style="unicode-bidi:isolate"> or the punctuation scrambles. Treat this as the COMMON CASE, not an edge case.
- Do NOT use manual scrollLeft arithmetic for horizontal scrollers — RTL scrollLeft semantics differ across browsers (negative in spec-compliant Chrome and Firefox, inverted in some older engines). Use element.scrollIntoView({inline:'nearest', block:'nearest'}).
- Horizontal scroller edge fades use mask-image, not a colored gradient, so they work in all three themes without per-theme values.

════════════════════════════════════════════════════════
PART 6 — PERSIAN TYPOGRAPHY
════════════════════════════════════════════════════════

These rules don't exist in Latin design, and getting them wrong makes the page unreadable regardless of layout.

1. NEVER italicize Persian. There is no true italic for Persian faces; browsers synthesize a slant that looks broken. Emphasis is a weight or color change. This creeps in via blockquotes and figure captions — check both.
2. NEVER rely on synthetic bold. Use real weights the face ships (400 / 600 / 700).
3. NEVER use text-align: justify. Without kashida support it creates rivers of whitespace. Use text-align: start throughout.
4. ZWNJ (نیم‌فاصله) must render correctly. Test explicitly with «می‌شود», «نمی‌کند», «سرمایه‌گذاری», «کتاب‌ها». If the font falls back mid-word the ZWNJ breaks visibly — it's the fastest way to spot a font failure.
5. Line-height is higher than Latin: body 1.9, headings 1.5, captions 1.7.
6. Measure: 65–75 characters per line. Content column ~700px at desktop. State the characters-per-line you actually landed on.
7. Body size: 18px desktop, 17px mobile. Smaller loses legibility.
8. Persian digits (۱۲۳) for dates, read time, and counts. Latin digits for ticker symbols and price-like values.
9. Font: assume a self-hosted, subset Persian face (Vazirmatn is a fine stand-in). No Google Fonts, no foreign CDN — Iranian networks block Cloudflare and Google intermittently.

════════════════════════════════════════════════════════
PART 7 — COMPONENTS
════════════════════════════════════════════════════════

CARDS

ArticleCard (grid variant)
  16:9 fixed image box · market chip + content-type label · <h3> title with 2-line clamp · meta row (read time · date).
  NO excerpt — excerpts make grids ragged and ours would be auto-truncated anyway.
  The ENTIRE card is one link. No nested CTA button.
  Cards in a row are equal height: the title clamps, the image box never varies, and the meta row is pinned to the bottom with margin-block-start:auto.
  States: default, hover, focus-visible, skeleton, no-image fallback.

FeaturedArticleCard
  3:2 image (this is the LCP element) · <h2> title with 3-line clamp and NO min-height (nothing aligns to it horizontally, and a min-height leaves dead space under short titles) · the «در این مقاله» block · meta row.

SecondaryArticleCard
  Horizontal at all breakpoints — fixed-width thumbnail (120px desktop / 96px mobile) beside the text, so three of them align perfectly. <h3> 2-line clamp. No «در این مقاله».

Lead block
  Featured ~62% / three stacked secondaries ~38%, gap 24px. The asymmetry is deliberate — do not drift toward 50/50. Stacks below 1024px. Use minmax(0, …fr) so long content can't force overflow. Featured card and secondary column end at equal height.

LABELS AND CONTROLS

MarketChip
  Transparent background + border when unselected, so it looks identical on a card and in the filter bar. Accent fill with accent-contrast text when selected.
  Passive instances on cards use --border-subtle. Interactive instances use --border-interactive.

ContentTypeLabel
  Text-only, --text-muted, separated from the chip by a middot. NOT a colored badge — it must not compete with the market chip.

MarketFilterBar
  Semantic <nav> with REAL <a> links — filtering is navigation, it must work without JS and be crawlable. aria-current="page" on the active chip.
  Horizontal scroll-snap on mobile with the active chip scrolled into view on load (a filter bar that opens with the active chip off-screen is a common and frustrating failure). Single row on desktop.
  44px touch targets. Edge fade via mask-image.

Pagination
  Real links (/mag/page/2), NOT infinite scroll — crawlable and back-button-safe. Numbered with prev/next, plus a truncated state for long ranges (۱ ۲ ۳ … ۱۲) where the ellipsis is not focusable. RTL chevrons. aria-current="page". Interactive boundaries use --border-interactive.

ARTICLE PAGE

Breadcrumbs
  Semantic <nav> + <ol>. Last item carries aria-current="page" and is not a link. Chevrons point in the RTL reading direction. The article title truncates; the market segment never does.

Article header
  breadcrumbs → market chip + content type (+ level if شown) → <h1> (the page's only h1, no clamp, always fully visible) → meta row → hero image 3:2.

  THE META ROW MUST SHOW A REVISION DATE when it differs from the publish date:
  «منتشر: ۱۲ آبان ۱۴۰۳ · بازبینی: ۲۷ مرداد ۱۴۰۵»
  Much of Mag is evergreen educational content. Relative dates («۲ روز قبل», which the current site uses) make a still-valid article look stale, while a revision date signals maintenance. It's the honest version of the freshness signal competitors fake. Build both variants — revised and publish-only.

  Hero image: 3:2, full content-column width. NO text overlay and NO gradient scrim — Mag thumbnails frequently have the title baked into the image already, so any overlay collides or duplicates.

TableOfContents — built from the article's own <h2> headings
  Desktop ≥1024px: sticky in the inline-END column (the LEFT side in RTL). Active item marked with accent text plus a border-inline-start marker, NOT a background fill — a fill is too heavy for a sidebar.
  Mobile: native <details>, closed by default, no custom JS.
  Fewer than two <h2>s → omit entirely and reflow.
  Do NOT force scroll-behavior:smooth.

Body typography — specify AND demonstrate every element
  p · h2 · h3 · ul · ol (including one nested level) · blockquote (border-inline-start, NOT italic) · inline links (accent PLUS underline — color alone is insufficient) · figure + figcaption (not italic) · table (thead on surface-raised, horizontally scrollable on mobile without breaking the page) · hr · strong.
  Show two consecutive paragraphs so the rhythm is visible, an h2 immediately followed by an h3, and a mid-body image with caption.

IN-BODY BLOCKS — this is the ENTIRE library the content team will get

Callout
  General editorial aside — a definition, a clarification, a worked example. surface-raised with a border-inline-start in accent, not a colored fill. Optional short title. Supports paragraphs AND lists.
  ONE VARIANT ONLY. Do NOT build info / warning / success / error color variants: four options means an editor chooses correctly once and wrongly three times.

Disclaimer
  The compliance block. Visually QUIETER than Callout and unmistakably different from it — an editor must never confuse the two.
  Copy is FIXED and NOT editor-editable. Mark this constraint visibly in the board. Editors insert the block; they never write its text.
  Text: «این مطلب صرفاً جنبه آموزشی و اطلاع‌رسانی دارد و توصیه به خرید یا فروش نیست. مسئولیت هر تصمیم سرمایه‌گذاری بر عهده خود شماست.»
  Show it both at the end of the body and mid-body.

CtaBlock
  Points to InChart (the charting tool) or Academy (courses). Contained — surface-raised plus border — NOT full-bleed, NOT accent-filled.
  No profit, urgency, or scarcity language. The value proposition is the tool's capability, never an outcome.
  Sample: «ابزار تحلیل چندبازاره» / «نمودار بورس ایران، طلا، کریپتو و فارکس در یک ابزار.» / button «اینچارت را ببینید»
  Build a second sample pointing at Academy so it reads as reusable.

CRITICAL: Callout, Disclaimer and CTA titles must NOT be heading elements. If they are <h3>, they pollute the table of contents and break the article's heading outline. Verify this in the assembled page, not just in isolation.

AROUND THE ARTICLE

RelatedMarkets
  The cross-market row described in Part 4. Quiet chip links to market archives. Omitted entirely for single-market articles.

AuthorBox
  Avatar 1:1 · name (links to the author page) · factual role line · short bio.
  TWO SIZE VARIANTS OF ONE COMPONENT — 56/48px in-article, 80/64px on the author page. Not two components.
  NO follower counts, NO social-proof metrics, NO superlative claims. The role is «تحلیل‌گر بازار سرمایه», never «بهترین تحلیل‌گر».
  Graceful no-avatar state (initial-based placeholder) that keeps the box height stable.

RelatedArticles
  <h2> «مطالب مرتبط» plus three ArticleCards, UNCHANGED. Do not invent a new card.
  Hide the entire section below three items.

ShareRow
  Placed after the body, near the author box. NOT a floating sticky rail — it competes with the ToC and adds motion cost.
  Native platform links ONLY: Telegram, WhatsApp, X, copy-link. NO third-party widget scripts — they're render-blocking, they leak user data, and several are unreachable from Iran.
  Icon buttons with accessible names, 44px targets, --border-interactive boundaries. Copy-link needs a confirmed state «کپی شد» announced via aria-live.

LISTING PAGE SECTIONS

Page header
  <h1> «مگ فایننس» · subtitle «تحلیل، گزارش و آموزش برای بازارهای مالی» · search entry (icon-only on mobile, icon + input on desktop, placeholder «جستجو در مگ», visually-hidden <label>).
  No background image, no gradient, no decorative rule.

Latest grid
  <h2> «تازه‌ترین‌ها» plus the ArticleCard grid.

Reports band
  <h2> «گزارش‌ها و ماهنامه‌ها» with «همه گزارش‌ها ←» on the reading-end side.
  3:4 cover cards — a distinct artifact shape that differentiates them from the 16:9 article grid above. Horizontal scroll-snap.
  Hide the entire section below three items.

NewsletterCta — copy is FINAL, do not rewrite
    «خلاصه هفتگی بازارها»
    «هر هفته یک ایمیل: چه چیزی در بازارها اتفاق افتاد و چرا.»
    [ ایمیل شما ]  [ عضویت ]
    «هر زمان بخواهید می‌توانید لغو عضویت کنید.»
  Note what this copy deliberately does NOT say: no subscriber count, no exclusive signals, no "opportunities," no profit claim. Competitors' newsletter pitches lead with exactly those. Ours promises explanation.
  Container: surface-raised + border-subtle. NOT a full-bleed accent panel.
  THREE STATES:
    default
    error — «ایمیل معتبر نیست. آدرس را بررسی کنید.» in --danger, with aria-invalid="true" on the input, aria-describedby pointing at the message, and role="alert" on the message
    success — «عضو شدید» (same verb as the button label)
  Desktop: input and button on one row. Mobile: stacked, button full width.

════════════════════════════════════════════════════════
PART 8 — THE REMAINING PAGES
════════════════════════════════════════════════════════

MARKET ARCHIVE (/mag/market/<slug>)
  breadcrumbs → <h1> market name → one-line market description (--text-secondary) → article count («۲۴ مطلب») → MarketFilterBar with this market pre-selected → grid → pagination.
  NO hero image — an archive is a list, not a story, and a decorative banner costs LCP for nothing.
  The description is a taxonomy field that may be empty. BUILD BOTH VARIANTS: with it and without it. The h1 and count must sit correctly either way.

AUTHOR PAGE (/mag/author/<slug>)
  breadcrumbs → author identity block (the 80/64px variant) → article count → grid → pagination.
  NO filter bar — an author's output spans markets, and filtering inside an author page is a rare need that adds a control to every page load.
  Empty state: «این نویسنده هنوز مطلبی منتشر نکرده.» plus a link to «همه مطالب».

AUTHORS INDEX (/mag/authors)
  <h1> «نویسندگان» → grid of author cards (avatar, name, role, article count). Reuse the AuthorBox structure at a card scale rather than inventing a new component.
  Include the case where an author has no avatar.

SEARCH (/mag/search?q=)
  The page with the most states and the least existing design. Give it the most attention.
  <h1> «نتایج جستجو» → prominent search input pre-filled with the query → result count echoing the query («۷ نتیجه برای «تحلیل فاندامنتال»») → grid → pagination.
  The query MUST render through the LTR-isolation path — people search for P/E, Bitcoin, S&P 500.
  FOUR STATES, all required:
    Results   — count line plus grid
    Loading   — count line replaced by a skeleton line; six card skeletons
    Empty     — «نتیجه‌ای برای «{query}» پیدا نشد.» and it MUST offer routes onward: the market chips as browsable entry points (reuse MarketFilterBar with none selected) plus a link to «تازه‌ترین مطالب». A dead end here loses the reader.
                Do NOT suggest spelling corrections or "did you mean" — that implies a backend capability that doesn't exist.
    No query  — landed on /mag/search with no q. Show the input and «عبارتی برای جستجو وارد کنید.» This is NOT an error state.

REPORTS INDEX (/mag/reports)
  <h1> «گزارش‌ها و ماهنامه‌ها» → grid of 3:4 cover cards → pagination. Include the empty state.

404 WITHIN /MAG
  «این مقاله پیدا نشد.» plus routes onward — Mag home and the market archives. Never a dead end.

════════════════════════════════════════════════════════
PART 9 — STATES, EVERY PAGE
════════════════════════════════════════════════════════

Loading  Skeletons matching final geometry EXACTLY — same aspect ratios, same line counts, same heights. Never a centered spinner; it guarantees layout shift.
Empty    States the situation and offers a route onward.
Error    «بارگذاری مطالب انجام نشد.» plus «تلاش دوباره». States what happened, offers the fix, does NOT apologize.
Partial  If a section has no data, HIDE the section. Never render an empty heading.

The page header and filter bar stay intact during empty and error states — they don't depend on article data, and hiding them leaves the reader stranded.

════════════════════════════════════════════════════════
PART 10 — ACCESSIBILITY FLOOR
════════════════════════════════════════════════════════

- Exactly ONE <h1> per page. Section headings <h2>, card titles <h3>. No level skips. If a grid is the only content and a visible section heading would add nothing, use a VISUALLY HIDDEN <h2> rather than skipping h1 → h3.
- Cards are <article> elements containing one link whose accessible name is the title. Do NOT add an aria-label duplicating the title — it drifts out of sync with the visible text and creates a Label-in-Name mismatch. Clamping is visual only; the full text node is present.
- Visible focus ring on every interactive element, offset so a card's radius doesn't clip it.
- 44px minimum touch targets on all controls. Passive labels on cards are not controls and are exempt.
- Images have real alt text in the sample data, never empty strings.
- Form inputs always have a visible or visually-hidden <label>.
- prefers-reduced-motion: disable all transitions, animations, and scroll smoothing.

════════════════════════════════════════════════════════
PART 11 — PERFORMANCE (SEO is this product's #1 priority)
════════════════════════════════════════════════════════

- LCP is the featured card image on the listing and the hero on the article. Fixed aspect ratio, priority loading. Target ≤2.5s on mobile.
- CLS: every image in a fixed aspect-ratio box; font preloaded with matched fallback metrics; filter selection must not reflow grid height. Target ≤0.1.
- INP: filtering and pagination are navigation, not client-side churn. Target ≤200ms.
- No third-party scripts anywhere.
- Hover is a background/border shift ONLY. No lift, no translate, no scale, no shadow growth — those read as templated and cost motion budget for nothing.

════════════════════════════════════════════════════════
PART 12 — SAMPLE CONTENT (real, not lorem)
════════════════════════════════════════════════════════

These are brand-compliant: explanatory, no predictions, no performance claims. Include at least one deliberately LONG title to exercise clamping and one SHORT title to verify equal-height alignment.

| Title | Market | Type | Read | Date |
| صورت‌های مالی شش‌ماهه: چه چیزی در گزارش بانک‌ها تغییر کرد | بورس ایران | گزارش | ۹ دقیقه | ۲۷ مرداد ۱۴۰۵ |
| رابطه نرخ بهره آمریکا با قیمت طلای داخلی | طلا و دلار | تحلیل | ۷ دقیقه | ۲۶ مرداد ۱۴۰۵ |
| نات کوین (Notcoin) چیست؟ راهنمای کامل پروژه و مکانیزم توزیع توکن | کریپتو | آموزش | ۱۰ دقیقه | ۲۵ مرداد ۱۴۰۵ |
| اندیکاتور زیگ زاگ (Zig Zag) چیست؟ | فارکس | آموزش | ۶ دقیقه | ۲۴ مرداد ۱۴۰۵ |
| شاخص دلار (DXY) و اثر آن بر بازارهای نوظهور | اقتصاد جهانی | تحلیل | ۸ دقیقه | ۲۳ مرداد ۱۴۰۵ |
| بازار مسکن تهران در بهار ۱۴۰۵: داده‌های معاملات | مسکن | گزارش | ۱۱ دقیقه | ۲۲ مرداد ۱۴۰۵ |

FULL SAMPLE ARTICLE for the article page:
  «تحلیل فاندامنتال (Fundamental Analysis) چیست؟» · بورس ایران · آموزش · مبتدی · ۱۴ دقیقه
  published ۱۲ آبان ۱۴۰۳, revised ۲۷ مرداد ۱۴۰۵
  Related markets: بورس ایران (primary), اقتصاد جهانی
  H2 sections — these also populate the ToC and the «در این مقاله» block:
    تحلیل فاندامنتال چیست · تفاوت آن با تحلیل تکنیکال ·
    صورت‌های مالی و نسبت‌های کلیدی · محدودیت‌های این روش
  Write two or three REAL Persian paragraphs per section — explanatory, no predictions, no profit language. Include one paragraph with ZWNJ-heavy words and one with an inline Latin fragment. Include one table (a small ratio comparison), one blockquote, one nested list, one mid-body image with caption, one Callout, one CTA, and the Disclaimer at the end.

Author: مریم رضایی · «تحلیل‌گر بازار سرمایه» · two-line factual bio.

Reports: ماهنامه بازارهای مالی — مرداد ۱۴۰۵ (شماره ۱۲) · گزارش فصلی صنعت بانکداری (بهار ۱۴۰۵) · مروری بر بازار مسکن تهران (تیر ۱۴۰۵)

════════════════════════════════════════════════════════
PART 13 — DELIVERABLE
════════════════════════════════════════════════════════

Organize as a coherent set. Every artifact carries the token layer and a theme toggle.

A) TOKEN BOARD
   Every token with its value in all three themes, plus MEASURED contrast ratios for text pairs, focus rings, and interactive boundaries. State which surface each ratio was measured against.

B) COMPONENT LIBRARY
   Every component in isolation, every variant and state side by side, labelled. Show skeletons BESIDE their real counterparts so geometry match is verifiable at a glance.

C) PAGE BOARDS — each at 1280px, 1024px, and 390px
   Listing · Article · Market archive · Author · Authors index · Search · Reports index · 404

D) STATE BOARDS
   Loading, empty, error and partial for every page that has them.

E) DELIVERY NOTES
   - Content column width and the characters-per-line you landed on
   - Any new token you had to introduce, with justification and measured ratios
   - The «سطح» (reader level) recommendation: keep it or drop it, and why
   - What is deliberately absent (the Part 4 list), so nobody adds it later
   - Anything in this brief you deliberately deviated from, and why
   - Any field this design requires that a standard WordPress install does not provide

════════════════════════════════════════════════════════
PART 14 — SELF-CHECK BEFORE DELIVERING
════════════════════════════════════════════════════════

□ Zero hardcoded colors below the token block
□ All three themes render correctly; light theme contrast verified first
□ Focus rings and interactive boundaries measure ≥3:1 in ALL three themes
□ Every published contrast ratio was actually computed, with its surface stated
□ No font-style:italic anywhere
□ No text-align:justify anywhere
□ ZWNJ renders correctly in the sample text
□ Logical properties only — zero instances of left/right
□ Every chevron flips for RTL
□ Every Latin fragment is isolated with dir="ltr"
□ No manual scrollLeft arithmetic
□ Exactly one h1 per page; no heading level skips
□ Callout / Disclaimer / CTA titles are NOT heading elements
□ Cards are one link with no duplicate aria-label
□ Skeletons match final geometry exactly
□ Every image sits in a fixed aspect-ratio box
□ Equal card heights per row regardless of title length
□ Hover is background/border only — no lift, scale, or shadow
□ 44px touch targets on all controls
□ prefers-reduced-motion respected
□ No third-party scripts
□ No view counts, comment counts, or engagement metrics
□ No urgency, scarcity, profit, or prediction language
□ No follower counts or superlative claims
□ No live price data anywhere
□ Every empty and error state offers a route onward
□ Sections with no data are hidden, not rendered empty
□ Revision date shown when it differs from publish date
□ Both variants built wherever a field may be absent
