# Handoff — مجله فایننس

For Claude Code, working in `IlyaXtm/thefinance-mag`, branch `claude-main`.

Read `CLAUDE.md` and `docs/decisions.md` before changing anything. The
constraints there are not preferences — several are legal or accessibility
requirements, and a few were arrived at after being wrong once.

---

## Where things stand

The app runs against **real WordPress data** (`NEXT_PUBLIC_USE_MOCK=false`,
endpoint `https://wp.thefinance.ir/mag/graphql`). 32 published articles.

**Built and working:** listing, article, archive, market archive, author,
authors index, search, pagination, 404, sitemap, robots, health, comments API.
Header and footer. SEO layer with canonical rewriting and JSON-LD. Comments
(moderated, hidden when empty). Newsletter form. Self-hosted IRANYekanX.

**Not built:** Gutenberg blocks, Draft Mode preview, revalidation webhook,
newsletter storage/sending, learning-path ordering.

---

## Step 1 — Establish the baseline

Nothing else matters until this passes. Several archives were handed over in
sequence and it is not certain every one landed.

```bash
git status --short          # anything uncommitted?
git log --oneline -5
npm install
npx tsc --noEmit            # must be clean
npx next build              # must succeed
npm run dev
```

Then confirm the data source is real, not mock:

```bash
curl -s http://localhost:3000/mag/health
# expect: {"status":"ok","source":"wpgraphql",...}
```

If it says `"mock"`, `.env.local` has `NEXT_PUBLIC_USE_MOCK=true`. Change it to
`false` and restart — `NEXT_PUBLIC_*` variables are inlined at build time.

Smoke-test every route:

```bash
for p in "/mag" "/mag/archive" "/mag/archive?type=education" \
         "/mag/authors" "/mag/search?q=تحلیل" "/mag/sitemap.xml" \
         "/mag/robots.txt" "/mag/does-not-exist"; do
  printf "%-38s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$p")"
done
```

All 200 except the last, which must be **404** — not 500. A missing article is
an expected outcome; a 500 tells Google the server is broken.

Then open a real article and click through: breadcrumb → market archive →
author → back. Every page must have a route onward.

---

## Step 2 — Visual debugging

The layout was changed substantially in the last few passes and has not been
reviewed in a browser. Work through these at 1280px, 1024px and 390px, in all
three themes.

**Article page** — `/mag/<any-slug>`

- [ ] The article container is centred (`max-w-[1080px]`), not pinned to the
      right with two thirds of the screen empty
- [ ] The table of contents sits beside the text in the inline-end column (the
      LEFT in RTL), not floating in whitespace
- [ ] ToC entries scroll internally rather than stretching past the viewport —
      the technical-analysis article is a 41-minute read with many headings
- [ ] Clicking a ToC entry jumps to that heading. If nothing happens, the body
      ids and the ToC hrefs have diverged — both come from `headingId()` in
      `lib/sanitize.ts` and must stay that way
- [ ] The active section highlights while scrolling
- [ ] Body text is ~700px wide, measuring 70–73 Persian characters per line
- [ ] No justified text anywhere (the classic editor writes inline
      `text-align: justify`; `sanitizeArticleHtml` strips it — verify it worked)
- [ ] Images inside the body don't overflow the column

**Index** — `/mag`

- [ ] Exactly ONE image on the page (the hero). Every featured image has the
      headline baked into the artwork, so a grid of image cards prints each
      title twice. This is deliberate; don't "fix" it by adding thumbnails
- [ ] No article appears twice on the page
- [ ] Reading time reads naturally at the sizes present (3 min to 41 min)
- [ ] `housing` does not appear in Topics — it has zero articles

**Everywhere**

- [ ] Chevrons point in the RTL reading direction (breadcrumbs, pagination,
      "see all"). This is the most common RTL bug and invisible in an LTR
      layout
- [ ] Latin fragments inside Persian titles — «نات کوین (Notcoin) چیست؟» — don't
      scramble their punctuation
- [ ] Keyboard focus is visible on every interactive element, **especially in
      the light theme**, where the ring previously measured 2.85:1 against
      white and failed WCAG 2.2 SC 1.4.11
- [ ] Footer sticks to the bottom on short pages
- [ ] Logo loads in header and footer (`/logo.png` under basePath `/mag`)

---

## Step 3 — Performance

Measure before optimising. `npm run dev` compiles per request and is not
representative:

```bash
npm run build && npm start
```

Then Lighthouse on `/mag` and one article, mobile profile.

Targets: **LCP ≤ 2.5s · CLS ≤ 0.1 · INP ≤ 200ms.** SEO and Core Web Vitals are
this product's first priority.

Isolate before assuming:

```bash
curl -s -o /dev/null -w "graphql: %{time_total}s\n" \
  -X POST https://wp.thefinance.ir/mag/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first:9){ nodes { slug title } } }"}'

curl -s -o /dev/null -w "image: %{time_total}s %{size_download}b\n" \
  https://thefinance.ir/mag/wp-content/uploads/2026/08/aud-usd-upside-risk-analysis.jpg
```

**The most likely culprit is `countArticles` in `mag.api.ts`.** It walks the
connection in pages of 100 to produce a total, because WPGraphQL core has no
count without the offset-pagination plugin — which is not in the WordPress
repository and was rejected for that reason. It runs on every regeneration. If
it is slow, cache it harder or derive the count once per build rather than per
page.

Second candidate: images are served from the old server, and `next/image`
re-processes each one.

---

## Step 4 — Verify the SEO layer against real data

It has been tested against mock data and read in rendered HTML, but not
end-to-end with WordPress content.

```bash
curl -s http://localhost:3000/mag/<real-slug> > /tmp/a.html

grep -o '<link rel="canonical"[^>]*>' /tmp/a.html
grep -o '<meta name="robots"[^>]*>' /tmp/a.html
grep -o '<meta property="og:[^"]*" content="[^"]\{0,50\}' /tmp/a.html
```

- [ ] Canonical is on `thefinance.ir`, **never** `wp.thefinance.ir`. If a CMS
      host ever reaches a canonical, the same articles index from two hosts and
      dilute each other. It fails silently — the page renders perfectly
- [ ] `og:title` and `og:description` differ per article. A previous bug had
      every article sharing one article's metadata; the shape was valid so the
      type system never caught it
- [ ] JSON-LD validates. News articles get `NewsArticle`, everything else
      `Article` — publication date is the signal for translated news, revision
      date for evergreen education
- [ ] `dateModified` appears only when a genuine revision exists. If everything
      claims to be updated, nothing is
- [ ] `/mag/sitemap.xml` contains zero `wp.thefinance.ir` URLs
- [ ] `/mag/search` is `noindex, follow`

---

## Step 5 — Outstanding items

These are documented in `docs/backlog.md` with the reasoning. Three need action
outside this repo:

**Comment moderation is OFF.** Verified: `comment_moderation = 0`. WordPress
publishes comments without review, which is the opposite of the decision made.
The frontend only renders approved comments so nothing leaks, but WordPress is
accepting them regardless.

```bash
# On the CMS VPS
docker compose exec -T wordpress wp option update comment_moderation 1 --allow-root
```

**`robots.txt` on the main site has three defects** (in `thefinance-front`, not
this repo):

```diff
- Disallow: *.xml$              # blocks the sitemap declared in the same file
- Disallow: *.thefinance.ir/    # robots.txt matches paths, not hosts — inert
- Disallow: /map/wp-content/plugins/
+ Disallow: /mag/wp-content/plugins/
```

The first is costing indexation today.

**SPF and DMARC are not published for `thefinance.ir`.** Last test showed
`dkim=pass` but `spf=none`. Newsletter confirmation emails will land in spam.

---

## Things not to change without discussing

Each of these looks like an oversight and isn't:

- **One image on the index.** The featured images contain the headlines.
- **No view counts, comment counts, trending sections, urgency badges, or live
  price data.** Prohibited by the brand book; signal-selling is prohibited by
  Iranian securities law. Their absence is the position.
- **No `aria-label` on card links.** The title text is the accessible name; a
  duplicate label drifts out of sync with the visible text.
- **Gravatar is ignored.** Third-party request per author, leaks an email hash
  abroad, unreliable from Iran. Avatars render as an initial.
- **No `text-align: justify`, no `font-style: italic`.** Persian has no true
  italic and justification produces rivers without kashida support.
- **Real pagination, never infinite scroll.** Crawlers follow links.
- **The reports section returns empty deliberately.** No content source exists.
  An empty section is honest; a padded one lies.
- **`مقالات` and `اینچارت` map to null** in `resolveContentType`. They are tags,
  not content types. Articles carry ~2 categories each, so the priority mapping
  is what makes the type deterministic.
