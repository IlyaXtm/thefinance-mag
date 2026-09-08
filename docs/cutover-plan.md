# Cutover plan

**This file did not exist.** Four separate briefs have referenced
`docs/cutover-plan.md` — for the deploy step, the redirect map, and twice for
the claim that no redirect map was needed. It is written here so the plan stops
living in prompts.

Where a brief said this file contains something, that content is either below
or linked from it. The one claim attributed to it that was **wrong** —
"no redirect map is needed" — is corrected in step 2.

---

## Status

| Step | State |
|---|---|
| 1. Deploy to staging | **Deployed.** Container up on `127.0.0.1:3100` behind nginx, serving real WPGraphQL data — see below |
| 2. Redirect map | Built, unverified against live URLs |
| 3. Pre-cutover crawl diff | Blocked on step 1 |
| 4. Next 16 upgrade | Blocked on step 1, deliberately |
| 5. Cutover | Blocked on 1–4 |

Steps 3 and 4 both need a real staging URL: the crawl diff needs something to
crawl, and the Next 16 upgrade must not land anywhere else first.

---

## Step 1 — Deploy and staging

Files, all in the repo and reviewable:

| File | Destination |
|---|---|
| `Dockerfile` | built on the server |
| `infra/mag/compose.yaml` | `/root/mag/compose.yaml` |
| `infra/mag/.env.example` | copy to `/root/mag/.env` |
| `infra/nginx/thefinance.ir.conf` | **reference only — diff against `/etc/nginx/conf.d/thefinance.ir.conf`, never copy** |

Runbook with the exact commands: **`docs/infra/frontend-deploy.md`**.

**Deployed — but not from this environment, and the distinction still
matters.** The frontend server (87.247.171.97) is unreachable from the build
sandbox: every request returns the sandbox's 403, there is no SSH client, and a
raw TCP check "succeeds" against any address including a bogus one, so it
proves nothing. Everything in this file was verified against the real config
files running locally, and the deploy itself was carried out on the server in a
separate session.

What that session established, and what this file now assumes: the container is
up on `127.0.0.1:3100` behind nginx and serving **real** WPGraphQL data, not
mock. It also applied three fixes to
`wp-content/mu-plugins/thefinance-mag-redirects.php` directly on the server —
that file is still not in git, which is cutover blocker #1. See
`docs/changelog.md`, entry 2026-08-29.

Anything below marked "not verified" is still not verified: being deployed is
not the same as having run the checks.

### Staging is a host, not a path

`basePath: '/mag'` is inlined at build time — every internal link, asset URL
and the router compile with it. The same image served under `/mag-staging/`
emits links to `/mag/...`, which on that server is WordPress: staging renders
once, then navigates into production on the first click. A path prefix needs a
second image with a different basePath, at which point staging is no longer
testing the artifact that gets promoted.

Staging is now the PATH `https://thefinance.ir/mag-next/` on the production host, already serving with `noindex`. `new.thefinance.ir` was dropped and its config removed from this repo.

### The cutover line

One line in `thefinance.ir.conf`:

```nginx
proxy_pass http://127.0.0.1:9080/;    # WordPress — live (slash strips /mag)
# proxy_pass http://127.0.0.1:3100;   # Next.js — cutover (NO slash)
```

A variable rather than two commented `proxy_pass` directives, because that
shape is a **two**-line edit and a half-finished one is either two active
directives (nginx refuses to load) or none (every `/mag` request 500s).

```bash
nginx -t && systemctl reload nginx
curl -sI https://thefinance.ir/mag/ | grep -i x-robots   # MUST be empty
```

Rollback is both changes back — port to 9080 AND the slash restored — then another reload. Seconds, no
redeploy — which is why the old WordPress theme is never deleted.

---

## Step 2 — Redirects ⚠️ corrects an earlier claim

**"No redirect map is needed" was wrong.** The permalink structure is
`/%postname%/` and genuinely does not change — but that setting describes how
WordPress builds a URL for a post it *has*. The slugs changed, and the URLs
Google ranks are historical ones that resolve only because WordPress and Rank
Math 301 them from inside WordPress.

| | URLs | Clicks | Impressions |
|---|---|---|---|
| Indexed under `/mag` | 71 | 180 | 4,284 |
| Slug exists today | 23 | 19 | 1,104 |
| **Slug does not** | **48** | **161** | **3,154** |

89% of `/mag` organic clicks. Implemented in
`src/features/mag/lib/redirects.ts` (compiled floor) and
`redirect-source.ts` (live from `magRedirects`, five-minute window, last known
good on failure).

Verify with `./scripts/verify-redirects.sh <origin>` before **and** after the
switch, and diff the two.

---

## The cutover is TWO nginx changes, not one

Written out because getting this wrong 404s the entire magazine and looks like
a Next.js fault rather than a proxy one.

The live `location /mag/` block ends its `proxy_pass` with a trailing slash.
That slash makes nginx replace the matched prefix, stripping `/mag` — which
WordPress needs, because it is installed at the **root**. Next.js is built with
`basePath: '/mag'` and needs the full path.

```nginx
# /etc/nginx/conf.d/thefinance.ir.conf   (NOT sites-available)
location /mag/ {
    proxy_pass http://127.0.0.1:9080/;    # WordPress — today. Slash strips /mag.
    # proxy_pass http://127.0.0.1:3100;   # Next.js — cutover. NO slash.
}
```

1. port `9080` → `3100`
2. **remove the trailing slash**
3. `location /mag/_next/static/` moves port too — three lines in all

Measured under nginx with stand-ins for both upstreams:

| config | Next.js receives | result |
|---|---|---|
| 9080 + slash | *(WordPress sees `/archive`)* | working today |
| 3100 + slash | `/archive` | **404 — every route** |
| 3100, no slash | `/mag/archive` | correct |

Rollback is both changes back, then `nginx -t && systemctl reload nginx`.

⚠️ **Do not copy `infra/nginx/thefinance.ir.conf` onto the server.** It is a
reviewable reference. The live file also proxies the main site to
`localhost:7902`, has no TLS (terminated upstream) and carries locale
redirects. Copying the repo copy over it sends all of `thefinance.ir` to
WordPress.

---

## Step 5 — Rollback triggers

Roll back immediately, without debate, on any of:

- a `noindex` on production
- a wrong canonical, or the CMS host in one
- a missing article body
- **any legacy redirect 404ing, or taking more than one hop**
- `/mag/health` reporting `source: "mock"`, or anything other than
  `redirectSource.reachable === true` **and** `missingKnown.length === 0`
  **and** `missingCompiled.length === 0`. The third is new and is the one that
  bites during a CMS blip rather than after one: a live rule with no compiled
  floor under it simply 404s when the fetch fails.
- **any image 404ing under `/mag/wp-content/uploads/`** — uploads live at the
  root on the CMS, so the proxy must strip the `/mag` prefix

The last two are the ones that look fine from a browser. Everything renders.

**`missingKnown: []` on its own is not a pass.** Until a `magRedirects` fetch
has succeeded in that process, the cache is the compiled-in table, so the probe
compares the seed against itself and the list is empty by construction — the
same empty list you get when everything is fine. The two fields are one gate:
`reachable` says the measurement happened, `missingKnown` says what it found.
`reachable: false` with an empty list is the CMS being down, and is a rollback
trigger in its own right.

---

## What is verified, and what is not

Verified against the real config files, locally:

- the standalone runtime layout the Dockerfile produces — all routes, plus the
  hashed CSS and the IRANYekanX woff2, which is the check that catches the
  `public/` and `.next/static` copies being missed
- both nginx configs with `nginx -t` and then running, against a stand-in
  WordPress on 9080 and the app on 3100
- staging `noindex` present, production absent — in both directions, and again
  after the cutover line was flipped
- the cutover and rollback lines, each with a reload
- the redirect map, preview (401 and 307), revalidation (401 and 200), and the
  canonical pointing at `thefinance.ir` — all through nginx on the staging host

Not verified, and needing the real server:

- that the image builds — Docker Hub base images are unreachable here
- **`source: "wpgraphql"` and real articles** — `wp.thefinance.ir` is blocked,
  so everything above ran on mock data
- preview end to end from wp-admin, and revalidation on a real publish
- the redirect destinations, which came from a database export and have never
  been resolved against the live site
- TLS and certbot
