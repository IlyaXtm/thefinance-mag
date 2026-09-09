# Changelog

What changed, when, and why. Entries are newest first.

Ordinary commit messages say what happened; this records the reasoning, so a
decision doesn't get quietly reversed six months later by someone who can't see
why it was made.

---

## 2026-09-09 — Header navigation, and images that are not there

### 1 🔴 A missing image now leaves no trace

**The null hero was already correct**, and establishing that is what pointed at
the real cause. Measured on both null-image fixtures: zero `<figure>` elements,
no hero markup at all, the body starting where the hero would have been.
`featuredImage: null` has never rendered anything.

**The empty dark rectangle is a 404, not a null** — and the mechanism is that
the hero renders through `CardImage`, so it carries `data-card-image` and took
the CARD branch of the new guard: kept its box, painted the placeholder,
full-bleed and empty. Measured with the branches in the wrong order: hero figure
still on the page, full height, nothing in it. The hero is checked first now. A
card must keep its box because its neighbours in the grid have images; a hero
has no neighbours, so there is nothing to hold the row for.

Client-side, and it cannot be anything else — in-body HTML is
`dangerouslySetInnerHTML` from the CMS, so the server never fetches those URLs.

Two things about the implementation are load-bearing and both look like details:

- **`error` does not bubble.** A listener on a container never sees an image
  fail inside it. Capture phase is the only one that reaches it, which is why
  the naive version of this component does nothing while looking correct.
- **The sweep on mount is not optional.** Images usually fail BEFORE hydration,
  so a guard that only listens catches almost nothing on a cold load — the load
  that matters. `complete && naturalWidth === 0` catches the finished ones.

Three responses, because the right answer differs by context: body → remove the
figure, caption and all; hero → remove the figure; card → the reserved
placeholder, never removal, because the v4 review settled that box and the grid
must not reflow.

**On `cta_inchart`: the investigation the brief asked for could not be run.**
This environment cannot reach `thefinance.ir` (`curl` returns `000` in ~0.2s —
refused by the proxy allow-list, not a timeout). Two hypotheses, one of which is
now handled and counted:

1. **A wrong path.** A body image whose src is `/wp-content/uploads/…` resolves
   against the main site's root under `basePath: '/mag'` and is a certain 404 —
   and that is exactly what pre-cutover content carries, because WordPress was
   the site root then. Now rewritten to `/mag/wp-content/uploads/…`, src and
   srcset both, and COUNTED on `/mag/health` as `rewrittenBodyImages`.
2. **A missing upload.** Then this changes nothing, the counter stays at zero,
   and it is a content problem to hand back rather than a rendering one.

Only that one URL shape is touched. Absolute URLs are left alone in both
directions — the public host works and so does the CMS host, since the reader's
browser is outside the container and the optimizer's hairpin problem does not
apply to markup the browser fetches for itself. Anything broader would be
guessing at a fix that could break images that currently work.

### 2–4 🔴🟠 The header: masthead, taxonomies, exit

**These are one change, not three.** The logo could only stop pointing at the
main site once the main site had its own entry, and that entry could only be
added once the row was not already carrying two taxonomies' worth of links.

**The masthead goes to `/mag`.** It pointed at thefinance.ir on the reasoning
that a reader from search needs a route back — true, and now the exit link's
job. A reader three articles deep could reach the main site and could not reach
the magazine's own front page except through a breadcrumb.

**Content types are flat links, markets are behind a labelled disclosure.** The
row read «طلا و ارز · بورس ایران · کریپتو · آموزش · اخبار»: three markets then
two types, with nothing to say they are different axes. Same defect the review
found on the filter chips; same fix — name the axis rather than blur it.

«تحلیل» joins «اخبار» and «آموزش». «گزارش» does not: a content type with no
category behind it, so the link would point at an archive that does not exist.
«مقالات» does not either, for the opposite reason — 39 posts, but a catch-all
tag nobody chose as a section. Both are the rule from the category routes: **a
route is not a nav slot.** Still hand-picked.

**The counts are the point, not decoration.** کریپتو ۵ · فارکس ۳ · اقتصاد جهانی
۳ · بورس ایران ۲ · طلا و دلار ۱ · مسکن ۰ — four of six under three articles. A
menu where half the entries lead to a one-article page teaches a reader the menu
is not worth using, so «طلا و دلار ۱» sets its own expectation before the click.

Hiding the thin ones is worse and was rejected for a specific reason: the menu
would change shape as articles are tagged, so a reader who found فارکس last week
finds it missing this week with nothing to explain why. A stable menu with
honest numbers beats a shifting one with flattering ones. **Empty is different**
and is suppressed — «مسکن ۰» is a promise of nothing — and it returns on its own
because the counts come from the live query the sitemap floor already uses.

**Mobile is a labelled section of the strip, not a nested menu.** A dropdown
anchored inside a horizontal scroller either clips at the container's edge or
scrolls away from its own trigger, and at 390px it covers the row it belongs to.
Three labelled `<nav>` groups instead, which announces the axis the same way the
desktop button does.

**Two bugs found by measuring rather than reasoning.** The strip's
`overflow-x-auto` sat on the sections `<nav>`, so the two new groups fell
outside the scrolling area entirely. And the exit rendered TWICE between 640 and
1023px — the desktop copy was `sm:inline-flex` while the strip carrying its own
copy is `lg:hidden`; both are `lg` now.

**The exit is the quietest thing in the row**, by design. It leaves the magazine
rather than moving within it: muted, hairline-separated, arrow pointing out. One
link — InChart, Academy and Paradigm stay in the footer, and repeating them here
would trade the magazine's navigation for a product menu.

### 5 🟡 «دسته‌بندی‌ها» named the wrong taxonomy

The home sidebar was headed «دسته‌بندی‌ها» and listed markets. Renamed to
«بازارها» rather than switching the list: the counts, the links and the
`activeSlug` a market archive passes in are all market data, so changing the
list would change the component's job rather than fix its label.

**The footer had the same bug and is not in the review's list.** Its
«دسته‌بندی‌ها» column also lists markets. Fixed anyway, for the reason the
review gave for the sidebar: the header now draws the two axes apart explicitly,
so a footer still calling markets «categories» contradicts what the header just
taught. That column's title follows its content, because its fallback is a
different axis.

### What the nav does at each breakpoint

| width | masthead | sections | markets | exit |
|---|---|---|---|---|
| <1024 | `/mag` | strip, group 1 | strip, group 2, with counts | strip, group 3 |
| ≥1024 | `/mag` | flat links in the row | «بازارها ▾» disclosure | end of the row |

Verified at 320 · 360 · 390 · 480 · 639 · 640 · 767 · 768 · 1023 · 1024 · 1100 ·
1279 · 1280 · 1440 · 1920 across twelve routes: no horizontal overflow anywhere,
exactly one exit at every width.

---

## 2026-09-08 — The SEO team's article-page review, nine items

Their PDF was marked up on the live site. **Three of the nine were already fixed
in `f25a0f4` and their PDF predates that deploy** — recorded as confirmed rather
than skipped, because "we already did that" is only useful with the measurement
attached.

### 1 🔴 Two tables of contents on every article

`easy-table-of-contents` hooks `the_content`, and WPGraphQL's `content` field
runs `the_content` filters — so the plugin's list arrives INSIDE the body and
renders a few hundred pixels below the sidebar ToC the design specifies.

That is also the answer to the reviewer's question. They marked the sidebar list
and asked "does this only pick up h2?"; they were comparing two lists built by
two systems that have never agreed about anything.

**H2 only, and now written down**, which is what the brief actually asked for:

| source | scope | feeds |
|---|---|---|
| `extractHeadings()` | h2 only, uncapped | the article ToC |
| `outlineHeadings` (mu-plugin) | h2 only, **capped at 8** | card dek, RSS description |

The cap is on the wrong field to matter — the article page derives its contents
from the body it already has, so the 24-heading article gets all 24 (verified:
24 `<h2 id="s…">`, 24 links). **H2 stays the granularity.** The panel is
height-capped with internal scrolling precisely because 24 entries already fill
it; h3s would triple that to navigate a document the reader has not started.

**Stripped at the mapping layer, not by deactivating the plugin** — the brief
asked for a decision. Deactivating is cleaner and is the recommended follow-up,
but it cannot be taken from here: it would break any article that places
`[ez-toc]` explicitly, and this environment cannot reach the CMS to audit for
that shortcode. **Be honest about what the strip does not deliver:** it removes
the shortcode's output too, because the plugin emits identical markup either way.
So "keeps the plugin available for authors who want an inline list" is not what
shipped. An author who wants one needs a Gutenberg block — B7.

**A regex cannot do this and the first version tried.** The container holds a
title `<div>` and then the list, so a non-greedy `<div…>[\s\S]*?</div>` stops
at the title's closing tag: it deletes «فهرست مطالب», keeps the entire list, and
leaves an orphaned `</div>` in the body. That looks like a fix in a diff and is
worse than none on the page. Replaced with a depth-counting scanner; malformed
input comes back untouched rather than truncated.

Two things exist because the markup could not be checked against the live CMS:
`npm run check:toc` (seven shapes) and `injectedTocSurvivors` on `/mag/health`.
A regex that stops matching does not fail — it silently ships the duplicate.

### 2 🔴 The h1 broke mid-phrase

`text-wrap: balance` replaces `pretty`. `pretty` protects only the LAST line;
this headline goes wrong in the earlier breaks. Measured with the longhand
toggled at runtime:

```
1440  off  778px «…ایران؛ آموزش کامل خرید،» / 396px «انتقال و نگهداری BTC»
      on   569px «…ایران؛ آموزش»            / 605px «کامل خرید، انتقال و نگهداری BTC»
 390  off  «…در ایران؛» / «آموزش کامل خرید، انتقال و» / «نگهداری BTC»
      on   «…در ایران؛» / «آموزش کامل خرید،» / «انتقال و نگهداری BTC»
```

**Three attempts at the control were wrong before one worked**, and each printed
identical numbers that read as "balance does nothing":
`style.textWrap = 'normal'` is the camelCase alias of a shorthand and is
ignored; `setProperty('text-wrap','normal')` is ignored too because `normal` is
not a value of that shorthand; `setProperty('text-wrap-style','auto')` works. An
A/B in which both arms are A very nearly shipped as evidence the fix was inert.

**It does not fight `bidiTitle`** — verified at 390px on «تحلیل فاندامنتال
(Fundamental Analysis) چیست؟». Balancing *does* move that title's breaks:
unbalanced it kept the parenthesised run whole and left «چیست؟» alone on a 104px
line; balanced it splits the run and removes the orphan. **That split is safe
only because of the isolate**, so `balance` and `bidiTitle` are now a pair and
removing either alone reintroduces the mirrored bracket.

### 3 🔴 The share row — ALREADY FIXED, nothing to do

Confirmed on the served HTML: exactly one `ShareRow` in the whole repo, one
`aria-label="اشتراک‌گذاری در تلگرام"` on the rendered page, below the body. The
header copy was removed in `87658fb` — the reviewer's PDF predates that deploy.

Their second ask, "move the bottom one above «ادامه‌ی مسیر»", is already the
case: the share row is the first item in the post-body stack, and
«ادامه‌ی مسیر» is in the sidebar column, which follows the body column in DOM
order and sits beside it at desktop.

### 4 🟠 «ادامه‌ی مسیر» was just the latest four

The question — «بر چه اساسی کار می‌کند، یا فقط تیتره؟» — had the answer "just
the heading". `getArticles({ perPage: 4 })`, no filter: a panel promising to
continue the reader's path, showing whatever was newest.

Now same content type, newest first. **Market-based relatedness is not an
option and is not being pretended into one** — 39 of 53 articles carry no
market. That is B17, a tagging problem.

**The heading is computed.** «مطالب مرتبط» already renders three of the same
content type on the same page, so those three are excluded here — two panels a
screen apart showing the same titles is the duplicate this round just removed
from the ToC. When enough survives, the panel is «بیشتر در آموزش». When the type
is too small for both panels («تحلیل» has two articles in the archive), it falls
back to recency **and says so**: «تازه‌ترین مطالب». Renaming it only when it is
telling the truth is the point of computing the name.

### 5 🟠 The progress bar was invisible

It was a 1px accent line at the FOOT of the panel, under a `border-t`, below the
list. The cause is placement, not colour: a hairline at the bottom of a bordered
card reads as the card's bottom edge, and raising its contrast would have made a
more visible divider.

Moved to the panel header beside «در این مطلب می‌خوانید», where it is a stat
about the document the list describes. The bar now sits under that heading row,
so its horizontal line does structural work instead of imitating a rule. 3px
rather than 1px, track on `border-strong` rather than `surface-hover` — at 1px
on `surface-hover` the empty portion was indistinguishable from the card, so the
filled portion read as a rule rather than as a meter.

**Not a full-width bar across the top of the viewport.** Ruled out explicitly,
and it would compete with the header.

### 6 🟠 Sidebar alignment and the InChart CTA

**The newsletter card is NOT centred — deliberately not fixed, because there is
nothing to fix.** Measured with the flag temporarily flipped on, at 1440:

```
element   text-align   inline-start gap
h2        start        23px
p         start        23px
form      start        23px
input     start        23px
p         start        23px
button    center       23px   ← the only centred thing
```

Every piece of content already starts at the reading edge; the 23px is the
card's symmetric padding, not an indent. The one centred element is the submit
button's own label, which is a control convention rather than body copy — the
reading-edge argument in the brief is about prose. `text-center` appears nowhere
in `src/`. If the reviewer circled the button label specifically, say so and it
can change, but nothing else in that card is centred.

**The InChart CTA is new and it is built inside all four constraints.** The
brief was right that this is one step from a pattern the brand rules out, so:
it is a card in normal flow at the end of the rail (`position: static`, box
never intersects the article column); it is the LAST child, so appearing extends
the column downward and nothing on screen moves; the animation is opacity only
and `prefers-reduced-motion` removes it entirely; and dismissal persists to
localStorage so it never returns for that reader on any article.

Revealed at 50% of `[data-article-body]` — the same hook the progress bar uses,
so "half way" means the same thing in both. Absent at 30%, present at 50% and
60%; rail grows 446 → 672px, inside a 900px viewport. A scroll listener rather
than an observer, because "the reader has passed the midpoint" is a scroll
position and not an intersection; it removes itself once it fires.

### 7 🟡 Footer

**The year was already fixed.** `«۱۴۰۵»` ungrouped in the served HTML, from
`6a1cbf8`; their PDF predates the deploy. **The InChart link was already there**,
first in the فایننس column. Both confirmed rather than skipped.

The platform description replaces the tagline in the brand column. It is a NEW
constant, not a change to `MAG_DESCRIPTION` — that one is the magazine's meta
description, used on `/mag`, in the RSS `<description>` and in the Blog JSON-LD,
where a 45-character summary is correct and Google truncates at ~160 anyway. At
13px `text-muted` and 52ch: it is five times longer than what it replaces, and
at the tagline's size and measure it set seven lines and became the loudest
thing in the footer.

«خبرخوان (RSS)» replaces «خوراک RSS» — «خوراک» is correct and is what publishing
uses, but a finance reader is not a publishing reader. The bracketed Latin run is
isolated, same as article titles.

**The other social channels are asked for and not yet added.** Telegram and
LinkedIn were named; the URLs were not supplied, and a guessed handle is worse
than a missing one — `sameAs` asserts to Google that this organisation IS the
account at that address, so a wrong one either makes a dead entity claim or
attaches somebody else's profile to this publisher. Both sit in
`SOCIAL_CHANNELS` with empty URLs; pasting the address in makes them appear in
the footer and the JSON-LD at once.

The list also stopped labelling every entry «اینستاگرام», which was correct only
while there was one. Two entries would have produced two chips with the same
accessible name.

### 8 🟡 `?page=N` was serving page one at unbounded URLs

`/mag/archive?page=2` returned 200 with the content of page one, and so did
`?page=3` and `?page=99`. Next ignores a parameter no route reads. That is worse
than a 404 — Google indexes a 200 — and it is a duplicate on an unbounded set.

Handled in middleware rather than four route files. Every case verified,
including chains terminating in one hop with no loops. `?page=99` redirects and
then 404s, which is the correct end state: middleware cannot know the last page
without a data fetch at the network boundary, which is exactly what that layer
must not do.

**Two bugs in the first version, both found by testing rather than reasoning.**
`/search?q=…&page=2` was being redirected — search paginates by query string on
purpose and had fallen through the "not a path-paginated route" branch, so its
page 2 was 301'd to its own page one. And `/mag?page=3` answered 200 while
`/mag/archive?page=3` redirected correctly: Next prefixes matchers with the
basePath, so `'/((?!…).*)'` becomes `/mag/(…)`, which requires the slash and
never matches `/mag` itself.

**Search Console was not checked** and the brief asked for it — this environment
cannot reach it or the CMS. The brief also says the fix ships either way,
because the duplicate-content problem exists regardless; only the urgency
depends on the impression count.

### 9 🟡 «عکس‌های شاخص را خراب کرده» — needs the reviewer, not a change

Feedback on `9b86b3f`, which draws each hero at its own aspect ratio instead of
a fixed 3.24 band. "Broke" could mean cropped, stretched, too tall or too small,
and each has a different fix — so nothing is changed until they say which.

What that commit measured, and the trade-off they are probably reacting to:

| source ratio | old hero | new hero |
|---|---|---|
| 680×272 (2.50) | 23% cropped | 0% — renders as a 544px band |
| 1200×630 (1.90) | 41% cropped | 0% — 714px tall, pushes the body down |
| 1200×800 (1.50) | 54% cropped | 21% |

Both plausible complaints are the same change seen from opposite ends: a wide
image is now a thin strip, a tall one now pushes the article a long way down.
The old band cropped everything equally instead, which is why it was changed.
**The measurement the brief asks for still cannot be taken here** — the CMS is
unreachable (`curl` returns `000` in ~0.3s, refused by the proxy allow-list, not
a timeout). The query is in `backlog.md` B14.

---

## 2026-09-07 (later) — The ToC follows the reader, the newsletter stops lying, the official lockup lands

### The sticky class had been there all along and had never done anything

`ArticleAside`'s <nav> carried `sticky top-[76px]` from the day it was written.
It did nothing. A sticky element can only travel inside its containing block,
and its containing block was the grid item wrapping it — which under the grid's
`items-start` is exactly as tall as the panel it holds. Zero travel.

That is why the 20 August entry could record the height cap as protecting "the
sticky behaviour it existed for" while the sticky behaviour was not happening.
The cap shipped; the sticky did not; and the class reads correctly in the
markup, so a review had nothing to catch.

The right-hand rail worked by accident of structure: it IS the grid item, and a
sticky grid item resolves against its grid AREA, which spans the row. So the
fix was to do what that column already does rather than invent a second
approach — `sticky` moved up one level onto the grid item. **One positioning
strategy for both sidebars** is the part that stops this drifting again.

`xl:` and not `lg:`, unlike the right rail: below 1280 that column is
`lg:col-span-2`, a full-width strip holding the <details> disclosure, and
pinning a collapsed accordion over the article would be worse than the bug.
Measured at eleven widths — at ≥1280 both panels report `top=76` mid-scroll;
below it the wrapper computes `position: static`. The height cap survives and is
now load-bearing rather than defensive: the panel is 787px inside a 900px
viewport, so the TOP edge is the one that sticks and the last of the 24 entries
stays reachable.

**The scroll-spy was wrong, and "should be unaffected" is why nobody looked.**
The brief expected the observer to be unaffected by the sidebar's position and
asked for a measurement anyway. The measurement found it broken — for an
unrelated reason. It was `entries.filter(isIntersecting).sort(by top)[0]`: the
topmost of the entries that CHANGED, not the heading the reader is under. With
a ~220px detection band and headings ~600px apart, most positions have no
heading in the band at all, so the highlight held whatever last crossed it. On
the 41-minute article at 1440×900 it was five and six sections behind.

Not caused by the sticky change — verified by overriding the wrapper back to
`position: static` at 1440 with layout otherwise identical, which reproduced
the same four wrong answers exactly. A first comparison against 1024 seemed to
implicate it and was confounded by the column count; the runtime override is
what isolates the variable. **The sticky fix is what makes it matter**: a stale
highlight that was off-screen for most of the read is now pinned in front of
the reader for forty minutes.

The observer stays as the cheap trigger; its callback now asks the DOM which
heading the reader is under. Re-picked on the rAF scroll frame too, so an
anchor jump that carries the viewport past several headings between callbacks
cannot leave it behind.

**And the highlight is kept inside the scrolled list.** The panel is capped, so
only ~16 of 24 entries are visible; without this the panel follows the reader
while the reader's place in the panel does not — half a fix that looks whole.
It scrolls the container's `scrollTop`, never `scrollIntoView`: the target sits
in a nested scroller inside a sticky panel and `block: 'nearest'` still walks up
and can move the window. Measured at zero page movement across seven positions.
Vertical only, so the RTL `scrollLeft` warning does not apply — and it must
never become horizontal arithmetic. Rect deltas rather than `offsetTop`, whose
`offsetParent` here is the sticky grid item, not the list.

**A fixture bug fixed in passing, and it was ours.** The 24-heading body was
assigned as `STRESS[0].content`; the three hero fixtures added earlier the same
day went to the front of that array and silently moved the long-read article to
index 3, so it lost its content and its outline and rendered no contents panel
at all. Nothing failed. Addressed by slug now.

### The newsletter form was telling readers they had subscribed

`handleSubmit` did not send anything anywhere. It waited 400ms and rendered
«ثبت شد؛ ایمیل تأیید برایتان ارسال شد» — a confirmation that a confirmation
email had been sent, when no request was made and no address was stored. Every
reader who typed an address believed they had subscribed, and the line above the
field promises «هفته‌ای یک ایمیل». It was live on production, on a publication
whose position is «بدون سیگنال، بدون تبلیغ».

Hidden, not softened. A "coming soon" notice keeps the field on screen and
invites the same input, so the reader still types an address and still gets
nothing. One flag — `NEWSLETTER_ENABLED` in `features/mag/lib/newsletter.ts` —
takes out the card and both header CTAs together.

**The blocker is two DNS records, not the frontend.** Without SPF and DMARC on
`thefinance.ir` the confirmation email lands in spam and the double opt-in dies
at its first step, so wiring the form to an endpoint would replace a fake
success with a real silence. The backend is designed and costed in B6.

**The flag cannot live in the component, and that is not a style preference.**
It was there first and it did not work: `NewsletterCta.tsx` is `'use client'`,
and a server component importing a value from a client module receives a client
reference PROXY rather than the value. A proxy is an object, an object is
truthy, so `NEWSLETTER_ENABLED && <a/>` in the server-rendered header evaluated
to TRUE with the flag set to `false` — the card vanished while both CTAs kept
rendering and pointing at an id that no longer existed. Nothing errored, the
build was clean, and only `curl` on the served HTML showed it. **A flag read
across the client boundary is not a flag.**

**It was also causing a horizontal overflow nobody was measuring.** With the
desktop CTA present the header row needs 1136px, so it pushed past the viewport
from 1024 to 1135 — the band where the five-link nav has appeared but the row
has not grown to hold it. 390 and 1440 both passed the whole time.
`check-invariants.mjs` now sweeps 1024 as well: a breakpoint boundary is where
layout breaks, and testing only the middle of each range is testing where it
cannot.

### The official lockup replaces the accent-bar placeholder

The header and footer drew a 9×24 accent bar plus «مجله فایننس» as text. That
was a placeholder chosen for a real property — two DOM nodes instead of a
network request on the LCP path — and the replacement keeps it: the lockup is
inline SVG, so it is still markup and still cannot 400 the way a misconfigured
`next/image` src did on the first deployment.

Inline is also the only option that works. «مجله» is a live `<text>` node in the
asset; through `<img src>` or a CSS background an SVG cannot reach the page's
fonts and cannot pull one in either, so the word would fall back to a system
font while the rest of the lockup stayed outlined.

**One asset, three themes.** The pack ships a dark file and a `-light` file
differing only in the ink — #FFFFFF against #0B1120. Shipping both would mean
the header choosing between them, which means the header knowing the theme,
which the server cannot: the theme is applied pre-paint from localStorage. The
ink is `currentColor` instead. The three blues stay literal — they are the mark,
not a palette, the brand rules forbid recolouring it, and it must read
identically on every theme. Same reasoning as the non-flipping `--scrim-*` and
`--on-media` tokens, and the same reason it is not a hardcoded-colour violation:
a logo is artwork, not a themed surface.

**THE ASSET'S OWN FONT INSTRUCTION IS REFUSED.** Its README specifies Vazirmatn
Light for «مجله» and offers a `fonts.googleapis.com` stylesheet to load it.
Both are ruled out and neither is close: `CLAUDE.md` fixes the typeface as
IRANYekanX product-wide — Blog v4 shipped Vazirmatn and it was reverted for
exactly this reason, 2026-08-29 — and no Google Fonts or foreign CDN may sit on
the critical path of a site served from Iran behind ArvanCloud. So
`font-family: inherit`, and the word renders in IRANYekanX at weight 300, a real
instance rather than a synthesised light because the face is loaded as a
variable font spanning 100–1000. If it ever has to match the drawing exactly,
outline «مجله» in IRANYekanX; do not load a second face. The note is written
into `assets/brand/README.md` beside the instruction it overrides.

Favicon and touch icon come from the same pack via Next's file convention
(`src/app/icon.svg`, `apple-icon.png`). No `favicon.ico`: browsers request that
at the SITE root, which under `basePath: '/mag'` belongs to the main site, so a
`/mag/favicon.ico` would be a file nothing asks for. `public/logo.png` is
untouched — it is the PUBLISHER mark in JSON-LD, «فایننس» rather than the
magazine, and it is already the same official artwork.

The C2PA metadata was stripped from every stored file: ~8KB of base64 per SVG,
more than the artwork in most of them, and provenance for the generator rather
than for the mark.

### A responsive sweep, because it was asked for

9 routes × 15 widths — every breakpoint boundary in the codebase and one either
side: 320, 360, 390, 480, 639, 640, 767, 768, 1023, 1024, 1100, 1279, 1280,
1440, 1920. Two real overflows found and fixed, both invisible at the two widths
anyone measures:

- **1024–1135**, every route: the header newsletter CTA, above.
- **320px, `/search`**: the field is `flex-1` with no `min-w-0`, so its default
  `min-width: auto` refused to shrink and pushed the `shrink-0` submit button
  14px off the edge. The header's search field and the 404's already pair the
  two classes; this one had drifted.

Clean at every width afterwards.

---

## 2026-09-07 — Category routes, the cutover's missing commit, and three live defects

### The image fix that lived only on the production server

Every image on the live site 502s, and the reason is that `next/image` optimises
**server-side**: the fetch is made by Node inside the container. nginx on the
frontend listens on `:80` only — TLS terminates at the CDN — so a fetch of
`https://thefinance.ir/...` from inside that container leaves the machine, hits
the CDN and hairpins back to the same box, which times out.
`wp.thefinance.ir` is a different host and resolves normally.

That was patched directly on the server during the cutover and **the patch is
not in git**. `origin/claude-main` still carries the pre-cutover mapper, so the
next rebuild from git — which is explicitly what the deploy is supposed to be —
would have reintroduced the outage the server was patched to stop. This is the
same pattern as the redirects mu-plugin: a fix that exists only on a machine.

**The version now in git is not the same fix, deliberately.** The server's version
rewrites in `mapImage`, which sends the de-indexed CMS host into JSON-LD
`image.url` and `og:image` — the two consumers that read `MagImage.url`
verbatim — and that is exactly what PR #2 added `toPublicUrl` to prevent. Both
justifications are valid and they apply to different consumers:

| consumer | fetched by | needs |
|---|---|---|
| `next/image` src | the optimizer, server-side, inside the container | CMS host |
| JSON-LD `image` | nothing; it is a claim to Google | public origin |
| `og:image` | a social crawler, from outside | public origin |

So the split lives in `imageSrc`, the one boundary where "this URL is about to
be fetched by the optimizer" is actually known, and `MagImage.url` stays the
public URL it has always been.

**The path changes too, not only the host**, and this is the trap the nginx
media block fell into twice. WordPress derives media URLs from `siteurl`
(`https://thefinance.ir/mag`), but on the CMS host uploads sit at the root:

```
https://wp.thefinance.ir/wp-content/uploads/X.jpg      200
https://wp.thefinance.ir/mag/wp-content/uploads/X.jpg  404
```

A host-only swap turns a 502 into a 404 — the same failure one hop upstream.

**`remotePatterns` was not already correct.** Its `wp.thefinance.ir` entry
carried `/mag/wp-content/uploads/**`, allow-listing the one shape the CMS
answers 404 to. That mismatch fails silently: the optimizer returns 400 and the
page renders with every image missing, which is how the first deployment
shipped. Fixed, with a note in `next.config.ts` saying it and `CMS_ORIGIN` are
one decision written in two files.

### `/mag/category/<slug>` — built, not redirected

`/mag/archive?type=education` **cannot be indexed by this build**, and that is
structural rather than a tuning problem: awaiting `searchParams` opts a Next
route out of prerendering entirely, so a filtered archive is dynamic on every
request and never becomes a static page Google can be handed. «آموزش» is 41 of
53 articles — the largest single body of topical authority the magazine has —
and it was sitting behind the one URL shape the build cannot prerender. A path
segment is part of the resource's identity, so `/category/education` is static
ISR. Same reasoning that moved pagination out of `?page=`.

`generateStaticParams` reads the **live taxonomy**, so a term the editors add
gets a working, prerendered, sitemap-listed archive on the next revalidation
with no deploy. `dynamicParams = false`, so a slug with nothing behind it 404s
rather than rendering on demand. «دسته‌بندی نشده» is excluded by slug until the
CMS-side delete lands.

**The nav did not follow, and that is the point.** `CATEGORY_NAV` stays five
hand-picked links; only «آموزش» was repointed to the path route. Rendering the
CMS's category list in the header would put «مقالات» — 39 posts, a catch-all tag
nobody chose as a section — at the top of every page for being large, and would
hand an editorial decision about the top of every page to whoever adds a term.
A route is not a nav slot.

**The archive layout was reused, not re-templated.** `/archive` and
`/market/<slug>` had grown two copies of the same shell — same grid, same sticky
offset, same sidebar, same breadcrumb JSON-LD — differing only in masthead text,
which filter row appears and where pagination points. A third copy would have
made the layout a convention rather than a thing, and the next spacing fix would
have landed in two files out of three. Extracted to `ArchiveShell`; the three
routes now differ in data and in nothing else. The filter row stays a **slot**
rather than a `taxonomy: 'market' | 'type'` prop, because a prop like that would
quietly re-merge the two axes `decisions.md` chose to keep separate.

### The sitemap floor, and the market archives it de-indexes

Eight articles, in `src/features/mag/lib/taxonomy.ts`. Below it an archive stays
out of the sitemap **and** carries `noindex` — both, because keeping a URL out
of the sitemap does not stop Google finding it through the links on every page,
so a sitemap-only exclusion is decorative. The routes still render and are still
linked; only the indexing claim is withdrawn, and `follow` stays on.

Live that admits education 41, articles 39, news 10 and excludes analysis 2 and
inchart 2. Paginated pages are always `noindex, follow` regardless of size: a
slice has no subject of its own, its contents move as articles publish, and it
competes with page one for the same query.

The same floor replaced `count === 0` on the market archives, **and there it
de-indexes all six** — crypto 5, forex 3, global 3, tse 2, gold-usd 1, housing 0
— including the three the header links to. That is uncomfortable and it is the
honest answer: a market archive holding two articles IS thin, and indexing it
does not make it less so. 39 of 53 articles carry no market at all. **This is a
content-workflow problem, not an architecture one**, recorded as B17 rather than
designed around; every archive crosses the floor on its own the moment its
market reaches eight, with no deploy and nothing to remember.

B4 is closed on the same measurement. Its own trigger was "any single market
reaches roughly 8–12 articles"; the largest is 5, and the untagged share went
*up* from 56% to 74% across the migration.

`?type=` keeps working and 308s to the path route, page number carried across.
Checked against the live taxonomy rather than `CONTENT_TYPES`, because the two
sets differ in both directions: «مقالات» is a category with no content type, and
«گزارش» is a content type with no category — redirecting `?type=report` on the
strength of it being a known type would have sent readers to a 404.

### «۱٬۴۰۵» — a thousands separator inside a year

The footer rendered the copyright year with a Persian group separator (U+066C),
because `Intl.NumberFormat('fa-IR')` groups by default and `toPersianDigits`
was the only digit helper. A year is not a quantity. Neither is a page number,
a post ID or a phone number.

**Fixed at the call sites, not globally.** `useGrouping: false` everywhere would
be the same mistake pointing the other way — «۱۲۰۰۰ نتیجه» is genuinely harder
to read than «۱۲٬۰۰۰ نتیجه». No single format is right for both, so the call
site has to say which it means, and the name is what makes it say so:
`toPersianDigits` keeps grouping for quantities, `toPersianDigitsUngrouped` is
spelled out so `toPersianDigits(year)` looks wrong on sight.

Audited: ungrouped now for the footer year, pagination page numbers, the
«صفحه ۲» in five paginated route titles and its hidden heading, and the position
number on `ArticleRow`. Still grouped, correctly: search total, news total,
author article count, market counts, comment thread total, reading time,
reading-progress percentage.

**Jalali years in dates and day headings were never affected**, which is worth
recording because they were the first suspects. `Intl.DateTimeFormat` does not
group a year field. Measured on the rendered page, not reasoned about: across
seven routes the only four-digit runs anywhere are ۱۴۰۳ and ۱۴۰۵, both
ungrouped. `check-invariants.mjs` now asserts it permanently, with a
year-shaped pattern (۱٬۳۰۰–۱٬۵۹۹) rather than "any grouped number" so it cannot
start failing the day a real count crosses a thousand — falsified before
shipping against «۱٬۴۰۵», «۱۴۰۵» and «۱۲٬۰۰۰».

The footer's `1405` was also a literal that would have gone silently wrong on
1 Farvardin ۱۴۰۶. It now reads the clock through the date formatter.

### The article header: what was reported and what was there

**The centred `h1` is not in this codebase.** Measured on the built page at
1440px: `text-align` computes to `start`, and the h1's box is flush with the
container's inline-start edge, sharing it exactly with the byline row.
`text-center` appears nowhere in `src/` on any file, and `git log -S` finds no
commit that ever added it to the article template. The live container predates
this branch — `/mag/health` reports `buildId: "unknown"` — so the centring is
almost certainly there and not here, and it goes away with the next deploy.

**The handoff's centring is deliberately not honoured**, whatever the live build
is doing. RTL body copy establishes a reading edge, and a centred heading
abandons the edge every line beneath it returns to. That is the decision; this
paragraph is the record of it.

**One real misalignment was found and is NOT fixed**, because it is the drawn
design rather than a defect: at ≥1280 the h1's reading edge is 1400 and the
body's is 1092 — a 308px gap, with the 260px contents rail between them. The
title block is capped at 820px because that is the design's measure for a 44px
h1. Narrowing it to the body column would align the two edges and contradict the
drawing, so it is flagged here rather than decided unilaterally.

**The share row moved below the body.** Order of operations, not tidiness:
nobody shares an article they have not read. At the top it asked for the
decision before the reader had anything to decide with, and it spent the most
valuable strip on the page — directly under a 44px h1, at the reading edge — on
three buttons rather than on who wrote this and when. The brief's third option
was to keep it in the header but quieter; moving it does both.

«@» is gone. It is not an email icon anywhere — it is the separator in an
address — and it was guarding the one button that opens the reader's mail
client. «TG» and «WA» were Latin abbreviations on a Persian page. All three are
inline SVG marks now, inline because no third-party request is allowed here.

**The accessible names were already correct**, contrary to the report: every
anchor carried an `aria-label` and the glyph was `aria-hidden`, so a screen
reader read «هم‌رسانی در تلگرام» and never «TG». Only the wording changed, to
the «اشتراک‌گذاری …» form. RTL order was verified by geometry rather than by
reading the array — Telegram x=968, WhatsApp x=918, email x=868 at 1440px, right
to left from the reading edge — and it falls out of array order in an RTL flex
row, so there is no `flex-row-reverse` to drift out of sync.

### The hero was drawn at a shape nothing in the archive has

`h-[220px] md:h-[420px]` full-bleed is 1360×420 at 1440 — a ratio of 3.24 — with
`object-cover` inside it. The archive's featured images cluster at 1.90
(1200×630, the standard OG size and the great majority), 1.50 (1200×800) and
2.50 (680×272, the three images under 800px wide). So the box cut a band out of
the middle of every one:

| source | was, 1440 / 390 | now |
|---|---|---|
| 680×272 (2.50) | 23% / 36% | 0% / 0% |
| 640×427 (1.50) | 54% / 6% | 21% / 0% |
| 1200×630 (1.90) | 41% / 16% | 0% / 0% |
| 1200×675 (1.78) | 45% / 11% | 6% / 0% |

A fixed taller box was rejected: at 1.9 it would still crop 21% off a 1.5 image
and would crop the **sides** off the 2.5 panoramas, which are chart images whose
edges carry the axis labels. `object-fit: contain` was rejected too — the frame
keeps its own shape and bars everything inside it, and a bar-padded hero reads
as a broken upload in a design that is deliberately image-led.

The variable height carries no CLS risk because of where the number comes from:
`mediaDetails` is fetched server-side and the ratio is in the markup, so the box
has its final height before a single image byte arrives. Measured with a
layout-shift observer installed before navigation: **CLS 0.0000** on four
articles at both widths.

Two clamps, not one: [1.9, 2.8] desktop, [1.5, 2.8] mobile. The floor is a
desktop cost control — full-bleed at 1360px an unclamped 1.5 image stands 907px
tall and puts those pixels on the LCP path — and at 350px that reasoning does
not apply. Applying the desktop floor on mobile anyway was the one regression in
the first measured pass (6% → 21%, because the old 350×220 box happened to sit
near 1.5 by accident), so mobile keeps its own.

**And the mock was hiding all of this.** Every mock cover is 1200×675 — the one
shape the archive does not have — so the fixed hero looked correct against the
fixtures while cropping 41% off every real image. Three fixtures were added at
the measured dimensions, drawn with an inset frame and corner marks so a crop is
visible in a screenshot rather than inferred from a number.

### Smaller things, and one that is only a note

**News day-group ordering** is correct: days descending, items descending within
a day. Verified on the rendered `/mag/news` — ۲۸ → ۲۷ → ۲۶ مرداد, with each
group's timestamps in order. Verified against the mock's six items, not the
live ten; see the blocked list below.

**No `wp-json` route was added to Next**, and none exists. Confirmed by search.

**Nineteen articles carry hand-written canonicals that duplicate what the SEO
layer already builds.** They are redundant rather than wrong — `toMetadata`
rebuilds every canonical from `SITE_ORIGIN` and the slug and never passes a
Rank Math URL through, so a hand-written one cannot reach the page even if it
points somewhere else. Two of them carried a trailing `%20`, already fixed
CMS-side. Clearing the remaining nineteen is a CMS pass with no frontend
component and no urgency; it is recorded here so the next person to see them
knows they are inert rather than load-bearing.

### What could not be done, and exactly why

**This environment cannot reach the CMS.** `curl` to `https://wp.thefinance.ir/mag/graphql`
and to `https://thefinance.ir/mag/` both return `000` in ~0.25s — a connection
refused by the agent proxy's allow-list, not a timeout, so retrying does not
help. The handoff states the CMS is reachable ("dozens of queries ran against it
during the cutover"); that is true of the machine the cutover ran on and not of
this session.

Blocked on it, with the commands in B14 and B4 of `backlog.md`:

- the cover-art count (how many of the 53 featured images have the headline
  baked in) — B14, still unsized
- the five category status codes against production
- the sitemap's contents against production
- the featured-image aspect-ratio measurement against production — the hero
  clamp is built to the ratios the handoff reported, and should be re-checked
  against the query in B14 once someone can run it
- news day-group ordering against the real ten items

Everything else in both briefs was done and measured against the built app.

---

## 2026-09-06 — Ten items from reading the rendered pages

A review of the 60-image export, not of the code. Three of its findings
contradicted claims made at the same commit, and those disagreements were worth
more than the defects.

**Parenthesised Latin phrases split and mirrored when a title wrapped.**
«تحلیل فاندامنتال (Fundamental Analysis) چیست؟» rendered at 390px as
`Fundamental)` on one line and `(Analysis` on the next. Bidi reordering
(UAX#9 L1–L2) runs per visual line AFTER line breaking, so a wrapped bracket
pair resolves each half against the paragraph's RTL direction and a lone `(`
mirrors. `bidiTitle()` wraps the phrase in `dir="ltr"` at every site a title
renders. Not `white-space: nowrap`, which would trade a broken bracket for
horizontal overflow. Three of the reported titles were not in the fixtures, so
the defect was not reproducible locally; they are now.

**The invariant checker printed and never failed.** It emitted a table and then
"All invariants hold" unconditionally, and shipped in `reports/performance.txt`
showing `eager 0` on three routes directly beneath a stated invariant of
"exactly one eager image per page".

To be precise about what was broken: the ArchiveCard priority fix WAS in the
code and always was. What shipped wrong was the report — its two halves were
generated by two scripts pointing at two different ports, one of them a server
left running from an older build, so current LCP numbers sat beside
three-commit-stale invariant numbers in one file.

`scripts/check-invariants.mjs` now exits non-zero, takes the base URL as an
argument so the two-port mistake is structurally impossible, and refuses to run
against a stale server. That last guard took two attempts: the first compared
hashed asset filenames and did not work, because Next reuses chunk names when a
change does not alter the emitted bundles — it passed against a demonstrably
stale server, which is the exact false confidence the file exists to remove. It
now compares `/mag/health`'s `buildId` against `.next/BUILD_ID`.

**That build stamp earns its place independently.** Pages are generated at
build time, so a stale image serves stale content indefinitely and a restart
does not fix it — which is how the container on the frontend server went three
weeks stale with nothing on the running site saying so. It is the git SHA, not
a timestamp: `next.config` is evaluated by both `next build` and the server at
startup, so a timestamp produced two values one second apart and never matched.

**A market's list, count and pagination came from three sources.**
`/mag/market/gold-usd` showed «۱ مطلب» above two rendered cards. Worse than the
label: `getArticles({ market })` filtered in JS over a single page of an
UNFILTERED query and took `total` from a count that did not include the market,
so a market whose posts sat further down the archive showed fewer than it has,
and page 2 re-filtered a different unfiltered page. At 32 posts that mostly hid;
at 53 it does not. One fetch now feeds all three. A taxQuery would scale better
and is deliberately not used: a wrong custom-taxonomy enum returns nothing
rather than erroring, and this environment cannot reach the CMS to verify the
name, so it would trade a visible wrong number for a silent empty page.

**Mobile had no navigation.** Five category links, reachable only from the
footer. The note against a hamburger — "with two links, a drawer costs a tap, a
JS bundle, a focus trap and a motion-preference case, all to hide two words" —
was right for two links and does not carry at five. It is also why the answer is
a scrollable strip rather than a drawer: every cost that note lists is a cost of
HIDING things, and a strip hides nothing.

**One control shape, two taxonomies.** The archive's chips filter by content
type; a market's chips filter by market. Each row now names its axis. Naming
rather than unifying, because the two-axis model is a deliberate decision and
this row is where it reaches the reader.

**The empty search state offered narrowing.** «جستجو در بازارها» above market
chips, on a query that had already returned nothing. Reframed as browsing. NOT
a most-read list, the other obvious answer and the one suggested in review:
CLAUDE.md rules out popular sections outright.

**The footer disclaimer said "this article" on pages with no article.** Split
into an in-article form and a site-wide one. Compliance copy, so only the scope
word changed; the wording still needs sign-off from whoever owns it.

**News items were unordered within a day.** `groupByDay`'s own comment claimed
"newest first, preserving order within a day" and did neither — it bucketed in
arrival order. It sorts now, on `publishedAt`, the same field the row renders
as its clock.

**The no-image placeholder was invisible, and that is the third contradiction.**
The review said the archive row drops the image box and the text spans full
width. Geometrically it does not: a null-image row measures 984×208 with a
270×170 box, identical to its neighbours. Visually the review was right — the
placeholder was `--surface-raised` on a card that is also `--surface-raised`, so
the reserved space could not be seen. A measurement said "no reflow" and
answered a different question than the one being asked. Now `--surface-hover`
with an inset hairline.

**TBT is at roughly 2× its guideline and the earlier report undersold it.**
384–442 ms against 200. It was described as "at its guideline" when four of six
routes were flagged over. But the same commit range measures 199–229 ms on one
host and 365–420 ms on another with byte-identical bundles — verified by
re-measuring the pre-change commit — so the figure is a property of the machine
as much as the app. Recorded as B16 with the real driver, 123–125 KB of
first-load JavaScript, rather than as a number presented as stable.

---

## 2026-09-06 — Finishing v4: the media path was still wrong, twice over

`claude-main` merged in first, bringing the four cutover blockers and the
redirects mu-plugin — which until today existed only on the CMS VPS. The
changelog conflicted at the shared anchor and both entries were kept.

**THE MEDIA FIX FROM 2026-08-29 WAS HALF WRONG, AND THE WRONG HALF WAS THE
UPSTREAM.** That entry concluded WordPress is installed under `/mag` and pointed
the new block at `proxy_pass https://wp.thefinance.ir;` — no path, so nginx
preserves the request URI and asks the CMS for `/mag/wp-content/uploads/…`.
Measured against the real hosts today:

```
https://wp.thefinance.ir/wp-content/uploads/X.jpg      200
https://wp.thefinance.ir/mag/wp-content/uploads/X.jpg  404
```

Uploads live at the **root** on the CMS. The `/mag` in `/mag/graphql` and
`/mag/wp-admin` is nginx on the CMS host stripping a prefix, not a subdirectory
install. So the previous fix moved the 404 one hop upstream instead of removing
it — the same failure, somewhere that looks fixed. The block now carries a
trailing path (`…/wp-content/uploads/`), which is what makes nginx replace the
matched prefix, plus `proxy_ssl_server_name on` for SNI. `media.md` records both
corrections rather than overwriting the first.

The general lesson is the one the 29 August entry itself stated and then failed
to apply: those before/after tables proved routing **semantics** against a
stand-in, not what the live host serves. A stand-in cannot falsify an assumption
about the upstream, because the stand-in was built from that assumption.

**The repo's nginx config was not the server's, and copying it would have taken
thefinance.ir down.** The live file is `/etc/nginx/conf.d/thefinance.ir.conf`,
not `sites-available`. It proxies the main site to `localhost:7902` where the
repo said `127.0.0.1:9080` — WordPress. It has no TLS at all (terminated
upstream) where the repo had `listen 443 ssl` and Let's Encrypt paths. It
carries `/fa` `/en` `/ar` → `/` redirects the repo did not have. All reconciled,
and the file now opens with a header saying to diff it, never copy it.

**Cutover is two changes, not one — and testing that claim found a third
defect.** `location /mag/` on the live server ends `proxy_pass …:9080/` with a
trailing slash, which strips `/mag` for WordPress (installed at the root).
Next.js has `basePath: '/mag'` and needs the full path, so the slash must go
when the port moves. Proven under nginx:

```
9080 + slash    WordPress sees /archive      OK
3100 + slash    Next.js  sees /archive       404  ← the trap
3100, no slash  Next.js  sees /mag/archive   OK
```

The third defect: this repo expressed the upstream as `set $mag_upstream` so the
cutover would be one edit. **With a variable in `proxy_pass`, a URI part is sent
as-is instead of replacing the matched prefix** — so the variable form plus the
slash the live config needs sends `/` for every request, and every WordPress
page renders the home page. Measured directly:

```
location /mag/  proxy_pass http://$var/;         upstream sees "/"
location /mag/  proxy_pass http://127.0.0.1:P/;  upstream sees "/archive"
```

The convenience was never real once the slash mattered. Both upstreams are
literals now and the cutover is two commented lines.

**`missingCompiled` on `/mag/health`.** Only one direction was ever checked —
compiled rules the CMS has stopped returning. The reverse, live rules with no
compiled floor under them, was invisible, and it is the direction that fails
during a CMS blip rather than after one. The live map returns 19 rules; the
compiled fallback holds 9. A blip at the wrong moment would have 404'd ten
ranked URLs while `missingKnown` reported everything fine.

`scripts/sync-redirects.mjs` regenerates the table from the CMS —
`npm run redirects:sync`. Generated rather than transcribed because nineteen
Persian slugs typed by hand is how a wrong destination gets in; it decodes
percent-encoding, strips slashes, and preserves the two code-only entries with
their reasoning intact. It refuses to write on an error or an empty response,
so it cannot empty a good fallback. Verified against a stub returning a
19-rule payload — which caught a bug in its own first version: it anchored on
`];` and matched a sequence inside a comment, producing a 28-rule file. It now
anchors on the terminator line and preserves `as const`.

**The dek gained a source that carries no deploy risk.** `cardDek` now prefers
`excerpt(format: RAW)` — the hand-written field only, never WordPress's
auto-truncated summary — and falls back to the derived H2 headings. `excerpt` is
standard WPGraphQL, so unlike `outlineHeadings` it cannot fail against a CMS
without the new plugin version. Whether the heading path can be dropped
entirely, which would remove the deploy-order hazard, depends on how many of
the 53 posts carry a manual excerpt. **That has not been measured** — the build
environment's network policy denies both hosts — so both paths ship and the
mock gives two of nineteen fixtures an excerpt rather than implying a
proportion.

**`trailingSlash` stays off; B0b closed.** A 308 passes full link equity and
costs no ranking, so one hop on currently-ranking URLs beats reshaping every
canonical, sitemap entry and internal link product-wide during the release where
the least should change. Recorded in `docs/decisions.md`.

**Staging moved to a path.** `new.thefinance.ir` was dropped; staging is
`https://thefinance.ir/mag-next/` on the production host, already serving with
`noindex`. Its config file is removed from the repo and the certbot step with
it.

**Stale counts corrected where they drive a decision.** The archive is 53 posts,
not ~32. B4 (market filter bar) was deferred because 18 of 32 articles had no
market; nobody has recounted at 53, so B4 is now marked **undecided rather than
deferred**, with the query to settle it. B14's cover-art scope is re-based on 53.
The dated audit documents keep their original figures — they are records of a
measurement, not claims about today.

**B15 opened: two live redirects point at destinations that 404.**
`what-is-a-moving-average-indicator` targets a slug that does not exist, and
`introduction-to-persian-tradingview-inchart` targets `/mag/mag/free-tradingview/`
with `/mag` doubled — which WordPress cleans up today and Next.js will not.
The second is 43% of all `/mag` clicks. CMS-side fixes, deliberately not
patched in code: the live map is authoritative and a code patch would be
overwritten by the next sync.

---

## 2026-08-29 — Cutover blockers: four path bugs that only fire at cutover

Four defects, all of the same shape: correct-looking config that has never once
executed, and whose failure is masked by the fact that `/mag` currently proxies
to WordPress. At cutover `/mag` starts pointing at Next.js and all four surface
at the same moment, which is the worst possible time to find them.

**Uploads never matched their own nginx block.** Both configs carried
`location /wp-content/uploads/`. WordPress is installed under `/mag`, so the
real path is `/mag/wp-content/uploads/` — which is what `next.config.ts`
allow-lists in `remotePatterns` and what the GraphQL endpoint's own path
implies. nginx picks the **longest matching prefix**, so those requests matched
`location /mag` and the uploads block was dead code from the day it was
written. Two consequences: `proxy_hide_header X-Robots-Tag`, the entire reason
the block exists, has never run — and at cutover Next.js has no such file on
disk, so **every image on the site 404s at once.**

Both paths are now present in `infra/nginx/thefinance.ir.conf` and
`infra/nginx/new.thefinance.ir.conf`; `/mag/wp-content/uploads/` is longer than
`/mag`, so it wins, and the un-prefixed block stays for any historical URL that
still uses it. Production hides the CMS's `X-Robots-Tag` so images stay
indexable; staging deliberately does not, because staging images should stay
out of the index along with everything else on that host.

`docs/infra/media.md` had its entire argument built on the wrong path. It is
corrected rather than deleted — the URL-contract reasoning and the MinIO
sequencing were right, only the prefix was wrong — and it now opens with the
correction so nobody re-derives the old paths from it.

**The GraphQL rate limit was never applied.** `wp.thefinance.ir.conf` had
`location = /graphql`, an exact match, against a real endpoint of
`/mag/graphql`. Every query fell through to `location /`, missing both
`limit_req zone=graphql` and `Cache-Control: no-store`. The public schema was
effectively unthrottled. Now `location = /mag/graphql`.

**`mapImage` bypassed the host rewrite.** `url: image.sourceUrl` went out raw
while every other URL goes through `toPublicUrl()`. `remotePatterns` allows
`wp.thefinance.ir` too, so the day `siteurl` or a plugin returns a CMS-host
media URL, images would be served silently from the de-indexed host and fall
out of Google Images — rendering perfectly the whole time. Now wrapped.

**`missingKnown` was a gate that passes when it cannot measure.** The cutover
condition was "`redirectSource.missingKnown` must be empty". But until a
`magRedirects` fetch has succeeded in that process, the cache **is** the
compiled-in table, so the probe compares the seed against itself and returns
`[]` by construction — the identical answer it gives when everything is
healthy. With the mu-plugin absent, the gate that exists to catch exactly that
absence would have passed. The condition is now
`reachable === true && missingKnown.length === 0` in `docs/cutover-plan.md`,
`docs/infra/frontend-deploy.md`, the `/mag/health` route comment and
`probeRedirectSource`'s own doc comment. `reachable` says the measurement
happened; `missingKnown` says what it found. Neither means anything alone.

**Three doc drifts, corrected.** The changelog and the deploy runbook said
"twelve rules" — the map holds **nine**, after three rules for URLs that never
existed were removed (`69c979e`). `README.md` and `docs/handoff.md` named the
branch `claude`; it is `claude-main`. `docs/cutover-plan.md` said step 1 was not
deployed, but the deploy session brought the container up on `127.0.0.1:3100`
serving real WPGraphQL data — "deployed" and "verified" are now stated
separately there, because they are not the same claim.

### Still open — and why, precisely

**The redirect mu-plugin is still not in git, and this is the highest-priority
item on the branch.** `wordpress/mu-plugins/thefinance-mag-redirects.php` lives
only on the CMS VPS. Three fixes were applied to it there during the deploy
session — normalising Rank Math's absolute `url_to`, decoding the Persian slug
exactly once, and comparing slash-normalised paths in the flatten loop — and
none of them exist anywhere else. One container rebuild takes redirects,
preview and revalidation with it.

It cannot be copied from this environment: the CMS host is unreachable from the
build sandbox and there is no PHP binary here to lint with. On the server:

```bash
docker compose exec -T wordpress \
  cat /var/www/html/wp-content/mu-plugins/thefinance-mag-redirects.php \
  > wordpress/mu-plugins/thefinance-mag-redirects.php
php -l wordpress/mu-plugins/thefinance-mag-redirects.php
```

The frontend half of the contract it has to satisfy is in the repo and was
re-checked against the source: `redirect-source.ts` queries
`{ magRedirects { from to status } }`, and `mag.api.ts` queries
`magPreview(id: $id, secret: $secret)`. Nothing else is expected of it.

**Three documents named in the brief are not in any repo** and could not be
added, because this environment has never held them: `deployment-findings.md`
(the deploy session log), `content-team-guide.md` (the Persian content-team
guide, effectively the P7 output) and `ui-review-questions.md`. They are listed
here so their absence is a known gap rather than an oversight.

**`mag-master-plan.md` is likewise not in the repo.** If it ever lands, one
sentence in it must be corrected on arrival: *"No redirect map is needed: the
permalink structure is `/%postname%/` and doesn't change."* That is the exact
claim that turned out to be wrong, and 89% of `/mag` organic clicks depend on
it being wrong.

**The two curl checks the brief asks for first were not run.** `thefinance.ir`
is unreachable from here, so the assertion that `/mag/wp-content/uploads/...`
is the live path rests on `remotePatterns`, the `/mag/graphql` endpoint and the
`/mag/wp-admin` path — three independent pointers at the same answer, but not a
measurement. Run both before reloading nginx:

```bash
curl -sI https://thefinance.ir/mag/wp-content/uploads/2026/08/aud-usd-upside-risk-analysis.jpg | head -1
curl -sI https://thefinance.ir/wp-content/uploads/2026/08/aud-usd-upside-risk-analysis.jpg | head -1
```

`nginx -t` and `./scripts/verify-redirects.sh https://thefinance.ir` likewise
need the server.

---

## 2026-08-29 — Blog v4 merge conditions

Six items before v4 merges. One was a real bug, one reversed a decision v4 had
made, four were small.

**The card dek rendered on nothing but the mock, and that is the finding.**
`cardDek()` reads `article.outline`. `SUMMARY_FIELDS` never fetched `content`,
and `mapSummary` set `outline: []` unconditionally — so with `USE_MOCK=false`
every card on the home page, the archive and every market archive had an empty
outline and no dek. The dek is one of three things the v4 card is built around.

It survived review because **the mock offered more than the source did**: some
mock summaries carried a populated `outline`, so the feature looked finished in
every environment anyone develops in. That asymmetry, not the missing field, is
the actual defect, and it now has a comment at the top of the fixtures saying
so.

The fix is a server-side field, not a frontend change and not a bigger query:
`outlineHeadings` on `Post`, registered by the mu-plugin the way `readingTime`
is, computed with the same regex `extractHeadings()` uses so the card dek and
the article ToC cannot disagree about what an article contains. Fetching full
`content` in the listing would have put nine article bodies on the page that
carries LCP and ISR.

`do_blocks()` rather than `the_content`, deliberately: the result has to match
what the article page derives from WPGraphQL's `content`, but running the full
filter chain per post on a listing request drags in oEmbed resolution —
outbound HTTP, per post. `do_blocks()` expands block markup, including dynamic
blocks, and stops there.

**A deploy-ordering hazard came out of that, and it is worth more than the
feature.** GraphQL rejects an unknown field outright rather than returning null,
so a frontend asking for `outlineHeadings` against a CMS that does not have the
plugin version gets `Cannot query field "outlineHeadings" on type "Post"` — and
`gql()` turns that into a MagFetchError. The listing, the archive and search
**fail**, they do not degrade. Verified against a stub returning exactly that
error: `/mag/search` answered 500, while `/mag/archive` answered 200 purely
because ISR was still holding a page generated before the field existed, which
is the most misleading pass available. **WordPress deploys first, frontend
second.** Written next to the field list, not only here.

**Verified end-to-end on the non-mock path**, against a stand-in CMS returning
the field: an article with three headings and one with two both render a dek;
one with `outlineHeadings: []` renders none and the card closes up. Before this
change all three would have been empty.

**The typeface goes back to IRANYekanX, and the column back to 700px.** v4 had
switched to Vazirmatn because the handoff named it, and the switch worked. The
reason for reverting is not technical: IRANYekanX is the design system's face
across the whole product, and changing it in Mag alone rebuilds exactly the
visual detachment this project exists to remove — the same reason headless was
chosen over Elementor. A typeface is a product-wide decision, not a
per-section one.

The 570px measurement stands and was not the reason. Vazirmatn is narrower, so
700px measured 89 characters per line there against 70–73 in IRANYekanX, and
570px was the correct response *to that face*. The column is calibrated to the
typeface, so reverting one reverts the other. `tailwind.config.ts` and
`CLAUDE.md` both now say the two move together, and the two vendored Vazirmatn
subsets are removed.

**`/news` was missing from the sitemap.** A new, indexable route that the RSS
automation refills roughly twice a day, and Google would have had to find it by
crawling alone. Added at `daily`, above `/archive`, because it genuinely turns
over faster than anything else on the site.

**`public/mock` no longer enters the production image.** 252 KB of placeholder
cover art that `public/` publishes at `/mag/mock/covers/*.jpg` — publicly
reachable and crawlable on the production domain, from an image that never runs
the mock. Excluded in `.dockerignore` rather than disallowed in `robots.ts`: a
robots rule is a request not to index something still being served, and not
shipping the bytes is both the stronger statement and the smaller image. The
consequence is stated in the file — an image built from this Dockerfile cannot
serve the mock's artwork.

**Three things the mock was inventing are now null.** `author.role` has no
source at all — not in the content model, nothing in WPGraphQL, `mapAuthor`
returns null unconditionally — so `AuthorBox`'s role line can never render in
production and only ever appeared because the mock filled it in. `avatar` is
also always null, but that one is a decision rather than a gap (Gravatar was
dropped: a third-party request per author, a hash of their email sent abroad,
unreliable from Iran). `bio` is deliberately NOT nulled, because
`author.node.description` is a real field the API really fetches — it just
happens to be empty for all six current users. Backlog B13 carries the `role`
decision.

**A null-image card is now in the listing fixtures**, not only reachable by
slug. `CardImage`'s placeholder branch had never once rendered inside a grid,
which is the only place it can cause the failure worth checking. Measured in a
real browser at 1440px: the placeholder card is 984×208 with a 270×170 image
box — identical to every image card in the same grid, so a missing featured
image cannot reflow the row. v4 is image-led, so that state reads as broken
rather than as restraint, and it belongs where it can be seen.

**Two backlog items opened rather than decided in a component.** `source` on
news rows (B12) — the "render only if present" conditional is right, but
`source` is excluded from the content model, so it is permanently false and
every news row ships with less metadata than v4 specifies. With an RSS
automation publishing translated items twice a day the field probably should
exist, and the decision includes whether it links out, which is a `rel`
question on a publication whose own SEO is the first priority. And cover art
(B14) — reversing the one-image-index rule converted a design constraint into a
content-production commitment, and the size of it is still unmeasured.

### Not measured, and why

Two counts the brief asks for need real data, and `wp.thefinance.ir` is
unreachable from this environment:

- how many cards on `/mag` and `/mag/archive` render a dek against the live
  archive
- how many of the ~32 articles have a featured image **without** the headline
  baked into the artwork

Both need `USE_MOCK=false npm start` pointed at the real CMS. The dek plumbing
is verified against a stand-in; the count is not, and B14 has a scope but not a
size until someone runs it.

---

## 2026-08-29 — Blog v4 redesign

A full rebuild of `/mag` against the `design_handoff_mag_blog_v4` bundle: four
templates (home, category/archive, news, single post), dark-only, image-led.
Built on `claude-main` — PR #1 had already merged and been deployed.

**The palette turned out to be v1 navy, exactly.** `--bg` `#040C1F`, `--card`
`#071331`, `--card-2` `#111C39`, `--accent` `#4D9AFE` and `--accent-contrast`
`#041024` are byte-identical to tokens already in the file, so v1 was refined
rather than replaced and the other two themes keep working. Two v1 values moved
to match the spec — `--text-secondary` to `rgba(255,255,255,.70)` (9.61 on
surface) and `--text-muted` to `.50` (5.34). One was NOT adopted: the spec uses
`--rule-2` (`.22`, measured 1.91) for inputs and outline buttons, and WCAG 2.2
SC 1.4.11 wants 3.0 for a control whose border is its only boundary. Interactive
boundaries use `--border-interactive` (3.95), which is why that token exists.

**Typeface: Vazirmatn, self-hosted, two subsets.** ⚠️ REVERTED — see the entry
above; the face is IRANYekanX. The spec names Vazirmatn from
Google Fonts; it is vendored as woff2 instead, because CLAUDE.md rules out
foreign CDNs on the LCP path and the spec's own asset note asks for the same.
Two files, because one subset does not cover Persian typography — verified by
reading the cmap rather than assuming: the arabic subset (45 KB, 366 glyphs) has
ZWNJ, Persian digits and Persian punctuation but NOT the guillemets « », which
Persian body copy uses constantly and which live in the latin subset. Only
arabic is preloaded. One variable axis replaces IRANYekanX's per-weight files,
and the pair is 79 KB against its 93.

**The reading measure had to be recalibrated, and this is the finding worth
keeping.** ⚠️ The column is back at 700px with the face — the measurement below
is still correct *for Vazirmatn*, which is no longer in use. The content column was 700px, documented as 70–73 Persian characters
in IRANYekanX. Vazirmatn is narrower: the same column measured **89** characters
per line — counted directly off the rendered text with Range geometry, not
estimated. 570px restores ~70 at every breakpoint. The typographic target never
changed; the typeface did, and the pixel value is downstream of both. Any future
face change needs the same measurement.

**Two components from the handoff were not built.** «پرخواننده‌های این ماه» is a
most-read ranking, which CLAUDE.md lists under Never build — and which the
handoff's own Compliance section rules out two paragraphs later ("no trending
badges"), so the document contradicts itself. «تابلوی امروز» is a market-data
board, and `decisions.md` excludes live price data because it invites a
signal-channel reading of an anti-hype publication. Their sidebar slots carry
editorially-chosen link lists instead. Recorded in CLAUDE.md so the next pass
does not read their absence as an oversight.

**The flat category nav maps onto the existing two axes.** The design draws one
axis (طلا و ارز · بورس ایران · تحلیل تکنیکال · کریپتو · اخبار); the data model
keeps `market` and `contentType` because taxonomy bloat is the documented
failure of this category. `cardCategory()` resolves to one label at render —
market when present, content type otherwise — so a card's chip and its
destination page always agree, with no migration and no new URLs to redirect.
One substitution is stated rather than fudged: there is no «تحلیل تکنیکال»
term, and that content is filed as آموزش, so the nav says آموزش.

**Fields with no producer are derived or omitted, never invented.** The design
wants a written `dek`; there is none, and `decisions.md` explains why. On cards
it falls back to the article's own H2 headings — the same source «در این مقاله»
uses. On the POST page it is omitted entirely: the table of contents sits a few
hundred pixels below and lists those same headings, so a derived lead would
print the outline twice on one screen. News `source` renders only when present.

**Three bugs found by measuring, all of which rendered perfectly.**

The post page's three-column grid at `lg` left the article column **299px** —
about 30 characters a line. The design's own responsive note says two columns
between 1024 and 1279; the grid is now `xl` and the contents collapse to a
`<details>` below that.

Reading progress measured `document.querySelector('article')`, which after this
redesign matches a related-post CARD, not the body — cards are `<article>`
elements now. The bar tracked a card's geometry. It reads `[data-article-body]`.

Local images 400'd at the optimizer: with `basePath`, a root-relative `src`
resolves against the SERVER root, so `/mock/covers/x.jpg` fails while
`/mag/mock/covers/x.jpg` works. This is the local half of the defect the first
deployment hit on the remote half. `imageSrc()` normalises it, idempotently, and
every `next/image` call site goes through it.

**Verified:** 10 routes × 3 viewports — no horizontal overflow, one `<h1>` per
page, no heading-level skips, no justified text, no italics, no broken images,
exactly one `priority` image per page. 131 tab stops carry a visible focus ring
and none is clipped. Contrast on rendered surfaces: body 9.61, h1 19.49,
breadcrumb 5.34, muted meta 5.23 — all past 4.5. Reduced motion drops every
transition. Touch targets ≥44px except inline links inside a sentence or
breadcrumb trail, which are the documented exemption.

**Mock fixtures added** so the templates are actually judgeable: generated cover
art (the image-led design cannot be reviewed without pixels), an in-article
figure, and five news items across three days — the day grouping is the whole
point of the news template and one item cannot show it.

---

## 2026-08-21 — Staging re-verification, and two proxy-only bugs

The deploy artifacts were built earlier; this re-ran them against the current
app, which has since gained middleware, preview, revalidation and the feed. Two
bugs surfaced that only appear behind a proxy — both invisible on localhost,
which is why they had survived.

**Preview redirected editors to the container's internal address.** Behind
nginx, `/mag/api/draft` answered:

```
Location: https://0.0.0.0:3100/mag/a7
```

A route handler's `request.url` in the standalone server is built from the
address the process is BOUND to, not from the `Host` nginx forwarded. An editor
clicking Preview in wp-admin would be sent somewhere their browser cannot
reach. On localhost the internal address IS the public one, so it passed every
earlier test.

Fixed by emitting a **relative** `Location`. Valid per RFC 7231, resolved by
every browser against the request URL, and it cannot name the wrong host
because it names none — which is better than reconstructing the origin from
`X-Forwarded-*` and depending on proxy headers being right.

**And the same fix broke middleware.** Next's middleware runtime parses the
header as a URL and throws `ERR_INVALID_URL` on a relative one, turning every
redirect into a 500. So the two layers genuinely differ: middleware must emit
absolute, route handlers must not. That is safe, because a middleware
`request.url` IS reconstructed from the forwarded `Host` — exactly what a route
handler's is not. Both directions are now documented where someone will hit
them.

**`WP_PREVIEW_SECRET` accepted alongside `TF_MAG_PREVIEW_SECRET`.** The deploy
brief names the frontend variable `WP_PREVIEW_SECRET` and the `wp-config.php`
one `TF_MAG_PREVIEW_SECRET`, holding the same value. Both are read here, so
whichever name someone typed on the server works — a mismatch would otherwise
be a silent 401 with nothing to diagnose it by.

**`docs/cutover-plan.md` now exists.** Four briefs have referenced it and it
was in no repo, including the two that attributed to it the claim that no
redirect map was needed. That claim is corrected in the file itself rather than
left to be rediscovered.

**The cutover line got its reasoning inline.** The brief specified two
commented `proxy_pass` directives while also requiring a one-line edit; those
pull against each other, since commenting one and uncommenting the other is two
edits and a half-finished one either refuses to load or 500s every request. The
variable stays, with the alternative written above it and the reason why.

**Verified against the real config files, running:** staging noindexed and
production not, in both directions and again after the cutover line was
flipped; cutover and rollback each with a reload; and through nginx on the
staging host — the index, an article with its canonical on `thefinance.ir`, the
mfi redirect at one hop, preview 401 and 307, revalidation 401 and 200.

**Still not deployed.** The frontend server is unreachable from the build
environment: every request returns the sandbox's 403 and there is no SSH
client. A raw TCP check appears to connect, but it does so against a bogus
address too, so it proves nothing — worth recording, since it looks like
evidence of reachability and is not.

---

## 2026-08-21 — Preview, revalidation, and a live redirect map

The frontend half of `thefinance-mag-redirects.php`. All three of these break
silently the moment the frontend stops being WordPress: the editor clicks the
same button, sees no error, and nothing happens.

**Redirects now read from WordPress, with the compiled table as the floor.**

The nine rules could have stayed a constant, and that works exactly once —
every redirect after it would need a deploy. The SEO team adds one in Rank Math
today and it is live immediately; after cutover they would add one, see no
error, and nothing would happen. So `magRedirects` is fetched on a five-minute
window.

But a CMS blip must not turn ranked URLs into 404s, and those nine carry 89%
of the section's organic clicks. So the fetch is **never in the request's
path**: a redirect is answered from cache, and a stale cache triggers a
background refresh whose failure is swallowed. Cold start serves the
compiled-in table. Verified by killing the stub CMS mid-session — rules fetched
before the failure kept serving, and pages kept rendering.

Deliberately standalone from `mag.api.ts`. This runs in front of every request;
pulling the data layer into that bundle would put the article mapper, the
sanitiser and the SEO mapper on the critical path of a static asset request.

**One sharp edge, made visible rather than papered over.** Once WordPress
answers, its map REPLACES the compiled one rather than merging. That is
deliberate: merging would make a redirect impossible to delete — the SEO team
would remove one in Rank Math and it would keep redirecting, the same silent
failure pointing the other way. The cost is that an under-returning
`magRedirects` silently drops ranked URLs, so `/mag/health` now lists
`redirectSource.missingKnown`: compiled-in rules WordPress is not returning.
Tested with a stub returning a subset — health named exactly the rules it
left out. **It must be empty before cutover — and only when
`redirectSource.reachable` is `true`, since before the first successful fetch
the probe is comparing the compiled-in table against itself and returns `[]`
by construction.**

The two rules whose targets no longer exist in the database are code-only and
always win, so a stale row cannot resurrect a 404. Verified against a stub that
deliberately tried to override one.

**Preview.** `/mag/api/draft` validates the secret with a constant-time
comparison over SHA-256 digests — `timingSafeEqual` throws on a length
mismatch, which would leak the length through an exception, so both sides are
hashed to a fixed width first. Every failure is one generic 401 and the secret
is never echoed back, in a message, a redirect or a log line.

The redirect carries the POST ID in the slug position rather than the slug: a
draft may not have one yet, and an editor renaming a slug is exactly when
preview matters most. In Draft Mode the article route treats that segment as an
ID and fetches through `magPreview`, which returns the newest autosave — a
preview showing the last saved revision looks broken, which is worse than none.

`/mag/api/exit-draft` needs no secret, because turning draft mode OFF is not a
privileged action and requiring one would mean the escape hatch fails exactly
when someone needs it. A banner on every preview says the page is not what
readers see and carries the way out; without it, an editor who previews once is
served uncached drafts everywhere and reports the site as broken.

**Reading `draftMode()` does not un-cache the article route.** That was the
real risk in this change — the ISR fix on that page was hard-won — so it was
checked against the build output rather than assumed. `/[slug]` is still `●`
SSG at 5m, and a published article still answers `s-maxage=300` while a preview
answers `no-store`.

**Revalidation** hits the article, the index, the archive, the feed, the
market archive and the sitemap — the sitemap because `lastModified` comes from
the revision date, and a stale one tells Google there is nothing to crawl. It
is an optimisation, never a dependency: the ISR window stays underneath, so a
call lost to a restart means "a few minutes later", never "never".

**Not verified, and not in this repo.** `thefinance-mag-redirects.php` is not
in `wordpress/mu-plugins/` — the frontend is written against the contract as
described in the brief (`magRedirects { from to status }`,
`magPreview(id, secret)`). If the real field or argument names differ, this
fails quietly, which is the failure mode the work exists to prevent. PHP 8.4 IS
available in the build environment, so `php -l` can be run here the moment the
file lands.

---

## 2026-08-21 — Redirect map: correcting a Phase 0 conclusion

**Phase 0 concluded no redirect map was needed. That was wrong, and it would
have cost most of the section's organic traffic at cutover.**

The reasoning was not careless, it was incomplete. The permalink structure is
`/%postname%/` and genuinely does not change — but that setting describes how
WordPress builds a URL for a post it *has*. It says nothing about posts whose
slug has since changed. The slugs did change, Persian to English or the
reverse, and the URLs Google ranks are the historical ones. They resolve today
only because WordPress and Rank Math 301 them, from
`wp_rank_math_redirections` and `_wp_old_slug` — both entirely inside
WordPress, both gone the moment the rendering layer moves.

From three months of Search Console:

| | URLs | Clicks | Impressions |
|---|---|---|---|
| Indexed under `/mag` | 71 | 180 | 4,284 |
| Slug exists in WordPress today | 23 | 19 | 1,104 |
| **Slug does not exist** | **48** | **161** | **3,154** |

89% of `/mag` organic clicks land on URLs WordPress no longer has a post for.

Corrected in `phase-0-findings.md`, `plan.md`, `phase-0-verification.md`,
`README.md` and the original 2026-08-19 changelog entry — struck through rather
than deleted, because the failure shape is worth keeping visible. The check
that would have caught it is now in `phase-0-verification.md`: take the ranking
URLs from Search Console and ask whether each still resolves *without* a
redirect. Checking the permalink setting is not the same question.

**Fourteen source URLs, flattened to nine entries and one hop each.** Some URLs
take two hops in WordPress today — Rank Math points at a slug that
`_wp_old_slug` then redirects again. Google does not penalise a short chain,
but every hop spends crawl budget and delays the reader, and since the map was
being rebuilt there was no reason to reproduce it. Each entry names the final
destination.

**In middleware, not `next.config.ts`.** The SEO team has to be able to change
the map without a rebuild and a redeploy. Nothing else goes in that file: the
`middleware.ts` → `proxy.ts` rename followed CVE-2025-29927, where one header
bypassed every authorisation check implemented in middleware, and the lesson is
that the layer is for routing at the network boundary. A redirect table belongs
there; its worst failure is a wrong destination.

**One deliberate exception to 301-only.**
`introduction-to-persian-tradingview-inchart` is a 302. It is the biggest
single organic entry point — 77 clicks, 43% of `/mag` — currently 404ing, and
the decision is to rewrite the article under that same slug. A 301 to the
holding page would tell Google the two URLs are one, consolidate the signals
into the destination and drop the source from the index — which is precisely
the URL we intend to publish at. 302 keeps the source indexed and its identity
intact, which is what "the content is coming back here" means in HTTP. Every
other entry is 301. Remove this one when the article ships (backlog B0).

**A trailing-slash bug found while testing, and it was the common case.**
Next's automatic trailing-slash 308 runs BEFORE middleware, so every legacy URL
arriving with a slash took two hops:

```
/mag/what-is-the-mfi-indicator/  →308→  /mag/what-is-the-mfi-indicator
                                 →301→  /mag/mfi-indicator
```

Not an edge case: `/%postname%/` means the historical URLs Google ranks END IN
A SLASH, so the two-hop path was the normal one.
`skipTrailingSlashRedirect: true` hands normalisation to middleware, which
answers a legacy slug in one 301 and 308s everything else exactly as before.

Building the destination with `nextUrl.clone()` then caused an infinite loop —
`NextURL` remembers the request's trailing slash and re-applies it on
serialisation, so `/mag/archive/` redirected to `/mag/archive/`. curl followed
it fifty times. Destinations are now built with a plain `URL` against
`request.url`.

**A second URL-shape change, flagged not decided** (backlog B0b). The trailing
slash is itself part of the URL and it also changes at cutover — for all 71
indexed URLs, not just the 48 legacy ones. `decisions.md` says "do not change
URLs during the headless migration"; this is the part that does. Whether to set
`trailingSlash: true` to match WordPress exactly is a product decision about
URL shape, so it is written up rather than taken.

**Not verified: any of it, against the live site.** The build environment
cannot reach `thefinance.ir`, so every destination in the map is unconfirmed —
they came from a database export, and a typo'd slug is a 404 that looks exactly
like a working redirect until someone follows it.
`scripts/verify-redirects.sh` runs the whole check against any origin and must
be run against production BEFORE the switch, to capture a baseline, and after.
If any of these 404s post-cutover, roll back: it is 89% of the section's
organic traffic, not a cosmetic regression.

---

## 2026-08-21 — Containerised, and a staging host

Step 1 of the cutover. Nothing was deployed — the build sandbox reaches neither
Docker Hub nor the frontend server — so this is the reviewable artifact set plus
what could be verified without them. `docs/infra/frontend-deploy.md` is explicit
about which is which.

**The frontend nginx config is in the repository now.**

It previously existed only on the server, which meant the cutover — the riskiest
single action in this project — depended on a file nobody could review, diff or
roll back. `thefinance.ir.conf` and `new.thefinance.ir.conf` fix that.

The cutover is deliberately one line: the port in `set $mag_upstream`. A
variable rather than two commented `proxy_pass` lines, so switching under
pressure is one edit and a reload rather than a two-line dance where half a
change is a broken site. Rollback is the same line back. Both were exercised
against a running nginx, in both directions.

Both configs set `X-Real-IP` from `$remote_addr`, and that is load-bearing
rather than boilerplate: the comment rate limit keys on it precisely because
`X-Forwarded-For` is built with `$proxy_add_x_forwarded_for` and so begins with
whatever the client sent. Verified through nginx — a spoofed `X-Forwarded-For`
was still limited on the fourth request.

**Staging is a host, not a path prefix.**

The brief asked for a staging path. `basePath: '/mag'` is inlined at build time,
so an image served under `/mag-staging/` still emits links to `/mag/...` — which
on that server is WordPress. Staging would render once and then navigate into
production on the first click. A path prefix needs a second image with a
different basePath, at which point staging is no longer testing the artifact
that gets promoted. `new.thefinance.ir` was already the documented staging host.

The whole staging host is `noindex, nofollow` and serves nothing but `/mag`.
Staging carries the same articles as production, so a leak into the index means
the same content competing with itself — and like the CMS-host case, it fails
silently because every page renders perfectly throughout. Verified in both
directions: staging noindexed, production carrying no such header.

**`NEXT_PUBLIC_*` moved to server-only names.**

Raised in the brief as possibly awkward for the pipeline, and it was: those
variables are inlined at build time, so "env comes from a file on the server"
and `NEXT_PUBLIC_` are in tension. `USE_MOCK`, `WP_GRAPHQL_ENDPOINT` and
`SITE_ORIGIN` are now read server-side first, with the public names kept as
fallbacks so an existing deployment keeps working. Confirmed nothing reading
them reaches the browser — the SWR hooks that import the data service are
referenced by no rendered component, and the endpoint appears in no client
chunk. The public prefix was buying nothing and only invited the value into a
client bundle later.

What renaming does NOT fix, recorded so it is not rediscovered: `SITE_ORIGIN`
is baked into prerendered HTML regardless, because canonical and `og:url` are
written at build time. It does not bite here because all three values are the
same in staging and production — canonicals must name the production origin
even when staging serves the page — so the image stays portable and staging
validates byte-for-byte what production will run. It would bite on review-apps
with a different origin each, which is why the Dockerfile takes them as build
args.

**The Dockerfile copies three things, and two of them are easy to miss.**

`public/` and `.next/static` are not inside `.next/standalone`. A Dockerfile
that omits either serves HTML with no CSS, no JavaScript and no font — which
reads as a broken build rather than a missing copy step. Verified by
reconstructing the runtime stage on disk and running `node server.js` against
it: every route served, and the hashed stylesheet and the IRANYekanX woff2 both
returned 200.

The healthcheck hits `/mag/health`, which reports the data SOURCE and not just
liveness. A container quietly serving mock data in staging is a
misconfiguration that would otherwise look perfectly healthy.

---

## 2026-08-21 — Lead slot, feed, and cacheable archives

Four items from `audit-seo-security-performance.md`. The fourth — the Next 16
upgrade — was deliberately not done; see the end of this entry.

**The lead slot no longer carries news.**

An RSS automation files roughly two «اخبار» items a day. The index led with the
newest article, so the hero was almost always a three-minute translated
headline — meaning a publication whose identity is analysis and education would
never show either in the largest editorial statement on its front page. Because
the automation runs daily, that degrades on its own rather than correcting.

The featured article is now chosen from `analysis`, `education` and `report`.
News keeps its place in the latest list and the archive; it just never takes
the hero.

The selection window is the newest 20 rather than the newest 7, because the
window has to outrun the automation: at two news items a day, 20 covers about
ten days of uninterrupted filing before a genuine article could fall out of
range. The same request feeds the latest list, so widening it costs no extra
round trip. The API has no "not this type" filter, and inventing one against a
field WordPress doesn't expose would be worse than filtering a window already
fetched.

Accepted cost, stated so nobody treats it as a bug: with infrequent human
publishing the lead can go stale for weeks. A good article from last week beats
an automated headline from this morning.

If the window somehow holds nothing but news there is no hero at all and the
page opens on the latest list — verified by building with an empty type list.
Falling back to a news item would defeat the rule this exists to enforce.

**`/mag/feed` exists again.**

WordPress generates `thefinance.ir/mag/feed` today; readers, aggregators and
Telegram bots consume it. After cutover the Next app had no such route, so it
404'd — and it breaks **silently**: a subscriber sees no error, just no new
articles, for months, by which point they are gone. A 404 where content used to
be is a regression whether or not anyone is currently subscribed.

RSS 2.0 from the same `getArticles` everything else uses, newest 20, absolute
`thefinance.ir/mag/…` URLs by construction, cached like the index rather than
rebuilt per request.

Item descriptions are built from the article's own H2 headings, for the same
reason «در این مقاله» is: the content model has no excerpt, deliberately, since
the live site's excerpts are auto-truncated mid-sentence. Headings are derived
from real content, always accurate, and descriptive rather than promotional.

Autodiscovery took a second pass. Declaring it once in the root layout did not
work: Next **replaces** a page's `alternates` object wholesale rather than
merging its sub-fields, so every page that set `canonical` silently dropped the
layout's feed link. It now comes from `feedAlternate()` in `lib/site.ts`,
applied by `toMetadata` and by the two routes that build metadata directly.

We could not check whether anyone currently subscribes — the old frontend
server is unreachable from the build environment, so the nginx access-log
counts in the brief still need running by someone with shell on that box.

**Pagination moved back into the path, so archives can be cached.**

This corrects an earlier decision of ours rather than defending it. The archive
was built with `?page=` because the content-type filter needed a query string
anyway. What that missed: reading `searchParams` makes a Next route fully
dynamic — the server cannot know which query strings will arrive, so it cannot
prerender. Market and author archives were consequently uncacheable, running a
GraphQL query against a `/graphql` that nginx limits to 10 r/s for a page-one
view identical for everybody.

The two concerns are now split: the page number is part of the resource's
identity and lives in the path; a filter is a view over that resource and stays
in the query string. Page one keeps the base URL — `/archive/page/1` and its
siblings 404, because two URLs for one page is a duplicate-content problem.

Result in the build output:

| route | before | after |
|---|---|---|
| `/market/[slug]` | `ƒ` dynamic | **`●` SSG**, all six prerendered |
| `/author/[slug]` | `ƒ` dynamic | **`●` SSG** |
| `/archive` | `ƒ` dynamic | `ƒ` — see below |

`/archive` stayed dynamic and the reason is worth recording, because it will
come up again: **one route cannot be both static and `searchParams`-reading.**
Awaiting `searchParams` at all opts a route out of prerendering, so `/archive`
cannot be static while also serving `/archive?type=education`. Making it static
requires the type filter to leave the query string too — a product decision
about URL shape, not a technical one. Moving the page number out was still
worth doing on its own: it is what made market and author static.

Both archives also needed `generateStaticParams` on top of the path change. A
dynamic segment without it is treated as fully dynamic no matter what
`revalidate` says — the same defect the article route had.

Two things this change nearly broke, caught before they shipped:

- Search paginates by query string on purpose and has no `/search/page/[n]`
  route. Switching the shared href builder pointed its pagination at a 404.
  Search now uses `pageParamHref`, which keeps `?page=` — it reads `q` so it is
  dynamic regardless, and it is `noindex`, so neither reason for the path shape
  applies to it. A `/search/page/[n]` would be a route that exists only to look
  consistent.
- Pagination was untestable locally. Seven hand-written fixtures against page
  sizes of nine and fifteen meant there was never a page two in development —
  which is exactly how the previous round of pagination bugs survived. Added
  generated filler so the boundary can actually be crossed, clearly marked and
  dated older than every designed fixture so it never displaces a real one.

**Next 16: deliberately NOT upgraded.**

Three high-severity advisories sit in Next's own dependency tree and the only
fix is a major bump. The exposure assessment stands: postcss is effectively
nil, since only our own CSS is ever compiled; sharp is genuinely reachable
through `next/image` at request time, narrowed to an authenticated editor
uploading a malicious image because the optimizer only accepts our own hosts
(verified — every SSRF shape tried returns 400).

Not now, because the upgrade brings Turbopack as default, async `params` and
changed `next/image` defaults, and there is currently nowhere to find out what
breaks: staging does not exist yet. When it does, as its own change with its
own test pass, then re-run the full audit sweep against it.

Carried context for whoever does it: the `middleware.ts` → `proxy.ts` rename
followed CVE-2025-29927, where a single header bypassed every middleware
authorisation check, and CVE-2025-66478, the RCE that prompted our own bump
from 15.1.0. That layer is for routing at the network boundary — not auth, not
data access. If redirects are ever added they go in `proxy.ts` and contain
nothing else.

---

## 2026-08-20 — Editorial landing and archive

**Rebuilt the index around one image instead of nine.**

Every featured image in this archive has the article's headline baked into the
artwork. A nine-card grid therefore printed every title twice — once as art,
once as text — which is why the listing read as cluttered no matter how the
spacing was tuned. No CSS fixes a content problem.

The index now shows artwork exactly once, on the lead article, and everything
below is a text row. It reads as a publication's contents page rather than an
app screen, and removes eight image requests competing with the LCP hero.

**Added `/mag/archive`.** The index links to it as "آرشیو".

This closed a real bug: the index showed seven articles and pagination started
at the tenth, so three articles were reachable from nowhere. The archive is the
complete reverse-chronological list and is where the content-type filter now
lives — filtering is a browsing action, and browsing doesn't belong on a
curated front page.

The filter uses `?type=` rather than `/type/<slug>` routes: one canonical
archive URL beats four thin near-duplicate pages.

**Reading time promoted to the first meta slot.** It ranges from 3 to 41
minutes across this archive, which makes it genuinely decision-shaping rather
than decorative — a 41-minute piece is a commitment, a 3-minute one a glance.

**Markets became a quiet list with counts, not a filter bar.** With 18 of 32
articles carrying no market and `housing` at zero, a row of chips made the
emptiness of the taxonomy the visual point of the page.

---

## 2026-08-20 — Article page layout

- Article container centred at `max-w-[1080px]`. It had been pinned to the
  reading-start edge with two thirds of a wide screen empty.
- Table of contents capped in height with internal scrolling. The
  technical-analysis article is a 41-minute read; an uncapped list stretched
  past the viewport and defeated the sticky behaviour it existed for.
- Added scroll-spy highlighting via `IntersectionObserver`, with `rootMargin`
  pulling the detection band to the top third — without it the highlight lags a
  full section behind the reader.

**Fixed: table-of-contents links pointed at anchors that didn't exist.**

The ToC linked to `#s1-...` while the body had no matching ids. Neither the
anchor jump nor the highlight worked, and nothing errored — the feature simply
did nothing. Both sides now derive ids from one `headingId()` function in
`lib/sanitize.ts`.

**Fixed: the mock hid the bug.** It had hardcoded ids (`s1`, `s2`) while
production generates them from heading text, so the mismatch was invisible in
development. The mock now runs the same content pipeline as the real API.

That is the third time a mock diverging from production hid a real defect —
after market counts and SEO metadata. A mock that skips the transforms isn't
testing the component, it's testing a different component.

---

## 2026-08-20 — Real WordPress data

**`mag.api.ts` implemented against the verified schema.** The app now runs on
32 real articles.

**Cursor pagination instead of offset.** `wp-graphql-offset-pagination` is not
in the WordPress plugin repository, only on GitHub. Installing from outside the
repo means no automatic updates and no review, and 91% of disclosed WordPress
vulnerabilities are in plugins. Not worth it for something solvable in code.

Numbered pages are reached by walking cursors. With ~32 posts that's a few
hops, ISR caches the result, and it's lighter on MySQL than a large `OFFSET`.

**Priority-ordered category mapping.** Category counts don't add up to the
article count — articles carry roughly two categories each, because «مقالات» was
used as a general tag rather than a type. Picking "the first category" would be
non-deterministic: GraphQL guarantees no ordering, so an article's type could
change after an unrelated edit.

`resolveContentType` maps «مقالات» and «اینچارت» to null and resolves the rest
in priority order — news first, education as the fallback. The WordPress
category cleanup can now happen later without any code change.

**`اخبار` added as a fourth content type.** An RSS automation publishes about
two items a day and they're meant to be indexed. News gets `NewsArticle` schema
rather than `Article` — publication date is the signal for translated news,
revision date for evergreen education.

**Inline `text-align: justify` stripped from article bodies.** The classic
editor writes it, and inline styles beat the stylesheet. Justified Persian
produces rivers of whitespace without kashida support. Fixed in the data on the
way in rather than papered over with `!important`.

**Gravatar ignored.** WordPress returns a `secure.gravatar.com` URL for every
user, but it's a third-party request per author, it leaks a hash of their email
abroad, and it's unreliable from Iran. Avatars render as an initial.

---

## 2026-08-20 — Header and footer

Built into `src/shared/ui/` rather than the feature, so swapping in the
redesign's real shell later is one import change.

**The magazine had no route back to the main site.** A reader arriving from
search finished an article and was stranded. The logo now links to
`thefinance.ir` on every breakpoint.

**Header carries only InChart and Academy.** Paradigm is the paid VIP channel
and sits in the footer instead — leading an editorial page with a paid
subscription is what the competitive category does and what the brand rules
out.

**No hamburger menu.** With two links, a drawer costs a tap, a JS bundle, a
focus trap and a motion-preference case, all to hide two words.

**Footer carries market and author links.** On a thirty-page site, the footer is
how a crawler reaches pages that are otherwise two or three clicks deep.

**Mock market counts aligned to reality** (crypto 5, forex 3, global 3, tse 2,
gold 1, housing 0). The mock had every bucket full, so the "hide empty markets"
rule was never exercised in development.

---

## 2026-08-19 — SEO layer and structured data

Metadata mapped from Rank Math with **canonical host rewriting**. Rank Math
returns whatever `siteurl` says; if that ever moves to the CMS host, the same
articles index from two hosts and dilute each other. It fails silently — the
page renders perfectly throughout.

**JSON-LD built in code, not passed through from Rank Math.** The schema layer
knows which articles are news and which are evergreen education; Rank Math
can't infer that. Emitting both would put two conflicting Article blocks on one
page.

`Article`, not `NewsArticle`, for educational content — "what is the Ichimoku
indicator" is as true next year as today, and the wrong label sends the wrong
freshness signal.

`sitemap.ts` and `robots.ts` generated in Next.js. Rank Math's sitemap emits
WordPress URLs, which after cutover would point at the CMS host and invite
Google to index it.

**Three bugs caught by inspecting rendered HTML, not by the type system:**

- Every article shared one article's OpenGraph title and description. The mock
  spread a whole `seo` object; the shape was valid so nothing errored.
- `dateModified` equalled `datePublished` on every article. If everything
  claims to be updated, nothing is.
- A missing article returned 500 rather than 404. A 500 tells Google the server
  is broken; a 404 tells it the URL is gone.

---

## 2026-08-19 — Comments and newsletter

**Comments are moderated and hidden when empty.** Submission goes through a
Next.js route handler rather than the browser talking to WordPress: that's
where rate limiting (3 per IP per 10 minutes), the honeypot, and field
validation are enforceable.

The honeypot returns a normal-looking success rather than an error — telling a
bot it was detected only teaches it to adapt.

Comment bodies render as **plain text, never HTML**. It's the one place on this
site where an untrusted party controls content.

**Newsletter is email, not SMS.** The content is a weekly explanatory summary,
which fits an email and doesn't fit a text message. More to the point, SMS is
the medium of the signal channel — collecting a phone number sets an
expectation this brand can't meet.

---

## 2026-08-19 — Font

IRANYekanX self-hosted via `next/font`. One variable file covers weights
100–1000 at 93 KB; separate static weights would cost several times that.

Verified coverage includes **ZWNJ (U+200C)** — «می‌شود» and «سرمایه‌گذاری» break
visibly if the font falls back mid-word.

**The font's own default weight is 100.** Without an explicit 400 on `body`,
Persian body copy rendered anaemic.

Never a CDN: this sits on the LCP path and Google-hosted assets are
intermittently unreachable from Iran.

---

## 2026-08-19 — Frontend foundation

Next.js App Router, `basePath: '/mag'`, strict TypeScript, Tailwind bound to
the semantic tokens with no parallel palette.

**Three design-system tokens added**, all of which are system-level rather than
Mag-local:

- `--focus-ring` fails in the light theme — the dark-theme blue measures 2.85
  against white, below the 3:1 required by WCAG 2.2 SC 1.4.11. Keyboard focus
  was effectively invisible.
- `--border-interactive` — control boundaries need 3:1; `border-subtle`
  measures 1.28 and `border-strong` 1.68.
- `--danger` for form validation.

Mag has these fixed locally. The redesign token layer still doesn't.

**`Intl.DateTimeFormat` instances are module-level singletons.** Measured:
constructing one costs ~107ms cold and ~0.42ms warm; reusing one costs ~0.007ms.
A six-card grid constructing per card wastes ~2.5ms per render.

**`timeZone` pinned to Asia/Tehran.** Without it the server runs UTC and the
browser runs Tehran, so the same timestamp rendered as ۲۸ مرداد server-side and
۲۹ مرداد client-side — a wrong date and a hydration mismatch.

---

## 2026-08-19 — WordPress migration

Migrated to a dedicated CMS VPS. 32 published posts, 133 MB media, 12 MB
database.

TLS via certbot. `X-Robots-Tag: noindex` verified on `/`, `/mag/` and article
paths — without it the same articles index from two hosts.

The header had to be repeated inside every proxy location: nginx does not
inherit server-level `add_header` into a location block that declares its own.

**Security issues found and fixed:**

- phpMyAdmin published on `0.0.0.0:8060` — a public database login
- WordPress published on `0.0.0.0:9080`, bypassing nginx and TLS
- `/wp-json/wp/v2/users` open, leaking every WordPress username and turning a
  brute-force attempt on `wp-login` into a targeted one. Three IPs had already
  queried it
- `wp-file-manager` installed — repeated critical RCE history. Deactivated

**mu-plugin deployed:** `market` taxonomy, `readingTime` (150 wpm, server-side),
`modifiedAtIso`, `marketDescription`.

An mu-plugin because these are infrastructure the frontend queries, not
optional features. The cost is that a parse error takes down the site with no
admin recovery — hence `php -l` before every deploy.

---

## 2026-08-19 — Phase 0 verification

Three findings changed the plan:

**Permalinks are `/%postname%/`.** ~~No redirect map is needed~~ — **corrected
2026-08-21: this was wrong, see that day's entry.** The structure doesn't
change, but the slugs did, and 89% of organic clicks land on historical slugs
that only WordPress knows how to redirect.

**Most slugs are percent-encoded Persian.** An early assumption that they were
Latin was wrong, drawn from the five most recent posts. The `[slug]` param needs
`decodeURIComponent` handling or most of the archive 404s.

**Roughly 60% of articles have no market.** The listing design treated market as
the primary filter axis; against real content that bar is nearly empty and
`housing` has zero. The 18 unclassified articles are general technical-analysis
education, which belongs to no single market.

Also verified: `seo.robots` is `[String]`; `seo.__typename` is
`RankMathPostObjectSeo`; `wp-graphql-rank-math` was missing and was installed;
no mu-plugins existed.

---

## 2026-08-18 — Architecture decision

**Headless WordPress + Next.js confirmed over a page builder.**

Reopened three times, most recently in favour of Hello Elementor. The complaint
that triggered each reopening — "the blog doesn't look like the site" — is
unfinished work, not a wrong architecture: the React component layer had never
been built. A page builder would have made the mismatch permanent by creating a
second source of design truth.

Full reasoning in `decisions.md`.
