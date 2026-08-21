# Media Architecture & the Image-URL Contract

**Date:** 2026-08-19
**Supersedes:** the uploads section of `wp-vps-setup.md` — see the correction below
**Related:** `seo-safety-protocol.md`

---

## The governing principle

**The URL is the contract. Storage is an implementation detail behind it.**

```
Public, permanent, never changes:
    https://thefinance.ir/wp-content/uploads/2026/08/chart.jpg

Behind it, swappable at any time without touching a single URL:
    → WordPress VPS local disk        (today)
    → MinIO object storage            (later, if useful)
    → any other backend               (whenever)
```

Every SEO-bearing asset lives on `thefinance.ir`. Articles at `/mag`, images at `/wp-content/uploads/`. `wp.thefinance.ir` carries editors and GraphQL only, and is fully de-indexed.

Once this holds, the storage backend becomes a free choice. Break it once and you pay in image rankings that take months to recover.

---

## ⚠️ Correction to the nginx config

The config in `wp-vps-setup.md` sets `X-Robots-Tag: noindex, nofollow` at the server level on `wp.thefinance.ir`, plus a `noindex` on the uploads location. That is correct **for that host**.

But when `thefinance.ir` proxies `/wp-content/uploads/` to it, **nginx forwards the upstream's headers to the client by default**. The result: images served from `thefinance.ir` inherit `noindex` and drop out of Google Images. Self-inflicted, and silent — the images render perfectly the whole time.

**Fix — on the `thefinance.ir` proxy, strip the upstream header:**

```nginx
# On thefinance.ir
location /wp-content/uploads/ {
    proxy_pass https://wp.thefinance.ir;
    proxy_set_header Host wp.thefinance.ir;

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
# On wp.thefinance.ir — uploads location
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
curl -sI https://thefinance.ir/wp-content/uploads/<known-file>.jpg | grep -i 'x-robots-tag\|^HTTP'

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
   ↓  https://thefinance.ir/wp-content/uploads/2026/08/chart.jpg
ArvanCloud (cache)
   ↓
nginx on thefinance.ir
   ↓  try MinIO first, fall back to the WordPress disk
MinIO  ──fallback──▶  wp.thefinance.ir
```

```nginx
location /wp-content/uploads/ {
    proxy_hide_header X-Robots-Tag;
    expires 30d;
    add_header Cache-Control "public";

    proxy_intercept_errors on;
    error_page 404 = @wp_uploads;

    proxy_pass http://minio:9000/mag-media;
    proxy_set_header Host minio;
}

location @wp_uploads {
    proxy_pass https://wp.thefinance.ir;
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

- [ ] Public image URLs unchanged: `thefinance.ir/wp-content/uploads/...`
- [ ] `curl -sI` on a public image shows **no** `X-Robots-Tag`
- [ ] `curl -sI` on `wp.thefinance.ir/` **does** show `noindex`
- [ ] Real `alt` text on content images — never empty strings
- [ ] `next/image` with correct `sizes`; both hostnames in `remotePatterns`
- [ ] Fixed aspect-ratio boxes everywhere (CLS)
- [ ] Hero and featured images marked `priority` (LCP)
- [ ] Modern formats served, with fallbacks
- [ ] ArvanCloud caching `/wp-content/uploads/` so image load never hits the WordPress VPS directly
- [ ] Baseline the Google Images impression count in Search Console **before** cutover, alongside the page baseline

That last one matters: if image traffic drops after cutover and you never baselined it, you'll spend weeks arguing about whether it dropped at all.

---

## Ongoing invariants — add to the cron

```bash
# Public images must NOT be noindex
curl -sI https://thefinance.ir/wp-content/uploads/<known-file>.jpg \
  | grep -qi 'x-robots-tag' && echo 'ALERT: public images are noindexed'

# CMS HTML must be noindex
curl -sI https://wp.thefinance.ir/ \
  | grep -qi 'noindex' || echo 'ALERT: CMS is indexable'

# A known image must still resolve at the unchanged public URL
curl -sfo /dev/null https://thefinance.ir/wp-content/uploads/<known-file>.jpg \
  || echo 'ALERT: image URL contract broken'
```

The third check is the one that catches a storage migration having quietly changed the URL contract.
