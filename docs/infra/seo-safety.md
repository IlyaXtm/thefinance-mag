# SEO Safety Protocol — Mag Headless Cutover

**Objective:** move `thefinance.ir/mag` from WordPress rendering to Next.js rendering with no measurable ranking loss, and with the ability to revert in under a minute at any point.

---

## The four things that actually cause rank loss

Almost every headless migration that loses traffic loses it to one of these. All four are preventable and all four are silent — the site looks fine while it happens.

| # | Failure | How it looks | Detection |
|---|---|---|---|
| 1 | `noindex` leaks from staging to production | Page renders perfectly | `curl -sI` for `X-Robots-Tag`; Search Console URL Inspection |
| 2 | Canonical points at `wp.thefinance.ir` | Page renders perfectly | View source, check `<link rel="canonical">` |
| 3 | `robots.txt` disallows `/mag` | Page renders perfectly | `curl robots.txt` before and after |
| 4 | URLs change without a 1:1 301 map | 404s the user never reports | Crawl diff against baseline |

There is a fifth, slower one: metadata silently going null because a GraphQL field name was written from memory and never verified. It doesn't 404, it just quietly strips your titles and descriptions.

---

## Phase A — Baseline. Do this before touching anything.

**You cannot detect a regression without a "before".** This is the step teams skip and then regret.

**Search Console**
- Performance → filter Page contains `/mag` → export last 3 months: clicks, impressions, CTR, average position, top pages, top queries. Save it dated.
- Pages → record the exact count of indexed URLs under `/mag`.
- Record current Core Web Vitals status for the `/mag` group.

**Full crawl of production**

Crawl every `/mag` URL and store, per URL: status code, final URL after redirects, `<title>`, meta description, canonical, `<h1>`, meta robots, `X-Robots-Tag`, presence of Article JSON-LD, word count, internal link count.

This file is the contract. Staging will be diffed against it.

**URL inventory**

Export every live `/mag` URL — articles, category archives, tag archives, author pages, paginated pages, feeds. From the WordPress sitemap plus a crawl, since the sitemap misses orphans.

**Exit:** you have a dated GSC export, an indexed-URL count, and a full crawl file. Nothing proceeds without these.

---

## Phase B — Do not change URLs

R1 changes the rendering layer only. Not the URL structure, not the taxonomy routes, not the slugs.

```
Before:  thefinance.ir/mag/bitcoin-etf
After:   thefinance.ir/mag/bitcoin-etf
```

The market/category question is a **separate release** with its own redirect map, its own baseline, and its own monitoring window. Changing infrastructure and URLs together means that when rankings move you cannot tell which one moved them.

If a URL genuinely must change, it needs a 1:1 301 — never a blanket redirect to the homepage, which Google treats as a soft 404 — and no redirect chains: one hop to a 200.

---

## Phase C — Parallel run and crawl diff

Run the Next.js version on staging against the same content, then crawl it with the same tool and settings as the Phase A baseline.

**Diff every URL on these fields:**

| Field | Requirement |
|---|---|
| Status code | 200 for every URL that was 200 |
| Canonical | Present, self-referencing, on `thefinance.ir` — **never** `wp.thefinance.ir` |
| `<title>` | Present; deviations reviewed individually, not accepted in bulk |
| Meta description | Present |
| `<h1>` | Exactly one, no level skips below it |
| Meta robots | `index, follow` — no `noindex` anywhere |
| Article JSON-LD | Present and valid on article pages |
| BreadcrumbList | Present where breadcrumbs render |
| Word count | Within ~5% of baseline — a large drop means content isn't rendering server-side |
| Internal links | Within ~10% — a large drop means navigation moved to client-side JS |

The word-count and internal-link checks are the ones that catch the subtle failure: content that renders for a human but not for a crawler because it's behind SWR instead of a server component.

**Also verify:**
- `sitemap.xml` lists only `thefinance.ir/mag` URLs, zero `wp.` URLs
- Staging itself is `noindex` and production is not — confirm both directions
- Rendered HTML contains the article body without JavaScript (`curl` it and read)

---

## Phase D — Reversible cutover

**The architecture makes this cheap — use it.** The WordPress theme still exists and can render `/mag`. So the cutover is an nginx upstream change:

```nginx
# On thefinance.ir
location /mag {
    proxy_pass http://next_upstream;   # cutover
    # proxy_pass http://wp_upstream;   # rollback — swap and reload
}
```

Rollback is `nginx -s reload`, not a redeploy. Seconds, not minutes.

**Cutover sequence**

1. Pick a low-traffic window.
2. Confirm production `robots.txt` does not block `/mag`, and no `noindex` on the frontend.
3. Confirm `wp.thefinance.ir` returns `X-Robots-Tag: noindex`.
4. Switch the upstream, reload nginx.
5. **Within five minutes:** spot-check 10 URLs — status, canonical, title, robots, rendered body. Search Console URL Inspection on 2–3 live URLs.
6. Submit the updated sitemap.
7. Watch the 404 log for the first hour.

**Roll back immediately, without debating, if:** any `noindex` appears on a public URL, canonicals point at `wp.`, more than a handful of URLs 404, or rendered HTML is missing article bodies. Diagnose on staging afterwards. A fast revert costs nothing; a bad day in the index costs weeks.

---

## Phase E — Monitoring

**First 48 hours:** 404 log daily · Search Console Coverage for new errors · crawl stats for a request-rate collapse · Core Web Vitals field data starting to populate.

**Weeks 1–12, weekly:** clicks, impressions, average position against the Phase A baseline · indexed URL count · any URL dropping out of the index.

**Expected shape, so you don't panic at normal noise:** Googlebot typically acknowledges the change within 1–2 weeks. Rankings fluctuate through roughly weeks 3–8. A well-executed move stabilises around weeks 4–12.

**Thresholds:**

| Signal | Read |
|---|---|
| Indexed count within ~5% | Normal |
| 5–15% drop | Investigate — usually a canonical or redirect gap |
| >20% drop | Treat as an incident; consider rolling back |
| Impressions fluctuating ±15% in weeks 3–8 | Normal re-evaluation |
| Impressions down >30% for two consecutive weeks | Incident |

Keep any redirects live at least 12 months.

---

## Ongoing invariants

These must be true forever, not just at cutover. Worth a scheduled check.

- `wp.thefinance.ir` returns `X-Robots-Tag: noindex` — a plugin or config change can silently remove a header
- Canonicals on `/mag` always resolve to `thefinance.ir`
- `sitemap.xml` never contains a `wp.` URL
- Production `robots.txt` never blocks `/mag`
- Article bodies are present in server-rendered HTML

```bash
# Cheap enough to run as a cron and alert on
curl -sI https://wp.thefinance.ir/ | grep -qi 'noindex' || echo 'ALERT: CMS is indexable'
curl -s https://thefinance.ir/mag/ | grep -q 'rel="canonical"[^>]*thefinance.ir' || echo 'ALERT: canonical wrong'
curl -s https://thefinance.ir/sitemap.xml | grep -q 'wp\.thefinance\.ir' && echo 'ALERT: CMS URLs in sitemap'
curl -s https://thefinance.ir/robots.txt | grep -qi 'disallow:.*\/mag' && echo 'ALERT: /mag disallowed'
```

---

## What "under control" means here

Four properties, in priority order:

1. **Reversible** — rollback is an nginx reload, and the WordPress theme is never deleted.
2. **Measurable** — a dated baseline exists, so regression is detectable rather than felt.
3. **Isolated** — one variable changes per release. Rendering layer in R1. URLs, if ever, in R2.
4. **Monitored** — the invariants above are checked automatically, not remembered.

Miss any one and the other three stop protecting you.
