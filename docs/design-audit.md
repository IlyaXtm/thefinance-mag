# Design Audit — مجله فایننس

For Claude Code. Audit the built pages against the design decisions. Report
findings by severity; don't silently fix things in the "deliberate" list at the
end — several look like bugs and aren't.

Check every page at **1280px, 1024px and 390px**, in **all three themes**
(`data-theme="v1"`, `"v2-dark"`, `"v2-light"` on `<html>`).

---

## 1 — Automated checks first

These are grep-able and take a minute. Run them before opening a browser.

```bash
# Persian typography — every hit is a defect
grep -rn "font-style:\s*italic" src/ --include=*.tsx --include=*.css
grep -rn "text-align:\s*justify" src/ --include=*.tsx --include=*.css

# Physical properties in RTL — every hit is a defect
grep -rnE "\b(margin|padding|border)-(left|right)\b" src/ --include=*.tsx
grep -rnE "\b(left|right):\s*[0-9]" src/ --include=*.tsx

# Hardcoded colour outside the token layer
grep -rn "#[0-9a-fA-F]\{6\}" src/ --include=*.tsx

# Browser storage — unsupported in this environment
grep -rn "localStorage\|sessionStorage" src/

# RTL scroll maths — behaves differently across browsers
grep -rn "scrollLeft" src/
```

Expected: **zero hits on all of them.** `src/styles/tokens.css` is the only
place a colour literal belongs.

---

## 2 — Persian typography

The rules that don't exist in Latin design and are the difference between
readable and broken.

- [ ] **No italic anywhere.** There is no true italic for Persian faces;
      browsers synthesise a slant that looks broken. Watch blockquotes and
      figure captions — that's where it creeps in
- [ ] **Nothing justified.** Without kashida support, justified Persian
      produces rivers of whitespace. The classic editor writes inline
      `text-align: justify`; `sanitizeArticleHtml` strips it — confirm it
      actually worked on a real article
- [ ] **ZWNJ renders correctly.** Check «می‌شود», «نمی‌کند», «سرمایه‌گذاری»,
      «صورت‌های». A mid-word break is the fastest sign of a font failure
- [ ] Body copy is 18px desktop / 17px mobile at line-height 1.9
- [ ] Headings at line-height 1.5
- [ ] Content column measures **70–73 characters per line** (~700px). Count on
      a real paragraph, don't assume
- [ ] Persian digits (۱۲۳) for dates, reading time and counts
- [ ] **No external font request.** IRANYekanX is self-hosted via `next/font`;
      a request to Google Fonts or any foreign CDN is a defect — those are
      unreliable from Iran and the font is on the LCP path

---

## 3 — RTL

- [ ] **Every chevron points in the RTL reading direction** — breadcrumbs,
      pagination prev/next, "see all" links. In RTL, forward is LEFT. This is
      the most common RTL bug and completely invisible in an LTR layout
- [ ] Latin fragments inside Persian titles don't scramble their punctuation:
      «نات کوین (Notcoin) چیست؟», «شاخص دلار (DXY)», «اندیکاتور زیگ زاگ (Zig Zag)»
- [ ] The table of contents sits in the inline-**end** column — the LEFT side
      in RTL
- [ ] Card content aligns to the reading-start (right) edge
- [ ] Horizontal scrollers start at the right and snap correctly
- [ ] Nothing uses manual `scrollLeft` arithmetic

---

## 4 — Contrast, measured not eyeballed

**Check the light theme first.** It is where contrast fails, and it has already
produced one real defect.

- [ ] Body text ≥ 4.5:1 against its actual surface
- [ ] Focus indicators ≥ 3:1 (WCAG 2.2 SC 1.4.11)
- [ ] Interactive control boundaries ≥ 3:1 — this is why
      `--border-interactive` exists as a separate token. `--border-subtle`
      measures 1.28 and `--border-strong` 1.68; neither is sufficient for a
      control whose border is its only boundary
- [ ] `--focus-ring` in `v2-light` is the **darker** accent. The dark-theme
      blue measures 2.85 against white and 2.59 against surface-raised — a fail
      that makes keyboard focus effectively invisible
- [ ] `--text-muted` on `--surface-raised` in the light theme

Tab through a full page in each theme. If you lose the focus ring at any point,
that's blocking.

---

## 5 — Layout

**Article page** — the layout changed recently and hasn't been reviewed in a
browser.

- [ ] Container centred at `max-w-[1080px]`, not pinned right with two thirds
      of a wide screen empty
- [ ] ToC beside the text, not floating in whitespace
- [ ] ToC scrolls internally rather than stretching past the viewport — the
      technical-analysis article is a 41-minute read with many headings
- [ ] **Clicking a ToC entry jumps to that heading.** If nothing happens, the
      body ids and ToC hrefs have diverged. Both derive from `headingId()` in
      `lib/sanitize.ts` and must continue to
- [ ] The active section highlights while scrolling, and the highlight tracks
      where the reader actually is rather than lagging a section behind
- [ ] Jumped-to headings clear the header (`scroll-margin-top`)
- [ ] Body images, tables and code blocks don't overflow the column
- [ ] Tables scroll horizontally on mobile instead of breaking the page

**Index**

- [ ] Exactly one image (the hero)
- [ ] No article appears twice
- [ ] Two-column layout collapses cleanly, latest first on mobile
- [ ] `housing` absent from Topics — zero articles
- [ ] Section rules group without boxing

**Archive, market, author, search**

- [ ] Rows equal weight; long Persian titles wrap rather than truncate badly
- [ ] Pagination is real links; current page marked `aria-current="page"`
- [ ] Empty states offer a route onward
- [ ] Search with no query shows a prompt, not an error

**Everywhere**

- [ ] Page padding 20px mobile / 100px desktop; section spacing 60/96
- [ ] Footer sticks to the bottom on short pages
- [ ] Logo loads in header and footer
- [ ] 44px minimum touch targets on controls (passive card labels are exempt)

---

## 6 — Semantics

- [ ] Exactly one `<h1>` per page
- [ ] No heading level skips. Where a grid is the only content and a visible
      heading would add nothing, a visually-hidden `<h2>` is correct — that is
      deliberate, not a stray element
- [ ] Cards are `<article>` containing one link whose accessible name is the
      title
- [ ] Filter and pagination are real `<a href>` links, not click handlers
- [ ] Every input has a label, visible or visually hidden
- [ ] `prefers-reduced-motion` disables transitions and scroll smoothing

---

## 7 — Brand

Every one of these is prohibited. Report any occurrence.

- [ ] No view counts, comment counts, or reaction counts
- [ ] No trending, popular, or "hot" section
- [ ] No urgency badges, countdowns, flame or rocket icons
- [ ] No live price data anywhere in Mag
- [ ] No follower counts or superlative author claims — roles are factual
      («تحلیل‌گر بازار سرمایه», never «بهترین»)
- [ ] No profit, guarantee, or scarcity language in any CTA
- [ ] The newsletter copy is unchanged: no subscriber count, no "exclusive
      signals", no "opportunities"
- [ ] The standing disclaimer is present in the footer

Signal-selling is prohibited by Iranian securities law as well as the brand
book. Treat a violation as blocking, not cosmetic.

---

## 8 — Deliberate — do not "fix"

Each of these looks like an oversight. None is. If you think one is wrong, say
so and explain why rather than changing it.

**One image on the index.** Every featured image has the article's headline
baked into the artwork, so a grid of image cards prints each title twice. That
is what made the previous listing feel cluttered no matter how the spacing was
tuned. Showing artwork once also removes eight image requests competing with
the LCP hero.

**No engagement metrics.** Their absence is the brand position. The entire
competitive category competes on exactly these, and one competitor's cards
display «۰ دیدگاه» on nearly every item — a live demonstration of why the
metric backfires at low volume.

**No `aria-label` on card links.** The title text is already the accessible
name. A duplicate label drifts out of sync with the visible text.

**Avatars are initials, never Gravatar.** A third-party request per author, an
email hash leaked to a foreign service, and unreliable from Iran.

**The education section is not numbered.** Numbering implies a teaching order
the data doesn't carry — WordPress sorts by publication date, which has no
relationship to what a beginner should read first. It becomes a numbered path
when `series_order` lands (backlog B2).

**Reports return empty.** No content source exists. An empty section is honest;
a padded one lies about what the publication produces.

**Search is `noindex, follow`.** Thin, infinitely variable, duplicating content
that exists elsewhere.

**`مقالات` and `اینچارت` map to null** in `resolveContentType`. They are tags,
not content types. Articles carry roughly two categories each, so the priority
mapping is what makes the resolved type deterministic.

---

## Reporting

Group findings as **blocking** (accessibility failure, brand violation, SEO
regression, broken RTL), **should fix** (convention drift, inconsistency), and
**note**.

State what passed as well. A review that only lists problems gives no signal
about coverage.

For contrast, publish the ratio you computed and the surface you measured it
against — not an impression.
