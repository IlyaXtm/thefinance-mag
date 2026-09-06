# Frontend server — staging deploy and cutover

Step 1 of the cutover: build the Mag app into a container, run it on port 3100
alongside the existing apps, and reach it at `new.thefinance.ir/mag` while
`thefinance.ir/mag` stays on WordPress.

**Nothing here has been run on the real server.** It was built and verified in
a sandbox that cannot reach the frontend host. What was verified, and how, is
at the bottom.

---

## Files

| File | Goes to |
|---|---|
| `Dockerfile` | repo root; built on the server |
| `infra/mag/compose.yaml` | `/root/mag/compose.yaml` |
| `infra/mag/.env.example` | copy to `/root/mag/.env` |
| `infra/nginx/thefinance.ir.conf` | `/etc/nginx/sites-available/` |
| `infra/nginx/new.thefinance.ir.conf` | `/etc/nginx/sites-available/` |

The two nginx files did not previously exist in any repository — they lived
only on the server, which meant the cutover depended on an artifact nobody
could review.

---

## Deploy

```bash
# On the frontend server
git clone -b claude/finance-mag-handoff-czder7 <repo> /root/mag-src
mkdir -p /root/mag
cp /root/mag-src/infra/mag/compose.yaml /root/mag/
cp /root/mag-src/infra/mag/.env.example  /root/mag/.env

# compose builds from the repo root; point it at the checkout
cd /root/mag && sed -i 's|context: \.\.|context: /root/mag-src|' compose.yaml

docker compose up -d --build
docker compose ps            # wait for "healthy", ~40s
curl -s localhost:3100/mag/health
# expect: {"status":"ok","source":"wpgraphql", ...}
```

`"source":"mock"` means `.env` is wrong or wasn't read. It is the one thing the
healthcheck deliberately reports, because a container serving mock data looks
perfectly healthy otherwise.

### Certificate and nginx

```bash
certbot certonly --nginx -d new.thefinance.ir

nginx -v    # needs >= 1.25.1 for `http2 on;` — see the note in the config

cp /root/mag-src/infra/nginx/new.thefinance.ir.conf /etc/nginx/sites-available/
cp /root/mag-src/infra/nginx/thefinance.ir.conf     /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/new.thefinance.ir.conf /etc/nginx/sites-enabled/

nginx -t && systemctl reload nginx
```

Take a diff of the live `thefinance.ir` config against the one in the repo
before overwriting it. The repo version was reconstructed from what the app
needs; the server's may carry rules for the other apps that must be kept.

---

## Exit checks

```bash
# Reachable, real data
curl -s  https://new.thefinance.ir/mag/health            # "wpgraphql"
curl -sI https://new.thefinance.ir/mag/ | head -1        # 200

# Staging is noindexed
curl -sI https://new.thefinance.ir/mag/ | grep -i x-robots
#   → X-Robots-Tag: noindex, nofollow
curl -s  https://new.thefinance.ir/robots.txt
#   → Disallow: /

# Production is NOT noindexed, and is still WordPress
curl -sI https://thefinance.ir/mag/ | grep -i x-robots    # → nothing
curl -s  https://thefinance.ir/mag/ | grep -c wp-content  # → non-zero

# Real articles render
curl -s https://new.thefinance.ir/mag/ | grep -o '<h1[^>]*>[^<]*'
curl -s https://new.thefinance.ir/mag/sitemap.xml | grep -c wp.thefinance.ir   # → 0
```

Both directions matter. A staging URL in the index competes with the real one;
a noindex left on production removes the magazine from the index entirely. Both
fail silently — the pages render perfectly either way.

---

## Cutover, when staging has been validated

One line in `thefinance.ir.conf`:

```nginx
set $mag_upstream 127.0.0.1:9080;   # WordPress — live
set $mag_upstream 127.0.0.1:3100;   # Next.js  — after cutover
```

```bash
nginx -t && systemctl reload nginx
curl -sI https://thefinance.ir/mag/ | grep -i x-robots   # MUST be empty
./scripts/verify-redirects.sh https://thefinance.ir > after.txt
diff before.txt after.txt
```

### Rollback triggers — roll back immediately, without debate

- any `noindex` on production
- a wrong canonical, or the CMS host appearing in one
- a missing article body
- **any legacy redirect returning 404, or taking more than one hop.** Those
  nine URLs carry 89% of `/mag` organic clicks. Capture the baseline BEFORE
  the switch:

  ```bash
  ./scripts/verify-redirects.sh https://thefinance.ir > before.txt
  ```

  A redirect that 404s is not a cosmetic regression — it is most of the
  section's traffic, and it fails silently: the page still renders for anyone
  arriving from an internal link.

Rollback is the same line back to 9080 and another reload — seconds, no
redeploy. That is why the old WordPress theme is never deleted.

---

## About `NEXT_PUBLIC_*` — the pipeline question

The brief flagged that `NEXT_PUBLIC_*` variables are inlined at build time, so
an image built with them is environment-specific, which sits badly with "env
comes from a file on the server". That is correct, and it has been addressed —
but the real constraint is narrower than the variable naming suggests.

**Changed:** all three now have server-only names — `USE_MOCK`,
`WP_GRAPHQL_ENDPOINT`, `SITE_ORIGIN` — with the `NEXT_PUBLIC_` variants kept as
fallbacks so an existing deployment keeps working. Verified that nothing
reading them reaches the browser: the SWR hooks that import the data service
are not referenced by any rendered component, and the endpoint string does not
appear in any client chunk. So the public prefix was buying nothing and only
invited the value into a client bundle later.

**The part that does not go away:** `SITE_ORIGIN` is baked into statically
prerendered pages no matter how it is read, because canonical and `og:url` are
written into the HTML at build time. Renaming the variable does not change
that.

**Why it does not actually bite here:** all three values are *identical* in
staging and production. Canonicals must name the production origin even when
staging serves the page — pointing `SITE_ORIGIN` at the staging host is exactly
the mistake the noindex exists to prevent. So the image is portable in
practice, and staging validates byte-for-byte what production will run.

Where it would bite is a review-app-per-branch setup with a different origin
each time; that needs a build per environment. Not the case today, and the
Dockerfile takes the values as build args so it stays a build argument rather
than a code change.

---

## Why staging is a host, not a path prefix

The brief asked for a staging *path*. `basePath: '/mag'` is inlined at build
time — every internal link, asset URL and the router itself compile with it.
Serving the same image under `/mag-staging/` would emit links to `/mag/...`,
which on this server is WordPress: staging would render once, then navigate
straight into production on the first click.

Making a path prefix work needs a second image built with a different
`basePath` — at which point staging is no longer testing the artifact that gets
promoted. A separate host keeps the path identical.

`new.thefinance.ir` is already the documented staging host in `CLAUDE.md`.

---

## What was verified, and what was not

Docker Hub base images and the frontend server are both unreachable from the
build sandbox, so **the image was never built and nothing was deployed**.

Verified:

- **The standalone runtime layout**, by replicating the Dockerfile's runtime
  stage on disk — `public/`, `.next/standalone`, `.next/static` copied exactly
  as the `COPY` lines do — and running `node server.js` against it. All routes
  served, `/mag/health` answered, and the hashed CSS and the IRANYekanX woff2
  both returned 200. That last check is the point: neither `public/` nor
  `.next/static` is inside `.next/standalone`, and a Dockerfile that omits
  those two copies serves HTML with no styling, no JavaScript and no font —
  which reads as a broken deploy rather than a missing copy step.
- **Both nginx configs**, with `nginx -t` and then by running nginx for real
  against a stand-in WordPress on 9080 and the app on 3100:
  - staging returned `X-Robots-Tag: noindex, nofollow` and a `Disallow: /`
    robots.txt, and 404s everything outside `/mag`;
  - production `/mag` returned WordPress with **no** `X-Robots-Tag`, and HSTS
    present;
  - the cutover line switched `/mag` to the app on reload, and the same line
    switched it back;
  - `X-Real-IP` reached the app — a spoofed `X-Forwarded-For` was rate-limited
    on the fourth request, confirming the header the comment endpoint depends
    on is actually set by these configs.
- **compose syntax**, with `docker compose config`.

Not verified, and needing a machine that can reach the CMS:

- that the image builds (base images unreachable here);
- **`"source":"wpgraphql"` and real articles rendering** — everything above ran
  against the mock, because `wp.thefinance.ir` is blocked from the sandbox.
  This is the exit criterion and it can only be checked on the server;
- TLS, certbot, and the real `thefinance.ir` config, which may carry rules for
  the other apps that the repo version does not know about.

---

## Preview, revalidation and the live redirect map

Three things that break silently at cutover unless both halves are deployed —
the person clicks the same button, sees no error, and nothing happens.

### The WordPress half is not in this repo

`thefinance-mag-redirects.php` was described in the brief but is not in
`wordpress/mu-plugins/`. The frontend below is written against the contract as
described:

```graphql
{ magRedirects { from to status } }
magPreview(id: ID!, secret: String!) { …post fields… }
```

**Verify that shape before trusting any of this.** If the real field names or
argument names differ, the frontend fails in the way this whole piece of work
exists to prevent: quietly.

**PHP 8.4 is available in the build environment**, so `php -l` can be run here
the moment the file is in the repo — the brief noted it could not be linted.
Lint it before it goes near the live CMS regardless: a parse error in an
mu-plugin takes down the whole site and cannot be undone from wp-admin.

```bash
php -l wordpress/mu-plugins/thefinance-mag-redirects.php
# and on the CMS VPS
docker compose exec -T wordpress php -l \
  /var/www/html/wp-content/mu-plugins/thefinance-mag-redirects.php
```

### Frontend configuration

Add to `/root/mag/.env`, matching `wp-config.php` byte for byte:

```
TF_MAG_PREVIEW_SECRET=<openssl rand -hex 32>
```

Never `NEXT_PUBLIC_`. `/mag/health` reports `previewConfigured` so a missing
secret is visible rather than silent.

### Checks

```bash
# Health now reports configuration, not just liveness
curl -s https://new.thefinance.ir/mag/health | python3 -m json.tool
```

- `source` — `wpgraphql`, not `mock`
- `previewConfigured` — `true`
- **The redirect gate is both fields together:**
  `redirectSource.reachable === true` **and**
  `redirectSource.missingKnown.length === 0`. Neither one passes alone.
  - `reachable: false` means no fetch has ever succeeded in that process, so no
    new SEO redirect is reaching the frontend and middleware is serving the
    compiled-in floor.
  - It also means `missingKnown` has not actually been measured: with only the
    seed in the cache, the probe compares the compiled-in table against itself
    and returns `[]` — indistinguishable from a healthy result. Checking
    `missingKnown` while `reachable` is false is how a broken CMS reads as
    green.
  - Anything listed in `missingKnown` (with `reachable: true`) is a compiled-in
    rule that `magRedirects` is not returning, i.e. a ranked URL about to start
    404ing. Do not cut over with a non-empty list.

```bash
# Preview: wrong secret gives a bare 401 with no article content
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://new.thefinance.ir/mag/api/draft?secret=wrong&id=123"

# Revalidation
curl -s -X POST https://new.thefinance.ir/mag/api/revalidate \
  -H 'Content-Type: application/json' \
  -d '{"secret":"<secret>","slug":"<slug>","market":"<market>"}'
```

Then in wp-admin: save a draft, click Preview, confirm the page carries the
preview banner and `noindex`, click «خروج از پیش‌نمایش», and confirm normal
pages return to `s-maxage=300`.

### One behaviour worth knowing before you rely on it

Once WordPress answers, its map **replaces** the compiled-in one rather than
merging with it. That is deliberate — merging would make a redirect impossible
to delete, so the SEO team would remove one in Rank Math and it would keep
redirecting.

The cost is that an under-returning `magRedirects` silently drops ranked URLs,
which is why `missingKnown` exists. The two rules whose targets no longer exist
in the database are the exception: they are code-only and always win, so a
stale database row cannot resurrect a 404.
