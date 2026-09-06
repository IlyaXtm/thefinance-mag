# Media Architecture & the Image-URL Contract

**Date:** 2026-08-19
**Supersedes:** the uploads section of `wp-vps-setup.md` — see the correction below
**Related:** `seo-safety-protocol.md`
**Corrected twice:** 2026-08-29 and 2026-09-06. The second correction reverses
part of the first. Read the block below before anything else.

---

## ⚠️ Read this before anything below: two corrections, in opposite directions

This document has been wrong twice, and the second correction reverses half of
the first. Both are recorded because the shape of the mistake matters more than
the answer.

**First pass.** The document was written against `/wp-content/uploads/`. The
browser actually requests `/mag/wp-content/uploads/`, because that is what
GraphQL returns in `sourceUrl` and what `next.config.ts` allow-lists in
`remotePatterns`. nginx picks the **longest matching prefix**, and
`thefinance.ir` has a `location /mag` block, so those requests matched `/mag`
and never reached the uploads block this document specified. Two consequences,
invisible until cutover: `proxy_hide_header X-Robots-Tag` — the entire reason
the block exists — had never executed, and at cutover `/mag` starts pointing at
Next.js, which has no such file, so **every image on the site 404s**. That part
still stands: a `location /mag/wp-content/uploads/` block is required.

**Second pass, and this is the part the first got backwards.** The first fix
concluded that WordPress must be installed under `/mag`, and pointed the new
block at `proxy_pass https://wp.thefinance.ir;` with no path — which preserves
the request URI and asks the CMS for `/mag/wp-content/uploads/…`. Measured
against the real hosts on 2026-09-06:

```
https://thefinance.ir/mag/wp-content/uploads/X.jpg     200   (nginx strips /mag)
https://wp.thefinance.ir/wp-content/uploads/X.jpg      200   ✅
https://wp.thefinance.ir/mag/wp-content/uploads/X.jpg  404   ❌
```

**Uploads live at the ROOT on the CMS.** The `/mag` visible in `/mag/graphql`
and `/mag/wp-admin` is nginx on the CMS host stripping the prefix, not a
subdirectory install. So the first fix moved the 404 one hop upstream rather
than removing it — the same failure, in a place that looks fixed.

The block now carries a trailing path, which is what makes nginx replace the
matched prefix:

```nginx
location /mag/wp-content/uploads/ {
    proxy_pass https://wp.thefinance.ir/wp-content/uploads/;   # slash strips /mag
    proxy_set_header Host wp.thefinance.ir;
    proxy_ssl_server_name on;
    proxy_hide_header X-Robots-Tag;
    proxy_cache_valid 200 30d;
    add_header Cache-Control "public, max-age=2592000" always;
}
```

The un-prefixed block keeps `proxy_pass https://wp.thefinance.ir;` with **no**
path, deliberately: its request URI is already the form the CMS serves.

**What this document says about paths is therefore split.** Public URLs are
`/mag/wp-content/uploads/…` — that is the contract, and it does not change.
CMS-side paths are `/wp-content/uploads/…`. Where the text below shows a path
on `wp.thefinance.ir`, read it as the root form.

The architecture, the MinIO sequencing and the invariants are unchanged.

---

## The governing principle

**The URL is the contract. Storage is an implementation detail behind it.**

```
Public, permanent, never changes:
    https://thefinance.ir/mag/wp-content/uploads/2026/08/chart.jpg

Behind it, swappable at any time without touching a single URL:
    → WordPress VPS local disk        (today)
    → MinIO object storage            (later, if useful)
    → any other backend               (whenever)
```

Every SEO-bearing asset lives on `thefinance.ir`. Articles at `/mag`, images at `/mag/wp-content/uploads/`. `wp.thefinance.ir` carries editors and GraphQL only, and is fully de-indexed.

Once this holds, the storage backend becomes a free choice. Break it once and you pay in image rankings that take months to recover.

---

## ⚠️ Correction to the nginx config

The config in `wp-vps-setup.md` sets `X-Robots-Tag: noindex, nofollow` at the server level on `wp.thefinance.ir`, plus a `noindex` on the uploads location. That is correct **for that host**.

But when `thefinance.ir` proxies `/mag/wp-content/uploads/` to it, **nginx forwards the upstream's headers to the client by default**. The result: images served from `thefinance.ir` inherit `noindex` and drop out of Google Images. Self-inflicted, and silent — the images render perfectly the whole time.

**Fix — on the `thefinance.ir` proxy, strip the upstream header:**

```nginx
# On thefinance.ir
location /mag/wp-content/uploads/ {
    # Trailing path, not a bare host — see the correction at the top.
    proxy_pass https://wp.thefinance.ir/wp-content/uploads/;
    proxy_set_header Host wp.thefinance.ir;
    proxy_ssl_server_name on;

    # ── Required. Without this the CMS's noindex reaches the client
    #    and de-indexes images that should be indexable.
    proxy_hide_header X-Robots-Tag;

    proxy_cache_valid 200 30d;
    expires 30d;
    add_header Cache-Control "public";
    add_header X-Content-Type-Options "nosniff" always;
}
```

**And remove the uploads-level noindex from the WordPress host** so the intent is unambiguous:

```nginx
# On wp.thefinance.ir — uploads location. ROOT, not /mag: the /mag in
# /mag/graphql is nginx stripping a prefix, not a subdirectory install.
location /wp-content/uploads/ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    # X-Robots-Tag deliberately NOT set here.
    # The server-level noindex still applies to HTML on this host;
    # image indexability is controlled at the public origin.
    try_files $uri =404;
}
```

**Verify after deploying:**

```bash
# Public origin: must NOT contain noindex
curl -sI https://thefinance.ir/mag/wp-content/uploads/<known-file>.jpg | grep -i 'x-robots-tag\|^HTTP'

# CMS HTML: must contain noindex
curl -sI https://wp.thefinance.ir/ | grep -i 'x-robots-tag'
```

Add both to the ongoing invariants in `seo-safety-protocol.md`.

---

## MinIO — worth it, but not now and not the usual way

### What it genuinely buys

- Media grows independently of the VPS disk, so the machine stays small
- Backup and restore separate cleanly from the application
- If WordPress is ever rebuilt or moved, media doesn't move with it
- Multiple consumers (Mag, InChart, Academy) can share one media backend

### The trap

The standard WordPress offload plugins — WP Offload Media, Media Cloud, S3-Uploads — **rewrite attachment URLs in the database** to point at the storage host. That is precisely the thing we're protecting against. Install one carelessly and every image URL changes in a single bulk operation.

They also add a plugin to the attack surface, on a stack where 91% of disclosed vulnerabilities are in plugins.

### If MinIO comes in, it must be invisible

MinIO sits behind the unchanged path. The public URL never learns it exists:

```
Browser
   ↓  https://thefinance.ir/mag/wp-content/uploads/2026/08/chart.jpg
ArvanCloud (cache)
   ↓
nginx on thefinance.ir
   ↓  try MinIO first, fall back to the WordPress disk
MinIO  ──fallback──▶  wp.thefinance.ir
```

```nginx
location /mag/wp-content/uploads/ {
    proxy_hide_header X-Robots-Tag;
    expires 30d;
    add_header Cache-Control "public";

    proxy_intercept_errors on;
    error_page 404 = @wp_uploads;

    proxy_pass http://minio:9000/mag-media;
    proxy_set_header Host minio;
}

location @wp_uploads {
    # Root path on the CMS — see the correction at the top of this file.
    proxy_pass https://wp.thefinance.ir/wp-content/uploads/;
    proxy_set_header Host wp.thefinance.ir;
    proxy_hide_header X-Robots-Tag;
}
```

With the fallback in place, migration becomes a background copy: sync files into MinIO at whatever pace suits, and each one starts being served from MinIO as it lands. No cutover moment, no URL change, no bulk database operation. If MinIO fails entirely, everything falls back to the WordPress disk and nobody notices.

**Configure the offload plugin to keep the canonical URL on `thefinance.ir`.** If it can't be configured that way, don't use it — write to MinIO from a small mu-plugin hook instead, or defer the whole thing.

### Sequencing

**Not in this release.** R1 changes one variable: the rendering layer. Adding a media migration during the same window means that when something breaks — rankings, images, load time — you can't attribute it. Same rule as URLs, same rule as the VPS move.

Reasonable order:

1. **R1** — headless cutover. Media stays on the WordPress disk, served through the unchanged path.
2. **Stabilise** — 4–8 weeks of Search Console monitoring against the baseline.
3. **R2** — MinIO introduced behind the fallback pattern. Background sync, no cutover moment.

Bring it forward only if disk pressure on the VPS forces it — and if that happens, more disk is cheaper and safer than a media migration during the monitoring window.

---

## Image SEO checklist

Images are the second-largest source of `/mag` search traffic after articles, and the easiest to lose by accident.

- [ ] Public image URLs unchanged: `thefinance.ir/mag/wp-content/uploads/...`
- [ ] `curl -sI` on a public image shows **no** `X-Robots-Tag`
- [ ] `curl -sI` on `wp.thefinance.ir/` **does** show `noindex`
- [ ] Real `alt` text on content images — never empty strings
- [ ] `next/image` with correct `sizes`; both hostnames in `remotePatterns`
- [ ] Fixed aspect-ratio boxes everywhere (CLS)
- [ ] Hero and featured images marked `priority` (LCP)
- [ ] Modern formats served, with fallbacks
- [ ] ArvanCloud caching `/mag/wp-content/uploads/` so image load never hits the WordPress VPS directly
- [ ] Baseline the Google Images impression count in Search Console **before** cutover, alongside the page baseline

That last one matters: if image traffic drops after cutover and you never baselined it, you'll spend weeks arguing about whether it dropped at all.

---

## Ongoing invariants — add to the cron

```bash
# Public images must NOT be noindex
curl -sI https://thefinance.ir/mag/wp-content/uploads/<known-file>.jpg \
  | grep -qi 'x-robots-tag' && echo 'ALERT: public images are noindexed'

# CMS HTML must be noindex
curl -sI https://wp.thefinance.ir/ \
  | grep -qi 'noindex' || echo 'ALERT: CMS is indexable'

# A known image must still resolve at the unchanged public URL
curl -sfo /dev/null https://thefinance.ir/mag/wp-content/uploads/<known-file>.jpg \
  || echo 'ALERT: image URL contract broken'
```

The third check is the one that catches a storage migration having quietly changed the URL contract.
