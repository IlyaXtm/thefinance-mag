# Changelog

What changed, when, and why. Entries are newest first.

Ordinary commit messages say what happened; this records the reasoning, so a
decision doesn't get quietly reversed six months later by someone who can't see
why it was made.

---

## 2026-09-11 (later) — B36: the 404 that actually happens is a real page now

Closes backlog B36. `/mag/<dead-slug>` served 58 bytes — `<body><div hidden>
</div></body>` — and now serves a 37,860-byte document with a 404 status,
without JavaScript.

```
                        before  →  after
/mag/nope                   58  →  37,860   404
/mag/market/nope            58  →  37,860   404
/mag/author/nope            58  →  37,860   404
/mag/category/nope      37,860  →  37,860   404   unchanged
/mag/archive/page/999      722  →     722   404   see below
```

With JavaScript disabled, all four now render the h1, the header, the footer,
the search form and five links out. Before, all but `/category` rendered
nothing at all.

### Approach A is closed, and it was tested six ways

Question 1 of B36 was whether `notFound()` can render into initial HTML at all.
In Next 15.5.23 it cannot, and it is not our code:

```
minimal dynamic route, dynamicParams default + notFound()        58 bytes
  … plus a segment-local not-found.tsx                           58
  … with notFound() thrown from generateMetadata instead         58
  … with export const dynamic = 'force-dynamic'                 722  (metadata only)
  … with experimental.globalNotFound + global-not-found.tsx      58
  … with dynamicParams = false                                37,860  ← the only one
```

A minimal route with no application code reproduces it, so it is a framework
behaviour. **That also explains the 722.** `force-dynamic` flushes the
metadata — `<title>`, `robots: noindex`, the icons — and leaves the body in an
unresolved Suspense boundary (`<!--$?--><template id="B:0">`). It is the same
failure with a head attached, and it is what `/mag/archive/page/999` is.

I could not check upstream issues: this session's GitHub access is scoped to
this repository, and cloning `vercel/next.js` would give source, not issue
state. **If this is a known bug with a patch, an upgrade may be the real
answer** — worth checking before anyone builds on the workaround below.

### Approach B, with C's body

Middleware rewrites a dead slug to a static page, with the status set on the
rewrite. That was measured before being built:

```
NextResponse.rewrite(target)                    →  200, full 35,635-byte body
NextResponse.rewrite(target, { status: 404 })   →  404, full 35,635-byte body
```

The body is **one component**, `NotFoundContent`, rendered by both
`app/not-found.tsx` (for everything Next resolves at build time) and
`/not-found-page` (the rewrite target). Two copies would drift and the drift
would be invisible — nobody looks at a 404 twice.

**A basePath trap cost a round.** `nextUrl.pathname` arrives with `/mag`
stripped, and the first probe matched `'/mag/zz-rewrite'`, which never fires.
The file already documents this for redirects; the rewrite needed the same
care, and the target goes through the existing `absolute()` helper.

### Freshness: a new article resolves on its first hit, with no rebuild

The constraint was that `dynamicParams = false` stays off, so middleware has to
know a slug is dead without a rebuild. It asks the app: `/api/known-slugs`
returns the routable set from the service layer, so the answer comes from the
mock or from WPGraphQL exactly as every page does — **which is why this is
testable on a laptop at all.** A middleware querying WordPress directly is a
middleware whose 404 handling cannot be verified locally.

A background-only refresh would have re-created the trade we rejected: a new
article invisible until the next window. So a **miss blocks** — and a miss
spends a token from a five-token bucket refilling one a second, which keeps a
crawler from turning a thousand dead URLs into a thousand queries. Driven
against a controllable endpoint:

```
a published slug resolves                          true
a dead slug is rejected                           false     1 query
— an article is published in the CMS, no rebuild —
the very next request for it                       true     1 query
a crawler walks 200 dead URLs                      5 queries, then cached
the endpoint goes down, set already cached         still answers
```

The endpoint is `revalidate = 0` deliberately: at 60 it would have put its own
window in front of the bucket and a new article would have stayed invisible for
up to a minute however eagerly middleware refetched.

### It rejects nothing it is not sure about

Three gates, any of which lets the request through: the first segment is a real
route; the slug set is unavailable (`ok: false`, empty, or the archive
overflowed its whole-archive fetch); or the slug is in the set. Failure
degrades to the old blank 404 — never to a 404 on something real.

**Two ways I got that wrong before the sweep caught it**, both worth recording
because both were silent:

- **The slug source was a listing.** The first version asked `getAllSummaries`,
  the sitemap's set — 27 of the archive's routes. It 404'd `stress-rich-article`
  and every layout fixture while reporting itself healthy. "Does this slug
  resolve?" is now answered by `getRoutableSlugs`, a source function that
  mirrors `getArticle` branch for branch. The second attempt still missed
  `fundamental-analysis`, which is `FULL_ARTICLE` and belongs to neither
  collection — reasoning about the mock rather than reading its resolver.
- **Percent-encoding.** Most of the archive is percent-encoded Persian in the
  URL and decoded in the route set. Comparing the raw segment matched nothing,
  so the first build 404'd most of the archive while every Latin slug worked.
  Middleware decodes, as `[slug]/page.tsx` already did.

After both: **50 routes swept, zero regressions.**

### Two guards, both negative-tested

`check-invariants` now counts the `<body>` with `<script>` stripped on four
404s and requires ≥20,000 bytes, a 404 status and `noindex`. This project has
shipped this exact class before — an `if (!mounted) return null` that made
every page invisible to crawlers for months — and a page that is empty before
hydration looks perfectly fine in a browser.

It also reads `src/app` and fails if a route segment is missing from
`RESERVED_SEGMENTS`, because middleware treats an unreserved single segment as
an article slug. A route added and forgotten there would 404 in production
while working in `next dev`.

```
a route missing from RESERVED_SEGMENTS   →  ✗ missing: zz-newroute
the byte floor raised to 90,000          →  ✗ 4 failures, 37,860 bytes
```

### What is still broken, and what it costs

**`/mag/archive/page/999` is still 722 bytes.** It is the `force-dynamic`
shape: correct status, correct `noindex`, correct `<title>`, blank body.
Middleware cannot fix it, because "is page 999 beyond the end of this listing?"
needs a per-listing count it does not have — the article set is one list; page
counts are one per category, author and market. Nobody links to page 999, so it
is the rarest of the shapes and the only one left. Recorded as **B37** rather
than left to be rediscovered.

**A found, unrelated defect: `category/[slug]`'s comment is wrong.** It says
`dynamicParams = false` is fine because "New terms arrive through revalidation,
which regenerates this list." The prerender manifest says otherwise —
`fallback: false` with a fixed route list baked at build — so a category the
editors add 404s until a deploy, silently. Not touched here; recorded as
**B38**, because it is a content bug rather than a 404 bug.

---

## 2026-09-11 — One rail: the contents, with «بیشتر در …» beneath it

The container went to the width measured off the reference with a ruler, and
the article's third column went with it. What replaces it is one rail carrying
both navigations.

### The container: 1224, and an admission

A ruler on the reference and on our own page, in the same browser at the same
window, read **1223px** against **1427px**. An earlier pass in this project had
compared the reference's OUTER box against our CONTENT box and concluded we
were "within 10–99px". We were **217px wider**. The ruler is right and that
comparison was not.

`.mag-gutter` caps at **1224** rather than 1223 because 1224 divides exactly
into the article's two rows — `340 + 64 + 700 + 2 × 60` — so the hero image
lands above the rail and the h1 above the first paragraph with nothing over.

**Desktop padding goes 100 → 60, and that amends CLAUDE.md.** The 100 was
written when the container was effectively the window and the padding WAS the
gutter. With a 1224 cap the centring margin is the gutter — 341px a side at a
1785 window — and this number is the container's internal inset. 60 is the
largest value that keeps BOTH recorded constraints at once:

```
padding   content   3-col article   hero pair 1080   ToC rail
   100      1023     impossible     image → 283px      275
    80      1063     impossible     image → 323px      315
    60      1104     impossible     image stays 340    355   ← taken
    40      1143     impossible     image stays 340    395
```

At 100 the hero drops to 283px — 27.7% of the pair — undoing the correction
made one commit earlier. There is no value at or above 72 that keeps both.
Below the cap the padding is still the gutter and 60 is more generous there
than 100 was: at a 1024 window the content is 904px rather than 824.

### The third column was impossible, not sacrificed

Three columns need 1240 of content for the 700px measure to survive. The
largest content box a 1224 container can produce is 1143. There is no padding
that fits it. The reference runs two columns for the same reason.

### One rail, pinned as one unit — and the detour is worth recording

The rail carries the table of contents, then «بیشتر در …» beneath it. Both are
navigation answering the same question at the same moment — the ToC moves the
reader inside the article, the onward panel moves them out of it.

**`sticky` is on the rail, the grid item, exactly as instructed. I tried the
other thing first and measurement sent me back.** The reasoning for the detour
was: a sticky box moves as one, so pinning the pair means the pair has to fit
the viewport, and measured at 1280×800 it was 741px against a 700px budget on
an ordinary article and 1472px on the 24-heading one. So I put `sticky` on the
ToC panel inside a `self-stretch` rail instead, which does give "contents
pinned, onward panel scrolls away".

**It also puts a STATIC element behind a POSITIONED one.** The onward panel
scrolled up behind the pinned contents, and Tab landed on links the reader
could not see. Measured at 1440 with `elementFromPoint` at each focused link's
centre:

```
article                          ToC height   headings   occluded stops
stress-long-technical-analysis      633–1002      24            3
stress-wide-content                      409       7            1
```

At 800, 900 and 1169 viewport heights alike. Two of twelve articles, and a
seven-heading article is not an edge case. That is SC 2.4.11 — focus obscured —
and it is not a thing to document and move past.

Pinning the pair removes it by construction: nothing moves relative to anything
else, so nothing can cover anything. **The instruction was right and the
objection to it was a budget problem, not a mechanism problem.**

### Paying for the budget: the ToC cap, and one item off the onward panel

The rail has to fit `viewport − 76 − 24`. Measured on the built page: the
onward panel is 446px at four items, the ToC's own chrome is 89, the gap is 24.
That left the contents list `100vh − 659`, and at a 1280×800 window an ordinary
FOUR-heading ToC started scrolling. An everyday laptop, an everyday article —
too expensive.

**So the onward panel went from four items to three**, 446px → 352, which also
matches «مطالب مرتبط» below it. The list cap is `100vh − 37rem`. Entries
visible before the contents scroll:

```
viewport   old cap (16rem)   new cap (37rem)
   800           16                 6
   900           19                 9
  1169           26                17
```

The result, measured across every article × height:

```
article        headings   rail height vs budget          onward visible at rest
24 headings       24      673/700  773/800  873/900       65px of 352, then all
rich               4      647 at every height             43–352, then all
short              3      601 at every height             65–352, then all
```

**Every rail fits at every height.** Once the reader scrolls and the rail pins,
the onward panel is fully on screen on every article — including the 24-heading
one, where the previous design showed 0px of it at every viewport and this one
shows all 352. The ToC scrolls internally on that article, which it already did.

**No scrollbar on the rail.** A column with its own scrollbar beside a page that
also scrolls is two competing scroll contexts. The cap is inside the ToC panel,
on its list — the one place an overflow is load-bearing rather than a second
scroll context for the page.

### It is an invariant now, not a note

`check-invariants` scrolls 1000px and asserts the ToC lands on 76. Its first
version asserted `after <= 80`, which a ToC that has scrolled clean PAST the top
satisfies trivially — with the stretch removed it read −116 and still passed.
Negative-tested both ways:

```
as shipped              top 414 →   76    PASS
self-stretch removed    top 414 → −116    FAIL ✓ caught
sticky removed          top 414 → −586    FAIL ✓ caught
```

And the occlusion check: **120 onward-panel tab stops across 12 articles and
four viewport heights, 0 occluded.**

### Mobile: after the body, before «مطالب مرتبط»

NOT inside the `<details>` that holds the contents below `xl`. That disclosure
is closed by default and most phone readers never open it — a panel in there is
a panel nobody sees. After the body is the first moment the question it answers
is live. Verified on 12 articles: `afterBody=true, beforeRelated=true` on every
one.

### The dedupe had a hole, and the move would have exposed it

`onwardInType` was filtered against «مطالب مرتبط» from the day it was written.
**The recency fallback underneath it was not** — so on a content type too small
to fill the panel, the reader could meet the same article twice. It was
invisible while the two sat in opposite columns of a three-column row; as a
rail and a block on the same reading path, one after the other on a phone, it
would not have been.

Fixed, and the filter now runs against `relatedRendered` rather than
`related.items` — the related section only renders at three or more, so below
that there is nothing to collide with and filtering would thin the panel for no
reason. The panel is also mapped once and rendered twice, so the rail and the
mobile placement cannot drift into two different lists.

Verified across 12 articles at 390 and 1440: **0 overlaps**. The fallback
heading still applies — «بیشتر در گزارش» on the thin types, never a name the
content does not earn.

### The cost in tab order, which is inherent and not a bug

Measured at 1440, the order is now **header → ToC → «بیشتر در …» → body**. The
onward panel used to sit after the body in the DOM; in one rail it cannot, so a
keyboard reader passes three more links before the article.

Not fixable within the one-rail structure, and the attempt is worth recording
so nobody spends an afternoon on it. Keeping the panel after the body in source
order while showing it in the rail means explicit grid placement — ToC in
column 1 row 1, onward in column 1 row 2, body spanning both rows in column 2 —
which needs `grid-template-rows: auto 1fr` to stop row 1 stretching. That makes
row 1 exactly as tall as the ToC, which is the `397475f` containing block again
and the sticky dies.

Three stops, all of them real navigation, immediately after a table of contents
the reader was already passing. Taken.

### Also

- **The reading-progress readout stays with the ToC**, in its panel header
  where `ae71cae` put it. A progress bar at the foot of a rail that now ends
  with a different panel would read as progress through the rail.
- **`NewsletterCta` loses its article-page slot.** It renders null today
  (`NEWSLETTER_ENABLED` is false) so nothing changes on screen, and it keeps
  its four other homes. The rail is navigation; if the flag is ever flipped,
  the article page is deliberately not where the card comes back.
- **The `wide` breakpoint is gone from tailwind.config.ts.** It existed for the
  three-column row and has no other consumer.

### Verified

```
container    outer 1224 from 1280 up; body 700px at 1024/1223/1280/1440/1785/2041
rail         fits the viewport on every article at 720/800/900/1169
occlusion    120 onward-panel tab stops, 12 articles, 4 heights   0 occluded
dedupe       12 articles × 2 widths                               0 overlaps
structure    17 routes × 8 widths                                 0 findings
contrast     3 themes × 2 widths, 3,261 samples                   0 failures
a11y         17 routes × 2 widths                       0 beyond known exemptions
keyboard     34 walks, 1,232 stops            0 invisible, skip link first on all
invariants   9 routes × 7 widths          all hold, including the new sticky check
```

`npm run check:invariants` needs a running server and a base URL —
`BASE_URL=http://127.0.0.1:3420 npm run check:invariants`. Bare, it prints
usage and exits 2, so a chain that includes it will stop rather than silently
skip the check.

---

## 2026-09-10 (night, fourth pass) — The hero image, measured against the reference

A reference screenshot came back with a selection frame drawn on it: "i wanna
this size … compare with our website". Two things were measured, and only one
of them was wrong.

**The page container is not the difference.** Reading the frame handles against
the screenshot's 2000px width, the reference's container is 65.6% of the window
with 17% gutters. The capture turned out to be a MacBook in "More Space" mode,
which puts the window at 1785, 1905 or 2041 logical px depending on the machine:

```
machine                window   ours   reference 65.6%   diff
MBP 14" More Space      1785    1240        1171         +69
Air 15" More Space      1905    1240        1250         −10
MBP 16" More Space      2041    1240        1339         −99
```

Within 10 to 99px at every one. `.mag-gutter` was already right.

**The hero image was.** Ours measured 208px against a pair of 940 — **22%** —
where the reference is 348–398 against a pair of 1100–1265, **31.5%**. This
project's own record said 31% too, until earlier the same day.

The cause is in the last-but-one commit: the header row was re-cut to
`[208px 700px]`, the body grid's inline-start track, to close a 68px offset
between the h1 and the first paragraph. It closed the offset and took a third
off the image.

**The reference does not align those two either** — its header text sits about
350px inside its body text — and it reads as a two-column band rather than as a
mistake precisely because the offset is large. 68px was the bad middle: too big
to look intentional, too small to look structural. So the image wins and the
offset is allowed to be obvious. At `wide`: 340 + 40 + 700 = 1080, image 31.5%
of the pair, headline starting 380px in against the body's 240.

The 700px measure is untouched at every width, and the image gives way below
`wide` rather than the text — 300 at `lg`, 240 at `md`.

Worth naming as a pattern: this is the second time in two passes that closing a
small misalignment cost something larger. A near-miss is worth fixing when the
fix is free; when it is not, the honest move is to make the offset unambiguous
rather than to shrink the thing next to it.

---

## 2026-09-10 (night, third pass) — The markets menu opened under the wrong item

Reported from a screenshot: the «بازارها» panel looked detached from its
trigger. It was, by a measurable amount.

`absolute end-0` pins a panel to its trigger's inline-END, which in RTL is the
LEFT edge — so the panel's left edge sat on the trigger's left edge and the
remaining width hung out in the inline-start direction, landing under «تحلیل»
and «آموزش». The trigger is 55px wide and the panel is 240, so the overhang was
the difference:

```
width   trigger [L..R]     panel [L..R]     start-edge gap
1024    [ 584.. 639]       [ 584.. 824]     −185px
1280    [ 840.. 895]       [ 840..1080]     −185px
1440    [1000..1055]       [1000..1240]     −185px
1600    [1080..1135]       [1080..1320]     −185px
1920    [1240..1295]       [1240..1480]     −185px
```

`start-0` puts it at 0px at all five.

**The logical property was right; the side was wrong** — which is why this
survived a review that specifically checked for `left`/`right`. `end-0` is
correctly logical and correctly mirrors; it just mirrors the wrong alignment. A
dropdown hangs from the edge it SHARES with its trigger and grows away from it
in the reading direction, which is `start-0` in both directions. `end-0` is the
overflow variant, for a trigger near the inline-start edge — and this nav sits
mid-header. At 1024, the tightest width the menu appears at, `start-0` leaves
399px of room.

Worth noting what the old comment claimed: "Measured at 1024, where the header
row is tightest, the panel stays inside the viewport." True, and it was
answering the wrong question — staying inside the viewport is not the same as
sitting under the control. Two earlier passes had added `mt-2` and a panel
shadow trying to stop it reading as a stray box; neither could, because the box
was in the wrong place.

No other component uses this pattern — `start-0`/`end-0` on an absolutely
positioned panel appears once in the codebase.

---

## 2026-09-10 (night, second pass) — The four answers, applied

Five decisions came back answered. All five are in, with the measurements that
either confirmed the reasoning or corrected it.

### 1 — Page padding: conformed to 20/100, and the cost was not where it was expected

`CLAUDE.md` has always said 20/100 with no exceptions. Two shells existed —
four `<main>` elements at `px-5 lg:px-10` (20/**40**) and `Section` at
`px-5 lg:px-[100px]` **with no max-width at all**. Both numbers now live in one
`.mag-gutter` class, applied by every shell, including the 1440px cap: without
it the padding would have agreed at 1440 and still disagreed at 1920, where
the search page ran 1720px wide against the archive's 1360.

**The predicted cost — "three-column cards narrow by roughly 40px" — does not
happen, and the reason is worth recording.** The three-column `ArticleGrid`
appears on `/search` and `/author`, and both of those were already on the
100px shell. Measured on the built page, old shell against new:

```
route     width   content 40→100     card
search    1280    1080 → 1080        344 → 344     unchanged
search    1440    1240 → 1240        397 → 397     unchanged
search    1920    1720 → 1240        557 → 397     the CAP, not the padding
search    2560    2360 → 1240        771 → 397     the CAP, not the padding
```

At 1280 and 1440 nothing moves. Above 1440 the cards stop growing, which is
the cap doing its job — a 771px card at 2560 was never the intended design.

The real cost landed on the routes that actually were 20/40:

```
route     width   content        lead / row card
home      1280    1200 → 1080    715 → 642    (−73)
home      1440    1360 → 1240    812 → 739    (−73)
archive   1280    1200 → 1080    824 → 704    (−120)
archive   1440    1360 → 1240    984 → 864    (−120)
```

120px off the archive's full-width rows and 73px off the index lead card. Both
still hold their images and their clamped titles. Taken, as instructed.

**Where it genuinely bit was the article page, and neither rule was bent.**
100px gutters take 120px out of every desktop row, and the article's column
counts had been chosen against 40. Measured immediately after conforming the
padding and before fixing it:

```
1024   two columns     body 476px   ~48 characters
1280   three columns   body 424px   ~42 characters
1440   three columns   body 584px   ~58 characters
```

against a 700px measure `CLAUDE.md` calls calibrated to IRANYekanX. **The
column count moved up a breakpoint instead of the text getting narrower** —
which is the argument the article page's own note already made at 1024
("about 30 Persian characters a line, less than half the 70–73 the type scale
is built for"), arriving at two more widths because the row shrank:

```
< 1280   one column, contents as a <details> above the article
1280+    article + end rail        1080 − 300 − 48 = 732 → caps at 700
1440+    all three                 208 + 32 + 700 + 32 + 268 = 1240
```

The body column now measures **exactly 700px at 1024, 1280, 1440, 1600 and
1920**. It had never held at more than three of those — 596/544/700/700/700
before the gutter change, 476/424/584/584/584 after it and before this. The
header row follows the body's tracks at `wide`, so the h1 and the first
paragraph share an inline-start edge and a width.

`wide` (1440px) is a new named breakpoint and it is a CONTENT CAP, not a
device: above it `.mag-gutter` stops growing, so 1240px is the content width
at every larger width too, and the three-column row is exact rather than
fluid. Tailwind's own 2xl is 1536 — past the point where the cap engages.

CLAUDE.md is unchanged. The rule was right; the code had drifted from it.

### 2 — The type scale: adopted everywhere, and one step added

For its first day the scale governed ONE heading. Every other heading carried a
hardcoded pixel value, because a Tailwind utility beats the `@layer base`
element rule. Five different `<h1>` sizes shipped.

**Every heading now takes a `text-*` utility off `--fs-*`.** Rendered across 17
routes at both breakpoints: 57 distinct headings, and the only three without a
utility are `.article-body`'s own `<h2>`s, which take the same tokens through
the element rule.

**Chosen by ROLE, not by tag depth.** A footer column heading is an `<h2>` for
the outline and an h5 on the page; a comment form's «دیدگاه شما» is an `<h2>`
and an h4. Mapping tag→step would have printed a 21px heading over a footer
link list.

The full scale, both breakpoints:

```
              mobile  desktop   colour       used for
  display       22      27      primary      index lead card only
  h1            20      24      primary      every page title, article and listing
  h2            18      21      primary      section headings, .article-body h2
  h3            17      19      primary      every card title
  h4          15.5      17      primary      panel headings (comment form, CTAs)
  h5            14      15      secondary    rail and footer list labels
  h6            13    13.5      muted        the smallest labels (ToC, aside)
  body          17      18      —            unchanged, as instructed
  dek           17      18      secondary
  meta        12.5      13      muted
  caption       13      14      muted
```

**Body text did not move and did not need to.** The instruction was that if
deriving the scale put an article `h2` level with or above the 24px `h1`, the
body scale comes down. It does not: `.article-body h2` is 21 against an h1 of
24, and that gap was already established when the h1 was first set to 20/24 —
the body scale came down then. Nothing here required it to come down again.

**One step was ADDED rather than forced: `--fs-display`, 22/27.** The index
lead card was 26/36 and the scale's ceiling was the h1's 24. Put on `--fs-h2`
it rendered at **21px on a card 1240px wide** — the page's largest editorial
promise, set smaller than the body text of the article it links to, and reading
as a caption. Display is derived, not chosen: one step further along the same
two ratios (24 × 1.125 = 27; 20 × 1.09 ≈ 22).

It does not reintroduce the defect the adoption was for. That defect was two
things on ONE page — the article h1 at 24 tying with «مطالب مرتبط» at 24.
Display never appears on an article page or under a visible `<h1>`; its
consumers are the index lead card and `FeaturedArticle`. Per page the order is
now strict:

```
index      27 → 21 → 19
article    24 → 21 → 19        («مطالب مرتبط» is 21 now, not 24)
listing    24 → 19
```

**A third consumer needs an argument, not a class name** — the moment display
appears under a visible h1 it is the old inversion again.

**The weight column left the recorded scale.** It said 700 for h1–h4 and 600
for h5–h6, and the code has never matched: card titles are `font-semibold` at
h3, and that 600-against-700 contrast is what separates a card title from a
section heading once the sizes are one step apart. Sizes are the scale; weights
stay a component decision. B34 still stands separately — the rule says
400/600/700 and `font-light` is used in twelve places.

`FeaturedArticle` turns out to have no callers — it is exported from the barrel
and used nowhere. It took its scale step along with everything else; whether it
should exist at all is a separate question and is not answered here.

### 3 — «FINANCE PULSE» removed, at every size

Pulse is not part of this brand. The wordmark is gone from the tab icon, the
apple-touch icon and both launcher icons — **including the launcher sizes where
it was perfectly legible**, because the objection is the name, not the
rendering. A name the site does not use should not appear on a home screen
either. Cropped at the transparent gutter the export already put between the
mark and the bar, so the mark itself is untouched.

A maskable launcher icon was added while regenerating the set: Android crops a
launcher icon to whatever shape the device uses and only the inner 80% is
guaranteed, so an `any` icon cropped that way loses the triangle's corners.
The maskable one carries the mark at 60% of a full-bleed plate.

### 4 — `display: standalone` stays out, and is now a recorded deferral

Backlog **B35**, with the reasoning in the content numbers rather than the
code: `standalone` promises *this is a thing you open daily*, and an
installable app opening onto a magazine whose newsletter subscribed nobody,
whose archive tags 14 of 54 articles, and none of whose articles has a
hand-written dek is a worse first impression than a web page opening onto the
same thing. Revisit when the newsletter works and the archive is tagged.

Everything else the manifest needs is committed. Adding the field later is one
line in a file that is otherwise finished.

### 5 — The font: applied

`src/app/fonts/IRANYekanX.woff2` is **81,576 bytes, down from 95,404** — the
unused `dots` axis dropped. Verified after the write: 648 glyphs, 462
codepoints, `wght` still 100–1000, 11 named instances, ZWNJ present.

Measured on the throttled mobile profile: the font now arrives at **1326 ms
instead of 1613**, cutting 287 ms off the window in which the fallback is on
screen.

**What that bought, and what it did not.** Desktop CLS is now **0.0000 on every
route measured** — it was 0.0201 on an article — and the index's mobile CLS
went 0.0230 → 0.0005. But the longest article's mobile CLS is **unchanged at
0.0974**: the shift simply moved earlier, from 1735 ms to 1465 ms. CLS scores
how much moves, not when. Getting that last number down means making the
fallback's metrics match the webfont's, which is the `size-adjust` problem this
project cannot solve honestly from a container with no Persian system fonts
installed.

```
MOBILE  Pixel 5 · 4x CPU · 1.6 Mbps · 150 ms
route                                  TTFB   FCP    LCP    CLS      longTasks
/mag                                      9    748    748  0.0005      576ms
/mag/archive                            327   1028   1028  0.0041      554ms
/mag/notcoin-guide                        9    768    768  0.0165      553ms
/mag/stress-long-technical-analysis      12    808    808  0.0974      634ms
/mag/stress-rich-article                  9    900    900  0.0082      804ms

DESKTOP 1440 — CLS 0.0000 on all five, LCP 288–592 ms
```

The 400–700 variant stays rejected: `font-light` (300) is used in twelve
places and that axis would silently render every one of them at 400.

### Verification

Every sweep re-run against the final build, because the padding and type
changes touch every route:

```
structure   17 routes x 8 widths (320→1440)   0 findings
contrast    3,261 rendered samples, 3 themes  0 failures
a11y        17 routes x 2 widths              0 beyond the known exemptions
keyboard    34 walks, 1,226 tab stops         0 invisible rings, skip link first on all 34
invariants  9 routes x 7 widths               all hold
```

Both sweeps have caught regressions in this project that looked cosmetic, which
is why they run on a change like this one rather than only on a change that
looks structural.

---

## 2026-09-10 (later) — The favicon pack, wired up

A generated favicon pack arrived: the Finance mark in its LIGHT colourway —
`#071331` triangle, the same three logo blues (`#0163E1` · `#10A5F5` ·
`#00DBFF`) — on transparency, with a «FINANCE PULSE» wordmark bar, plus
Android 192/512, an apple-touch icon, three `.ico`s and a `site.webmanifest`.

**The mark is now the pack's colourway, as vector.** `icon.svg` keeps the paths
it already had — they are the same artwork — and takes the pack's colours:
white plate, `#071331` triangle. 2.2 KB, sharp at every size a browser asks
for, instead of a 33 KB raster exported at three.

**It needed a plate, and that is measured, not taste.** The pack's PNGs put a
`#071331` triangle on transparency, which is about 1.1:1 against Chrome's dark
tab strip (`#202124`). Rendered at 16 and 32 the triangle and its baseline
vanish and three blue bars float with no shape around them. An icon has no
control over what is behind it, so the ground is part of the icon. White,
because that is the ground this colourway was drawn for.

**The wordmark is dropped below the launcher sizes.** It is illegible under
about 48px — grey speckle at 32, gone at 16 — while costing a tenth of the
icon's height. Independently: the magazine is «مجله فایننس» / TheFinance and
"Pulse" appears nowhere in this product, so a tab is the wrong place to
introduce a name the site does not use. Flagged rather than resolved — if the
lockup is right, it is right on the site too, not only in a launcher.

**`apple-icon.png` is opaque now.** iOS composites a transparent apple-touch
icon onto BLACK, which would have put the navy triangle on black — the same
disappearance, on a home screen.

**The pack's `site.webmanifest` was not committed; `manifest.ts` replaces it.**
Its `name` and `short_name` were empty strings (Android would have labelled the
home screen with whatever page the reader happened to add), its icon `src`
values were absolute `/favicon/…` paths that 404 under basePath `/mag`, and its
theme and background colours were `#ffffff` on a magazine whose default theme
is dark. The real values come from the same constants the rest of the site
uses.

**`display: standalone` is deliberately NOT carried over.** It is what makes
Chrome treat the magazine as an installable app and offer an install prompt — a
new product surface with its own launch behaviour, which nobody asked for.
Omitting it defaults to `browser`: the icons are correct if a reader adds the
site to their home screen, and nothing prompts them to. Turning the magazine
into an installable app is a product decision; this was a favicon.

Also noted: the pack's `favicon-48x48.ico` is a 32×32 image under a 48 name.
The committed `favicon.ico` is a real 16/32/48 multi-size at 4.6 KB.

---

## 2026-09-10 (late) — Full UI/UX review with a performance pass

A sweep rather than a request: every route at eight widths, every text token
in three themes, a keyboard walk of all seventeen routes, and Core Web Vitals
under a throttled mobile profile. Six defects found, five fixed, and the
measurements that found them are now guards so they cannot come back quietly.

### What was measured

| pass | scope | result |
|---|---|---|
| structure | 17 routes × 8 widths (320→1440) | 0 horizontal overflows, 0 missing `alt`, 0 unfixed image boxes, 0 italic |
| contrast | 3,246 rendered text samples, 3 themes × 2 widths | 1 failure → 0 |
| targets | every visible control, 2 widths | 3 real failures → 0 |
| keyboard | 17 routes × 2 widths, 1,226 tab stops | 14 invisible focus rings → 0; skip link first on all 34 walks |
| headings | 17 routes | 1 level skip → 0; one `<h1>` everywhere |
| CWV | 5 routes, Pixel 5 · 4× CPU · 1.6 Mbps · 150 ms | LCP 720–944 ms, CLS ≤0.0974, 0 third-party requests |

### The five fixes

**Keyboard focus on an article card was invisible — the card was clipping its
own ring.** The worst finding of the pass, and it hid behind two true facts:
the computed style said `outline: 2px solid var(--focus-ring)` and
`:focus-visible` matched. The link is `flex h-full flex-col` and fills its
`<article>` exactly — 395×377 inside a 397×379 card — so `outline-offset: 3px`
draws the ring outside the card's padding box, and the card carries
`overflow-hidden` because that is what clips the featured image to the card
radius. The ring was painted and immediately clipped. Fourteen stops across
`/search`, `/author` and `/author/no-bio-author` produced ZERO differing pixels
in a crop inflated 8px past the card on every side.

The ring moves out to the card via `:has(> a:focus-visible)`; the grid around
it is `overflow: visible`, and the card's box and the link's box are the same
rectangle, so nothing changes about what a reader perceives as focused. Not
solved with an inset `outline-offset: -3px`, which would put 2px of accent on
top of an arbitrary photograph where no contrast can be guaranteed.

**The soft chip failed 4.5:1 in the light theme, on every listing card.**
`--accent` on `--accent-soft` over a card measured 4.25. The chip's own comment
argued the fill was decorative because "the accent TEXT carries the contrast
(6.84 on surface)" — true of `--surface`, and the chip does not sit on
`--surface`, it sits on the fill. `--accent` moves #0163E1 → #015BD0 in
v2-light, which raises every pair in the theme at once:

| pair | #0163E1 | #015BD0 |
|---|---|---|
| accent on soft-over-card | 4.27 | **4.83** |
| accent on soft-over-surface | 4.69 | 5.29 |
| accent on white | 5.42 | 6.16 |
| white on accent | 5.42 | 6.16 |
| focus ring vs white / raised | 5.42 / 4.92 | 6.16 / 5.59 |

The fill was the other candidate and it cannot be fixed: dropping the alpha to
0.04 still only reaches 4.65, and a 4% tint over an off-white card is not a
pill any more. The mark itself is untouched — MagLogo.tsx keeps #0163E1 ·
#10A5F5 · #00DBFF literal. This is the UI token that happened to equal one of
them, following the path `--accent-2` (#00DBFF → #0090C4) and `--warn`
(#FFB44D → #8A5200) already took in this theme for the same reason.

**`check-contrast.mjs` had passed that failure, and now cannot.** It paired
text tokens with opaque surfaces and never asked what a TINTED fill in between
does. Tinted pairs are composited over each surface first and the text measured
against the result — 21 pairs became 36. `--accent`'s row deliberately omits
`--surface-hover`: the soft chip has one consumer, PostCard, whose hover is a
border shift, verified by forcing `:hover` through CDP and re-sampling the
rendered pixel — same backdrop in all three themes. ArticleCard is the card
that hovers to `--surface-hover` and it carries no chip. Over that surface the
pair would read 4.20 in v1 and 4.47 in v2-light, so the omission is recorded
with the numbers: v1 would need a LIGHTER accent and v2-light a darker one, the
two themes pulling opposite ways, which makes it a placement rule rather than a
token that can absorb both.

**The 404's search input rendered 22px tall on a phone.** The form is
`flex flex-col gap-2.5 sm:flex-row`, so below `sm` the main axis is vertical
and `flex-1`'s `flex-basis: 0%` overrides `h-[46px]` on that axis. Measured 350
× 22 at 390px — a squashed search box on the one page whose whole job is to
offer a way out, under SC 2.5.8's 24px floor and this project's own 44px floor.
`sm:flex-1`: growing to fill the row is only meaningful once the row exists.

**The header's section links were 22.5px tall.** 28.5×22.5, 41.5×22.5 and
37.1×22.5 at 1440 — bare inline text in a row that is already 44px. The box
grows into space that was there and dead: the links do not move and nothing
reflows.

**Search results skipped h1 → h3.** ArchiveShell already carries the
visually-hidden `<h2>` that CLAUDE.md prescribes for exactly this case; search
had been missed. Before it, a screen-reader user moving by heading went from
the page title straight into individual article titles.

### The article header was 68px out of line with its own body

Two independent grids: the header `[320px 700px]` gap 56 inside a 1076px box,
the body `[260px 704px 300px]` gap 48. So the headline began 68px inside the
article's own text at 1280, 1440 and 1600 alike — h1 inline-start 416, body
inline-start 348. Matching the body's `260 + 48` puts both at 348 and both at
the 700px measure.

Below xl they still do not align — 272px apart at 768–1023, 340px at 1024–1279
— and that is left alone deliberately. There the body has no inline-start rail
to sit beside, so the offset is the full width of the hero image: large enough
to read as a two-column header rather than as a near miss. Closing it would
mean giving up the side-by-side header that was asked for.

**This cost CLS, and the trade is recorded rather than hidden.** Desktop CLS on
an article went 0.0045 → 0.0201 (target ≤0.1). The 260px image is shorter than
the 320px one was, so the TEXT column is now the taller of the two header
children and its font-swap rewrap drives the row height instead of being
absorbed. `items-start` was tried and changes nothing — the row height is the
mechanism, not the alignment. 68px of permanent visible misalignment against
0.0156 of CLS five times inside the target is not a close call.

### Performance

Under Pixel 5 · 4× CPU · 1.6 Mbps · 150 ms RTT:

| route | TTFB | FCP | LCP | CLS | long tasks |
|---|---|---|---|---|---|
| `/mag` | 11 | 740 | 740 | 0.0230 | 466 ms |
| `/mag/archive` | 323 | 944 | 944 | 0.0003 | 392 ms |
| `/mag/notcoin-guide` | 7 | 720 | 720 | 0.0165 | 437 ms |
| `/mag/stress-long-technical-analysis` | 10 | 792 | 792 | **0.0974** | 604 ms |
| `/mag/stress-rich-article` | 10 | 848 | 848 | 0.0082 | 555 ms |

LCP is the featured image on every route and lands at roughly a third of the
2.5s target. Zero third-party requests on every route. Desktop LCP 272–588 ms.

**Every CLS number on this site is the font swap.** The longest article sits at
0.0974 against a 0.1 target — it passes with 2.6% of margin, which is not a
margin. The shift lands at 1735 ms and its sources are `#text` nodes. The font
is preloaded and starts at 180 ms, but it is 93 KB and takes 1433 ms to arrive
on 1.6 Mbps, so the fallback is on screen for roughly 940 ms after FCP. It is
also the single largest asset on the page — larger than all JavaScript (121 KB
transfer), larger than the CSS (11 KB) and the images combined.

**`adjustFontFallback` is off, and the comment above it claimed the opposite.**
The note said fallback metrics "are adjusted automatically by next/font to
reduce the layout shift", directly above `adjustFontFallback: false`. The code
is right and the comment was wrong: the option takes 'Arial' or
'Times New Roman' and emits a `local("Arial")` face with overrides derived
against Arial's metrics. Arial carries no usable Persian, so wherever it
resolves the browser falls through per glyph to Noto Naskh, Geeza Pro or
Tahoma, and overrides computed for Arial never apply to a single Persian glyph.
An adjusted fallback that cannot attach to the script the page is written in is
not a CLS fix. The comment now says so.

**14.5% of the font is an axis nothing uses, and slimming it is verified but
not applied.** IRANYekanX ships two variable axes: `wght` 100–1000 and `dots`
0–4. Nothing in this codebase sets `dots`. Dropping it with
`fonttools varLib.instancer` gives 81,576 bytes against 95,404 — same 648
glyphs, same 462 codepoints, same `wght` range, same 11 named instances — and
it is metric-identical: rendered advance width of a mixed Persian/Latin/digit
sample at 100px is the same to four decimal places at every weight stop from
100 to 1000.

```
pyftsubset is not what this needs — the subset is already tight. The axis drop:
  fonttools varLib.instancer -o IRANYekanX.woff2 --no-optimize \
      src/app/fonts/IRANYekanX.woff2 dots=drop
```

Limiting `wght` to 400–700 as well would reach 47,280 bytes — a 50% cut — and
it is REJECTED, though not for the reason the first check flagged. That check
reported 214 advance-width differences at weight 600, all ±1 unit at 1000 upem,
which render as 0.313px over a 1853px paragraph with identical line breaking:
not a real objection. The real one is coverage. `font-light` (300) is used in
twelve places — the hero dek, card excerpts, the footer description, the news
and 404 pages — so a 400–700 axis would silently render every one of them at
400. Worth recording separately that CLAUDE.md's typography rule 3 says "real
font weights only (400/600/700)" and the codebase uses 300 throughout; 300 from
a variable axis is a real weight, not synthetic, but the rule and the code
disagree about the set.

The 13,828-byte saving is left unapplied because replacing the font binary was
not something this pass could do; the command above reproduces it exactly.

### Two findings that need a decision, not a fix

**Page horizontal padding is 20/40 on six route families and 20/100 on four.**
CLAUDE.md says 20px mobile / 100px desktop, "no exceptions". Measured from the
outermost text leaf, excluding scrollers and `sr-only`:

```
                  390    768    1024   1440
home              20     20     40     40
archive           20     20     40     40      ← ArchiveShell: px-5 lg:px-10
category/market   20     20     40     40
article           20     20     40     40
news              20     20     40     40
authors           20     20     100    100     ← Section: px-5 lg:px-[100px]
search            20     20     100    100
author            20     20     100    100
404               20     20     100    100
```

Mobile is compliant everywhere. On desktop the content block jumps 60px moving
from `/mag/archive` to `/mag/search`, which is the most visible inconsistency
on the site. This is backlog B29, now with the full table: it was recorded as
"20/40 vs stated 20/100" and the second convention was not in it. Conforming to
the rule is the larger change — it narrows the 3-column grid's cards by ~40px
each — so it is a design call rather than a bug fix. Not taken unilaterally at
the end of a review.

**The type scale governs one heading out of twenty-three.** Round K set a full
scale in `tokens.css` with the explicit instruction to put it there "not as a
one-off on the article page". It is consumed by `text-h1` in exactly one place,
the article `<h1>`; twenty-two headings carry hardcoded pixel sizes. Five
different `<h1>` sizes ship: 20/24 (article, from the scale), 24/28
(AuthorBox), 26/32 (news), 26/34 (CategoryCover), 28/34 (PageHeader, authors,
404).

The visible consequence: at 1440 the article's own title is 24px and the
«مطالب مرتبط» label at the foot of the same page is also 24px, while a listing
page's `<h1>` is 34px. The article headline is the smallest h1 on the site and
ties with a related-articles label. The 20/24 article title was the reviewer's
explicit decision in Round K and is recorded as such — this is the consequence
of it meeting a site that never adopted the rest of the scale, and rescaling
twenty-two components is a redesign, not a review fix.

### Also recorded

- **The article header comment described the opposite of what ships.** It said
  "text right, image left, matching the reference"; the figure has taken grid
  column 1 since the image was moved to the inline-start side, and the note did
  not follow. Corrected, including why `order-2` on the text column is not the
  same as putting it second in the DOM.
- **`/mag/archive` is the one route rendered per request** — TTFB 323 ms here
  against 7–11 ms everywhere else. The 323 is the mock's own simulated latency
  (`NEXT_PUBLIC_MOCK_LATENCY_MS`, default 300), so the number is not a
  prediction; what it proves is that the site's main browsing surface pays a
  live backend round trip on every request while everything else is
  prerendered. Its own comment says why: `type` is read from the query string.
- **The body measure is 544px at 1280–1439**, not the calibrated 700 — the
  three-column grid leaves `1200 − 260 − 300 − 96`. Pre-existing; visible now
  that the h1 above it is 700 and aligned.
- **B30 sharpened.** Running `next build` while a `next start` holds `.next`
  produced HTML referencing a CSS chunk that was never emitted — the page
  served completely unstyled while `/mag/health` reported a BUILD_ID match.
  Kill the server before building, not just before measuring.
- **Measurement mistakes worth not repeating.** A rendered-pixel contrast probe
  that hides text with `color: transparent` races `transition-colors`: the
  screenshot catches the glyph fully painted and reports text sitting on brown
  and teal backgrounds that exist nowhere in the palette. 147 phantom failures
  became 1 real one once transitions were disabled first. Separately, a
  synthetic `page.hover()` does not reliably reach a card covered by a link
  overlay — `CSS.forcePseudoState` does.

---

## 2026-09-10 (night) — Title width, a missing affordance, and the logo's blue

Four things from one mobile screenshot.

**The title was not using its width, and `text-wrap: balance` was why.**
Balancing evens lines by making them all shorter; at 1440 that is the
point, and at 350px there is no clause to rescue so it just indents the
headline. Measured on four titles at 390 and 320 — widest line as a share
of the column — with the LINE COUNT IDENTICAL in every case: 69% → 98%,
79% → 87%, 79% → 87%, 77% → 77%. `pretty` below md, `balance` above.

Same shape as the justify finding earlier the same day: a typographic
property that is right at the 700px measure and wrong at 350. Two of those
in one day is a pattern worth naming — anything tuned at 1440 needs
re-measuring at 350 before it is called a rule.

**The mobile table of contents had no affordance.** `list-none` on the
<summary> removes the browser's own triangle — necessary for the styling,
and it left nothing in its place. The FAQ block had a chevron from the
start and the ToC did not, which nobody caught because everyone looking at
it already knew it opened. Both use the same two-border chevron now.

**The accent is the logo's blue.** #10A5F5, lifted from the mark rather
than approximated near it, and better than the #4D9AFE it replaces on
every measure — 7.17/6.29/5.67 against 6.84/6.00/5.41, and 6.99 under its
own contrast colour against 6.67. The light theme takes the mark's other
end, #0163E1, because #10A5F5 measures 2.72 on white.

That is the biggest available "use the logo's colours" move, because the
accent is the one colour on every page. The cyan gets exactly one job —
the reading-progress bar fades accent → cyan, so the mark's gradient
appears once per article on the one element that is pure decoration.

**And the surface step refused yesterday became affordable today.**
#14275a was rejected at 2.90 on --border-interactive; that token was
lightened to #6b7fa3 in the same commit, and against #14275a it now
measures 3.54. The constraint moved, not the judgement. Card separation
1.26 → 1.36, at the cost of muted-on-hover going 4.87 → 4.66 — over the
floor, and the lowest pair in the system now.

---

## 2026-09-10 (late) — The footer gap, corrected in the other direction

Reported from a screenshot: content running straight into the footer. It
was, and it was my doing.

**The measurement was wrong, not the intent.** Yesterday's entry claims
the gap went from 160px to 97. The 97 was measured to the footer's FIRST
CHILD — which is inside the footer's own top padding. The actual distance
from the last content to the footer's top edge was **zero on every
route**. I collapsed the two paddings by removing the one that was doing
the visible work and keeping the one that was internal.

They are separate things and are separate now:

  main padding-block-end   56 / 80   the gap, on the page's surface
  footer py                40 / 64   the footer's own breathing room

80 rather than the section rhythm's 96, because this footer has its own
surface and a top border — a colour change does the separating work
whitespace has to do between two sections sharing a surface. Total empty
run 144 / 96, against the 160 / 128 that was called too long and the
96 / 60 that had no gap at all.

**A second bug fell out of fixing it.** The padding went back onto the
container class the four main page files share — and there are NINE
`<main>` elements. Search, authors, the author archive, paged listings and
404 render a bare `<main>` and still had zero. It is on `main` as an
element now: a rule about "main content, before the footer" belongs to the
element that means that. Verified across all ten route shapes at both
widths.

**The check I added to stop this recurring was itself vacuous first.** It
asserted the gap only in the 1440 pass, so a deliberately broken mobile
value passed clean — the desktop media query was still supplying 80. It
runs in both loops now, and a 4px value fails 9 routes at 768 as it
should. It measures to the footer's TOP EDGE and from the lowest painted
element in `<main>`, because measuring inside the footer is what produced
the 97 and measuring `lastElementChild` misses a sticky rail.

Third time this gap has been touched, second time a measurement of it was
confidently wrong. The check is the part that matters.

---

## 2026-09-10 (evening) — Three device reports: the header, the footer, the navy

All three came from screenshots taken on an actual phone, and the first
one reverses a decision from the day before.

**The header stays put now.** Reported as "mobile nav not sticky in
scroll". The mechanism was working — verified under iPhone emulation, no
blocking ancestor, leaving at -65 going down and returning to 0 going up,
exactly as specified. Hide-on-scroll-down was asked for and built to spec.

The report is still right about the thing that matters: a reader scrolling
an article sees no navigation, and "it comes back if you scroll the other
way" is a rule they have to learn rather than a header they can reach. A
device beats a spec, including a spec that was followed correctly.

The 64px objection gets paid rather than argued with — past the fold the
bar condenses to 52 and the lockup shrinks 28 → 24, which is the brand
floor for the full lockup. And the state machine got simpler in the
process: hide-on-scroll needed a previous position, a direction and an 8px
dead zone to stop iOS momentum toggling it; "am I past 64px" needs none of
that and cannot flicker.

One thing that broke on the way and was caught by measuring: the nav panel
hangs off the header's bottom edge and hardcoded `top-16`, which was
correct until the bar learned to be 52 and then left a 12px slot of page
showing between them. The height is a custom property now — neither
element owns that number alone, so neither hardcodes it.

**The footer is 23% shorter on a phone.** 1046 → 803 at 390, 1127 → 859 at
320. The height was never spacing: fifteen links at a 44px touch target is
660px in one column no matter what. So the groups go two-up, the third
group — which used to land alone with 500px of blank beside four links —
spans both columns and lays its own links out two-up, and
`ORGANIZATION_DESCRIPTION` is hidden below md.

That last one is the only responsive content hiding in the product and it
is worth naming: it is the second long boilerplate paragraph in one
footer, and the other is compliance copy under Iranian securities law. If
one of the two goes on a phone, it is not that one.

**The navy got its blue back.** "Very dark bg is good but add some colour
like the logo colour for better contrast" — two instructions pulling
opposite ways, so `--surface` did not move and everything sitting ON it
did. A card was separating from the page by 1.06:1, which is a difference
you can measure and cannot see; it is 1.14 now, and the hairlines are the
logo's blue rather than white-over-navy grey.

It stops one step short of where it looks like it should. #14275a would
have given the best separation and takes `--border-interactive` to 2.90 —
under the 3:1 WCAG requires of a control boundary, on the token that
exists precisely because the other two borders could not clear it. So the
surfaces stop before it and that token is lightened to keep headroom
instead of sitting on the floor.

`check:contrast` still passes all 21 pairs. The lowest in the system moved
from 4.95 to 4.87, which is the cost of the change and is stated rather
than discovered later.

---

## 2026-09-10 — Contrast measured, the footer gap collapsed, a skip link added

A screenshot-based visual audit of the homepage raised five items. Two
misdiagnosed settled decisions, three were real, and one of the two
misdiagnoses turned out to be describing a real bug with the wrong remedy.

**Contrast was a lead, not a finding.** The audit reported faint secondary
text and said plainly it had computed no ratios. Measured: every pair
passes, lowest 4.86:1 on the page and 4.95 in the token set. Nothing was
changed. `npm run check:contrast` makes it repeatable — it parses
tokens.css rather than restating the palette, and its output reproduces
the measured comments already written beside `--on-media-secondary` and
`--on-media-muted`, which is the cross-check that the parse is right.

Worth recording that metadata reading quieter than body text is the
hierarchy working. A pair at 5.1 that looks faint is a size question; a
pair at 3.2 is a token question. Raising `--text-muted` toward parity
would have traded a legibility complaint for a hierarchy problem.

**Two of my own measurements were wrong first, in opposite directions.**
A DOM walk for each element's background reported four failures at
~1.07:1 in v2-light — it walks ancestors, and the lead card's scrim is a
sibling overlay, so it measured white text against the card surface and
never saw the near-black gradient behind it. And the theme toggle's
accessible name read as both labels concatenated, because `textContent`
includes `display:none` subtrees and the accessible name computation does
not. Re-measured from rendered pixels and from CDP's AX tree, both were
clean. A false FAIL costs as much as a false PASS.

**The footer gap was two paddings, and is now one.** 160px at desktop and
128 at mobile against a section rhythm of 96 / 60. The four `<main>`
elements lost their bottom padding and the footer's top padding is the
whole gap at the rhythm value: 97 / 61 measured.

**Keyboard and focus had never been checked, and mostly passed.** Thirty
tab stops, three themes. A visible focus ring on every one. The markets
disclosure opens on Enter, closes on Escape with focus returned to the
trigger, and lets Tab out the end rather than trapping. 38 links, 0 with
a generic accessible name — every card link is its article title. The
search input is named by an sr-only `<label for>`, so the placeholder is
not doing that work and the audit's proposed visible label is not the
remedy for anything.

The one gap: no skip link. Reaching content from the keyboard meant
tabbing past eight header controls on every page and on every client-side
navigation. Added, targeting the `<main>` landmark, with `tabIndex={-1}`
on every `<main>` — without that the link scrolls the page and leaves
focus behind, which looks like it works.

**The lead card was the audit's best observation and its worst
prescription.** "Only a gradient — give it a real image or shrink it."
The gradient is the no-image state, so shrinking it is the wrong end. But
measured with every image 404ing it was an 812×472 block of scrim over an
empty placeholder, and `575f922` says a missing image leaves no trace.

The card now drops the image layer, the scrim and `data-on-media`
together. Dropping the scrim alone would have been the real disaster: the
on-media tokens are white and deliberately do not flip with the theme, so
the light theme would have gone to white-on-#f2f4f7 at about 1.1:1 — the
exact failure my broken DOM walk had hallucinated an hour earlier, this
time for real.

**And a dependency nobody declared.** `check-invariants.mjs` has always
imported `playwright-core`; nothing listed it. It was in node_modules by
accident, an unrelated install pruned it, and the invariant sweep went
with it. Now a devDependency.

**One measurement hazard worth knowing.** An incremental `next build`
served a stale prerender of the home page — the chunk carried the new
attribute and `index.html` did not, while `/mag/health`'s buildId matched
`.next/BUILD_ID` because both derive from the git commit and the work was
uncommitted. The build-match guard cannot see a rebuild within one commit.
`rm -rf .next` was needed.

---

## 2026-09-09 (evening) — Title scale, a one-block header, and the mobile nav

Four changes to the article page and the mobile header, plus a responsive
pass that produced most of the small fixes.

**The type scale is derived from two numbers.** h1 at 20 mobile / 24
desktop is the reviewer's decision and is recorded as that, not as a
measurement of the reference. Everything else follows: desktop steps down
from 24 at ~1.125, mobile from 20 at ~1.09. The full table is in
`decisions.md` → Type scale.

The body scale HAD to come down with it. `.article-body h2` was 22/24
against an h1 of 30/44, so at 24 the desktop pair was exactly level and a
section heading read as equal to the article's own name. h2 is now 18/21.
Body text does not move — 17/18 — which means h3 sits 1px above body at
desktop and level with it at mobile, and carries the difference in weight
and colour instead. That is the cost of a 20px title and it is stated
rather than smoothed over.

**And the scale shipped dead for one build.** Written as plain element
rules in `tokens.css`, which is imported above `@tailwind base`, they lost
to preflight's `h1..h6 { font-size: inherit }`. `.article-body h2`
measured 18px at 1440 — exactly `--fs-body` — while `--fs-h2` on `:root`
read 21px and the h1 was correctly 24 because it carries a utility class.
Right in the custom properties, wrong on every unclassed heading. They
live in `@layer base` now.

**The article header is one block.** Text column and image side by side,
so the header occupies one screen and the body begins under it — where
before the reader met a headline, then meta, then a full-width picture,
and only then a sentence. Bounding the hero to the title's measure last
round fixed the height and left that order alone.

  1440 / 1280   text 700 · image 320
  1024          text 604 · image 300
  768           text 456 · image 240
  390 / 320     stacked, image first

700 is the calibrated measure, so below xl the image gives way rather
than the column dropping under it. Direction is logical throughout: the
text column is first in the DOM and takes column 1, which RTL resolves to
the right. Mobile stacks image-first through `order`, so DOM order stays
text-first and a screen reader does not meet a figure before the h1.

**Two bugs found by measuring rather than looking.** The `<figure>` was a
direct grid child at `order: 0`, so it sorted before the text column and
took the 700px track while the text took 320 — which looks deliberate in
a screenshot, because the picture simply appears to be the wide one. And
a 404 hero left its column standing: `575f922`'s rule is that a missing
image leaves no trace, and removing the figure satisfied it when the hero
was a full-width block but not when it is a column. The guard marks the
grid now and it collapses.

**The mobile strip became a hamburger, one day after shipping.** The
strip's own argument is why: every cost it listed — a tap, a bundle, a
focus trap, a motion case — is a cost of HIDING things, and a scrollable
row hid nothing. It now carries three groups and is cut off mid-item at
390px, so it hides things badly instead of not at all. A menu that is cut
off communicates less than one that is honestly closed. The four costs
are paid: `aria-expanded`, Escape returning focus, a Tab trap verified
over sixteen presses, scroll lock restored to its previous value, and
180ms of opacity and slide that `prefers-reduced-motion` removes
entirely rather than shortening.

**The header is sticky on mobile and hides on scroll down**, which
reverses half of its own NOT STICKY note — the half about vertical cost.
The other half stands and is why desktop is untouched: every sticky
sidebar offset is `top-[76px]` measured against a static header.

**The progress bar moved onto the header's bottom edge, and the
measurement did not move with it.** ArticleAside still owns the number and
publishes it as `--reading-progress` on `<html>`; the bar reads the custom
property in CSS and measures nothing. A separate flag says whether there
is an article at all, because 0% is a real state and testing the number
would hide the bar exactly where it should read empty.

**The breadcrumb is one line on mobile and scrolls** — 485px of trail
inside a 350px region at 390, zero page overflow, no level dropped and no
ellipsis. The sweep asserts the structure, because the overflow check
exempts anything under an `overflow-x` ancestor and could never have
caught it.

**The responsive pass** at 320 / 360 / 390 / 414 / 768 — and 768 is in the
sweep permanently now, as the boundary where the header becomes two
columns and the image column is at its narrowest. It found the ToC
disclosure at 21px and its links at 39, a search input at 21 inside a
42px form, chips at 20, and a byline that measured 125px at 320 because
`flex-wrap` and a 305px intrinsic column put the AVATAR on its own line.
All fixed; the byline is 73px at 320 and 49 at 414.

**What was not fixed, and why.** Four inline controls are now 24px, which
clears WCAG 2.2 SC 2.5.8 but not Mag's own 44px floor. Taking the
breadcrumb to 44 would make the trail taller than the two wrapped lines
this round removed — the fix costing more than the defect. WCAG exempts
links inline in text and a breadcrumb is arguably that; "arguably" is not
a decision, so it is B28. Page padding is `px-5 lg:px-10` where CLAUDE.md
states 20/100 — pre-existing, site-wide, and B29.

---

## 2026-09-09 — The richer article template, and what it turned out not to need

The Claude Design export for a long-form article adds a kicker, a dek, a
review date, a warn callout, a comparison table, a pull quote, an FAQ, a tag
row and an author bio. Governing rule for all of it, and the reason most of
this entry is about restraint: **a field that is empty renders no element — no
placeholder, no heading with nothing under it, no reserved space that
collapses to a gap.** All 54 migrated articles have none of these fields, so
the template has to be correct when everything is missing before it is
interesting when everything is present.

**The dek is the excerpt, and there is no new field.** `excerpt(format: RAW)`
returns only what an author typed. The old objection to excerpts was about
`RENDERED`, WordPress's mid-sentence auto-summary, which `RAW` cannot return —
and `card.ts` has preferred this field over derived text since the listing was
built. A separate `dek` custom field would put two summary boxes on the editor
screen with no rule for which is which. It renders for 0 of 54 today, which is
the behaviour and not a gap. `roadmap.md` wave 0 holds the editorial decision
it waits on.

**A two-part kicker, from the two axes that exist.** The design draws three
segments; the third matches no taxonomy, and `roadmap.md` files it under
"still needs a decision" in as many words. Market then content type — the pair
`cardCategory` collapses into one label because a card has room for one. One
chip is the common case: roughly 60% of the archive has no market.

**`reviewed_at` was not added, because `modifiedAt` already is it.** What the
field would add over the date already rendered is the CLAIM that a person
checked the article. `reviewedBy` and `factCheckedBy` are excluded from this
model because no review process exists, and a review DATE asserts the same
thing with less to check it against. The design's green tick goes with it: a
check mark beside an automatic `post_modified` is a verification badge over
something nobody verified.

**One callout, two variants.** The block's own note ruled out an
info/warning/success/error set — four options means an editor chooses correctly
once and wrongly three times. That argument is about four. Two is a question
with a right answer, `note` stays the default, and warn moves the stripe, the
tint and the title colour and nothing else. It also carries a caution mark, as
a mask-image on `::before`, because a tinted panel alone is nothing to a reader
who cannot separate amber from blue.

**A defect found on the way past.** `<cite>` is italic in every browser's
default stylesheet. The blockquote rule sets `font-style: normal`, but that
reaches a `<cite>` only by inheritance and the UA's own rule is on the element,
which wins. Persian has no true italic, so every quoted attribution already in
the archive has been rendering a synthesised slant with the ZWNJ joins dragged
along. Nobody reported it; it was found by reading the default stylesheet while
styling the pull quote.

**The comparison table exposed a bigger one.** `.article-body table` carried
`display: block; overflow-x: auto` — which satisfies "nothing wider than the
body" and quietly costs every table its layout, because a `display: block`
table sizes the block and lets the real table shrink-to-fit inside it. Tables
had stopped filling their column at every width. Now `wrapBodyTables` puts a
focusable scroll container around each one and the table is a table again: 698px
in a 700px column at 1440, 620px scrolling inside a 320px box at 360, page
overflow zero at both.

**And the check that could not have caught it now can.** The overflow sweep
exempts anything under an `overflow-x` ancestor — correct, and it means an
unwrapped table has to break the page before the sweep sees it, which at 1440
it never would. The invariant now asserts the STRUCTURE: every
`.article-body table` has a `[data-table-scroll]` ancestor. Third check in this
project rewritten because it was passing for a reason unrelated to what it was
meant to prove.

**Tags were not built.** WordPress's tag taxonomy is in every WPGraphQL schema,
so the component would compile and render — possibly nothing, on all 54
articles, forever. Nobody has counted, this archive has already produced
`market` at 14 of 54 and `dek` at 0 of 54, and a tag chip needs a destination
that is a real routing decision on a magazine this size. B27 carries the query
and the three candidate answers.

**Comment counts were not built.** The design's meta row carries «۷ دیدگاه».
Comment counts are on the never-build list beside view counts and reaction
counts, and that list survived Blog v4 intact.

**`--warn` and `--warn-soft` added; `--good` refused.** Amber measures 11.03
and 11.21 on the dark themes; the light theme takes `#8a5200` (6.39 / 5.80),
because the design's `#FFB44D` measures **1.72 against white**. `--good` has no
consumer once the review badge is dropped — the table's status dots are row
data an editor writes, not something the template colours — and a token nobody
uses is a value nobody re-measures when a theme moves.

**Not taken from the export:** Vazirmatn, and the Google Fonts link that loads
it. The face is IRANYekanX, it belongs to the design system rather than to Mag,
and Blog v4 already shipped and reverted this exact swap.

**The author bio needed no change.** It already renders the role only when
there is a role and the bio only when there is a bio, and the article count the
design shows already lives on `/author/<slug>`, where the count is fetched.
Adding it to the in-article box would mean a count query on the highest-traffic
route for a decorative fact. Today, on all 54 articles, the box is a name and a
role — which is correct.

**What is still WordPress-side.** All four blocks exist here as a contract —
typed in `mag-blocks.types.ts`, styled by `[data-block]` attribute — and none
is registered in Gutenberg, so no editor can insert one yet. `roadmap.md` wave
2 puts that ahead of the custom fields deliberately: an author can use a block
the day it ships, where a field waits on somebody committing to fill it.

---

## 2026-09-09 (servers) — A day of infrastructure work, none of it in the repo

Recorded after the fact from a session log. Nothing here is a frontend change;
the rules it produced are in `decisions.md` and the five open items are B22–B26.

**Two WordPress installs were reachable and one of them was swallowing
content.** A `location ^~ /mag/wp-admin/` block was pointed at the old Jannah
install while fixing admin assets, so every editor opening
`thefinance.ir/mag/wp-admin/` wrote into an installation no longer connected to
the site. One article (`best-crypto-wallets`) was published that way and 404'd;
recovered by `wp export` and re-import, minus its featured image. Jannah is
`docker stop`ped now — kept on disk as the rollback path, not running.

Nothing failed while this was happening. The editor saw a successful publish.

**🔴 `WP_SITEURL` was defined, and the GraphQL endpoint started returning the
blog archive as HTML.** The WPGraphQL route registers relative to `siteurl`, so
moving `siteurl` moves the endpoint. The magazine kept serving from the ISR
cache for several minutes and nobody noticed — the window in which this looks
fine is the window in which it gets committed. Reverted from a `wp-config.php`
backup, and written into `decisions.md` as a never, because it is exactly the
lever someone reaches for next time admin URLs are wrong.

**The admin now reaches the CMS host through filters instead.** Thirteen of
them, plus an output buffer over the finished admin HTML — and the buffer is not
belt-and-braces. Per-source filters only catch URLs registered as absolute;
jQuery's is not, and without jQuery the whole admin JavaScript fails. The same
shape as an invariant sweep that passes because it only met well-formed input.

`wp.ajax.settings.url` needed both halves of a two-part fix, because it prints
as a RELATIVE path and no PHP filter can match one — there is no host to
rewrite. An inline script after `wp-util`, and an nginx rewrite on the CMS host
for everything else built the same way.

**`wp core download --force` without `--locale=fa_IR`** put English core on a
Persian install: 31 `wp is not defined` errors, admin JavaScript dead. The 404
that prompted it was for `wp-admin/css/colors/fresh/`, which does not exist —
removed in WordPress 7.1, replaced by `modern`.

**The GraphQL rate limit had never fired.** The server's nginx had
`location = /graphql` where the repo had `location = /mag/graphql`; `=` is an
exact match, so the limit had been configured for months and applied to nothing.
The repo version went to the server, and the rules that existed only on the
server — public-page 404s, an `?author=` guard — came back to the repo.

**Then the limit killed the first production build.** `burst=20` rejected 21 of
40 concurrent requests; Next prerenders 82 pages in parallel. Raised to
`burst=200`, 40 of 40 answered. The limit is for scrapers, and the build is the
only legitimate caller that bursts this hard.

**The market taxonomy is checkboxes now** — `hierarchical => true`. A free-text
tag box for six fixed terms invites a typo, and a misspelled market is a market
the archive cannot find. Interface only; term counts unchanged.

Three of these were mistakes made during the session — the admin block wired to
the wrong WordPress, the locale-less core download, and the rate limit that
stopped the build. They are in `decisions.md` as rules for that reason.

---

## 2026-09-09 (later) — Hero proportion, mobile progress, real overflow, hover

### 3 🔴 The page scrolled sideways on mobile — REPRODUCED, and the previous clean sweep was the problem

Twelve routes at fifteen widths had reported no overflow. It measured
**fixtures**, and every fixture body was written against this design. Real
bodies come out of a WordPress edited since 2019 by people pasting embeds and
setting pixel widths.

A fixture built from that markup scrolls **+600px at 320px**. Two culprits:

| element | why it escaped |
|---|---|
| `<iframe width="560">` | **there was no iframe rule in the stylesheet at all** |
| `<div style="width:900px">` | the sanitizer strips justify/italic/ltr and leaves width alone |

An embed is the most common thing in migrated content and the least likely to
be in a fixture, which is exactly why it survived.

Fixed in CSS, not the sanitizer: clamping keeps an author's deliberate
`width: 60%` working where stripping every width would not. `> *` and not `*`,
so a table already scrolling inside its own box is untouched —
`td { max-width: 100% }` would squash the thing that is working. Confirmed
still handled: tables, `pre`, inline `code`, a 300-character URL, and
`<img style="width:1200px">` — `max-width` clamps a declared width, so that one
was never a defect.

**Two more defects surfaced the moment the checker saw a real body**, and they
are worth more than the overflow was. In-body images were **eager and unsized**,
because raw CMS markup carries no `loading` attribute — an article with ten
figures fired eleven blocking image requests competing with the hero, which is
the LCP element on a product whose stated first priority is LCP. And the `sizes`
invariant was over-broad: `sizes` means nothing without `srcset`, and a raw CMS
`<img>` has one src and no candidate list. It had never met one.

`check-invariants.mjs` now runs **320, 360, 390, 414 and 1024** over two
article-body routes, and **names the offending element**.
`scrollWidth > clientWidth` says the page scrolls and nothing about why — which
is how a real overflow survived a clean report.

### 1 🟠 The desktop hero — constrained in width, not capped in height

The complaint is real: full-bleed at 1360px a 1.9 image stands 714px tall, so at
1440×900 the reader gets a headline and a picture and scrolls to reach a
sentence.

The brief recommended a 420–480px height cap with a centred crop, and flagged
the risk itself — several featured images have the headline baked into the
artwork. Measured against the known ratios at 1360px:

| source | cap 480, centre crop | width 820, same clamp |
|---|---|---|
| 1.90 — the majority | **33% cropped** (16% off each edge) | 430px tall, **0% cropped** |
| 1.50 | 47% cropped (24% off each edge) | 432px tall, 21% — unchanged |
| 2.50 | 12% cropped | 328px tall, 0% cropped |

**The cap crops a third off the majority image**, which currently crops nothing.
That is the cropping the natural-ratio change was made to remove, coming back on
the most common case, to reach a height the other approach beats anyway.

So the hero is constrained to the title block's 820px measure at desktop. It is
**shorter than the cap would be** — 430px against 480 — with no new cropping at
all, because the existing [1.9, 2.8] clamp already does the work at any width.
A/B on the same page, toggling the constraint at runtime:

```
1440px   hero 745 → 462px   body starts 1267 → 984px   283px sooner
1024px   hero 527 → 462px   body starts 1097 → 1032px   65px sooner
 390px   unchanged — the complaint was desktop-only
```

**So the changelog does not have to accept cropping**, and that is the point
rather than a technicality: the brief asked for the trade-off to be stated, and
it turned out to be avoidable. It also removes a risk that **could not be
measured** — the CMS is unreachable, so where baked headlines sit in the frame
is unknown, and a centre crop is only safe if they sit away from the vertical
edges. Not cropping means not needing that answer. **This closes B19.**

Not the side-by-side reference either, and the brief's own reasoning is why: that
reference is a blog of short posts; this magazine has 41-minute reads where the
hero is the only visual before a wall of text.

### 2 🟠 Reading progress on mobile

The readout lived in the ToC panel, which is `xl:block` — so below 1280 a reader
had none, on 41-minute articles, for the majority of this audience. It matters
**more** on a phone: the scrollbar is hidden, so there is no other cue.

Rendered from `ArticleAside` rather than a new component, which meets the
brief's requirement properly rather than nominally: one implementation **and**
one listener, so the two readouts cannot drift. Verified — the hidden mobile bar
and the visible panel report 15%, 66%, 100% at the same three positions.

Not a bar under a sticky header (this header is not sticky), no track — an empty
track would draw a permanent line across the top of every article. **It cannot
show 2% while the hero is on screen and no threshold was needed**: progress is
measured against `[data-article-body]`, so `> 0` already means "past the hero".
Adding a threshold would have been a second definition of the same moment.

### 4 🟠 The dropdown: hover, and finishing

Hover was missing and the reasoning had been right about touch and wrong about
desktop. Gated on `(hover: hover) and (pointer: fine)` — the actual capability,
where a width breakpoint gets a touchscreen laptop wrong in both directions.

The two details that make hover menus feel broken: a 180ms close delay so a
pointer crossing the 8px gap does not watch the menu vanish, and the panel
cancelling the pending close when the pointer enters it — without which the
delay only moves the failure later.

**And one the measurement found: hover-then-click closed it.** On a mouse,
reaching the trigger fires `pointerenter` and opens the panel before the click
lands, so a plain toggle shut it — the whole interaction inverted. The first
click after a hover-open is absorbed now.

**The shadow was not there at all.** `shadow-[0_12px_32px_-8px_rgba(…)]`
compiled to `rgba(0, 0, 0, 0) 0px 0px 0px`, while looking correct in the class
list. It is a `--shadow-panel` token now, because a shadow is a colour and one
value cannot serve three themes — a tight black shadow is invisible against v1
navy, where the page behind it is already darker than the shadow.

Counts are visibly secondary and sit inside the row's padding rather than
against the panel edge. «اقتصاد جهانی», the longest label, measures 222px in a
240px panel with no truncation, and the panel stays inside the viewport at 1024.

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
