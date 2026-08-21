# Plan to cutover

Ordered by dependency, not by preference. The sequence matters: two of these
steps make the others recoverable, and doing them late is how migrations lose
rankings.

**Current state:** the app runs on real WordPress data, all routes work, three
audit passes are closed. It has never run anywhere but a laptop.

---

## Now — three things outside the repo

None of these need code. One is costing you traffic today.

**`robots.txt`** — in `thefinance-front`, `public/robots.txt`:

```diff
- Disallow: *.xml$              # blocks the sitemap declared in the same file
- Disallow: *.thefinance.ir/    # robots.txt matches paths, not hosts — inert
- Disallow: /map/wp-content/plugins/
+ Disallow: /mag/wp-content/plugins/
```

The first line tells Google where your sitemap is and then forbids reading it.
Unrelated to this project and worth fixing regardless.

**SPF and DMARC** — on `thefinance.ir`:

```
TXT  @        v=spf1 ip4:185.248.32.4 -all
TXT  _dmarc   v=DMARC1; p=none; rua=mailto:dmarc@thefinance.ir
```

Last test showed `dkim=pass` but `spf=none`. Newsletter confirmation mail goes
to spam until this is published.

**Search Console baseline** — and this one gates the cutover, so do it before
anything else changes:

- Performance → filter Page contains `/mag` → export three months. Save it dated.
- Performance → **Search type: Image** → export separately. Skipping this means
  an image-traffic drop after cutover can't be distinguished from noise.
- Pages → record the indexed URL count under `/mag`.
- Check whether `/mag/category/*` URLs are indexed. If they are, they need
  redirects — the new app has no such route.

**You cannot detect a regression without a before.** This is the step teams skip
and then regret.

✅ Done: comment moderation is on.

---

## Step 1 — Deploy and staging · ~2 days

Everything downstream depends on this, including the Next 16 upgrade, which
should not happen anywhere else first.

- Build the app into a container, run it on the frontend server at port 3100
- Add an nginx location for a staging path so it's reachable without touching
  `/mag`
- **Staging must be `noindex`** — verify with `curl -I`, both directions:
  staging noindexed, production not
- The frontend nginx config isn't in any repo. Put it in one, or the cutover
  depends on a file nobody can review

**Exit:** the app is reachable at a staging URL, returns `noindex`, and renders
real articles.

---

## Step 2 — Next 16 upgrade · ~1 day

On staging, as its own change with its own test pass. Not bundled with anything.

```bash
npx @next/codemod@canary middleware-to-proxy .
npm install next@latest eslint-config-next@latest
npm run lint && npx tsc --noEmit && npx next build
```

Closes three high-severity advisories. `sharp` is the one that matters —
reachable through `next/image` at request time.

Watch: Turbopack becomes default, `params` go async, `next/image` defaults
change. Re-run the full audit sweep afterwards.

**Exit:** `npm audit` clean, all gates pass, sweep finds nothing new.

---

## Step 3 — Editor enablement · ~2 weeks

The largest remaining piece, and the one that decides whether the content team
can work without a developer.

- `theme.json` generated from the design tokens; freeform colour and font-size
  controls off so editors stay on-brand
- Three blocks only: Callout, Disclaimer, CTA. Chart embeds and product cards
  wait until an editor asks
- Block locking on branded structures; Disclaimer copy not editor-editable
- Draft Mode preview wired through nginx
- Publish webhook → `revalidatePath`, with the ISR TTL as fallback

**Exit:** an editor previews a draft and publishes; the article appears within
seconds rather than at the end of a revalidation window.

---

## Step 4 — Content team · ~3 days

`docs/content-team-guide.md` exists. Roles configured as Editor/Author with no
admin capability. One training session.

**Hard pass/fail: a content team member publishes a complete article —
disclaimer and CTA included — with zero developer help.**

If that fails, the answer is a bigger block library, not an architecture change.

---

## Step 5 — Pre-cutover verification · ~2 days

Crawl staging and diff it against a crawl of current production. Per URL:
status, canonical, title, meta description, `h1`, robots, JSON-LD presence,
word count, internal link count.

The last two matter most: a large drop in either means content renders for a
human but not for a crawler.

Then confirm, on production:

- `/mag` is not blocked in `robots.txt`
- No `noindex` anywhere on the public frontend
- `wp.thefinance.ir` still returns `X-Robots-Tag: noindex`
- `sitemap.xml` contains zero `wp.` URLs
- Every article URL from the baseline still resolves

**No redirect map is needed** — the permalink structure is `/%postname%/` and
doesn't change. The one exception is `/mag/category/*` if the baseline shows
those indexed.

---

## Step 6 — Cutover · ~1 hour, then 8–12 weeks monitoring

The switch is one line on the frontend nginx:

```nginx
location /mag {
    proxy_pass http://127.0.0.1:3100;   # cutover
    # proxy_pass http://127.0.0.1:9080; # rollback
}
```

Sequence: low-traffic window → switch → reload → within five minutes spot-check
ten URLs for status, canonical, title, robots and rendered body → Search Console
URL Inspection on two or three → submit the sitemap → watch the 404 log for an
hour.

**Roll back immediately, without debating, if:** any `noindex` appears on a
public URL, canonicals point at `wp.`, more than a handful of URLs 404, or
rendered HTML is missing article bodies. Diagnose on staging afterwards.

**Never delete the old WordPress theme.** It's what makes rollback an nginx
reload instead of a redeploy.

Monitoring: 404 log and Coverage daily for 48 hours; then weekly against the
baseline for 8–12 weeks. Expect fluctuation through weeks 3–8 and stabilisation
around 4–12. A drop over 20% in indexed count is an incident.

---

## What protects the SEO

Four properties, and each is load-bearing:

**Nothing changes that doesn't have to.** Article URLs, image URLs, and the
permalink structure all stay identical. Only the rendering layer moves.

**Rollback is a config reload.** Old WordPress stays running on port 9080. The
window between "something is wrong" and "it's back" is seconds.

**A baseline exists.** Regression becomes detectable rather than felt.

**The silent failures have automated checks.** All four ways a headless
migration loses rankings are invisible in a browser — the page renders
perfectly while it happens:

```bash
curl -sI https://wp.thefinance.ir/ | grep -qi noindex || echo 'ALERT: CMS indexable'
curl -s https://thefinance.ir/mag/ | grep -q 'canonical[^>]*thefinance.ir' || echo 'ALERT: canonical'
curl -s https://thefinance.ir/sitemap.xml | grep -q 'wp\.thefinance' && echo 'ALERT: CMS URLs in sitemap'
curl -s https://thefinance.ir/robots.txt | grep -qi 'disallow:.*\/mag' && echo 'ALERT: /mag disallowed'
```

Run these as a cron with alerting. They cost nothing and catch the failures
nobody notices.

---

## Deliberately deferred

In `docs/backlog.md` with reasoning: `/mag/feed` (four requests in two weeks,
none from a feed reader — no real subscribers), learning-path ordering, reader
level, reports, MinIO, newsletter sending (blocked on SPF).

---

## One open decision

**Should the content-type filter move from `?type=` to `/archive/type/<slug>`?**

`/archive` is the last uncacheable route. A route can't be static and read
`searchParams`, so as long as filtering lives in the query string, it stays
dynamic.

My original argument was that four filter routes would be thin near-duplicates.
Having seen the real distribution, that's weaker than I thought: `آموزش` has 27
articles and `اخبار` has 3 — those are distinct pages, not duplicates.

Moving it makes all four static. The cost is four URLs instead of one, and a
small change to the filter bar.

Worth doing, but it's a URL-shape decision and therefore yours.
