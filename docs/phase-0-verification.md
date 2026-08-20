# Mag — Phase 0: Staging Verification Runbook

**Goal:** confirm eight assumptions before a single component is written. Everything downstream (SEO layer types, taxonomies, components, sitemap) depends on these answers being facts rather than guesses.

**How to use:** run each block, paste the output into the results table at the bottom, send it back. Estimated time: half a day.

> Container names below are placeholders — replace `wordpress`, `mag-next`, and `nginx` with the actual service names in your compose file (`docker compose ps` to list them).

---

## V1 — `robots` field shape from `wp-graphql-rank-math`

**Why it matters:** the SEO layer's TypeScript types and the `<meta name="robots">` output both depend on this. Research says it's a `[String]` list (e.g. `["index","follow","max-image-preview:large"]`), but the installed version wasn't confirmed.

**The test:** query `robots` as a **leaf field with no sub-selection**. If it returns an array of strings → it's `[String]`, assumption confirmed. If GraphQL errors with "must have a selection of subfields" → it's an object type and the SEO layer needs rewriting.

Run in GraphiQL (`/wp-admin/admin.php?page=graphiql-ide`), or via curl:

```bash
curl -s https://<wp-host>/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first:1){ nodes { title seo { __typename title description canonicalUrl robots focusKeywords breadcrumbs { text url isHidden } jsonLd { raw } openGraph { title description url type locale twitterMeta { title description card } } } } } }"}' \
  | jq .
```

**Record:** the exact JSON value of `robots`, and the value of `seo.__typename`.

Then confirm the schema directly:

```bash
curl -s https://<wp-host>/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __type(name:\"RankMathPostObjectSeo\"){ name fields { name type { kind name ofType { kind name ofType { kind name } } } } } }"}' \
  | jq '.data.__type.fields[] | select(.name=="robots")'
```

If `RankMathPostObjectSeo` returns null, the installed version predates the v0.3.0 type narrowing — introspect `RankMathSeo` instead and note that in the results.

---

## V2 — Rank Math field names & plugin versions

**Why it matters:** two field names in the existing SEO layer were written from memory. Any that don't resolve are silent nulls in production metadata.

```bash
docker compose exec wordpress wp plugin list --allow-root --format=table \
  --fields=name,status,version
```

**Record versions for:** `wp-graphql`, `wp-graphql-rank-math`, `seo-by-rank-math`, and (if present) `wp-graphql-acf`.

Then confirm every field the SEO layer consumes actually resolves — the V1 query above already covers `title`, `description`, `canonicalUrl`, `robots`, `focusKeywords`, `breadcrumbs`, `jsonLd`, `openGraph`, `twitterMeta`. Add `fullHead` separately since it's heavy:

```bash
curl -s https://<wp-host>/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(first:1){ nodes { seo { fullHead } } } }"}' | jq '.errors, (.data.posts.nodes[0].seo.fullHead | length)'
```

**Record:** any field returning an error or null. Cross-check the list against the field names hardcoded in the 18-file SEO layer.

---

## V3 — robots.txt and indexability of `/mag`

**Why it matters:** a leftover staging `Disallow` or `X-Robots-Tag` is the single most damaging and most common launch mistake. It silently removes the section from Google.

```bash
# 1. Production robots.txt — look for any Disallow matching /mag
curl -s https://thefinance.ir/robots.txt

# 2. Response headers on the section — X-Robots-Tag must be absent
curl -sI https://thefinance.ir/mag/ | grep -i 'x-robots-tag\|^HTTP'

# 3. Rendered meta robots in the HTML
curl -s https://thefinance.ir/mag/ | grep -io '<meta[^>]*name="robots"[^>]*>'

# 4. Same three checks on staging — confirm staging IS noindexed
curl -s https://new.thefinance.ir/robots.txt
curl -sI https://new.thefinance.ir/mag/ | grep -i 'x-robots-tag'
```

**Record:** production must have **no** block on `/mag` and **no** `noindex`. Staging must have both. If they're reversed, that's the bug.

Also confirm in Search Console → URL Inspection on a live `/mag/<slug>` URL. That's authoritative; curl is not.

---

## V4 — mu-plugin PHP validity

**Why it matters:** a fatal parse error in an mu-plugin takes down the whole WordPress install, and mu-plugins can't be deactivated from the admin.

```bash
# Syntax check every mu-plugin
docker compose exec wordpress sh -c \
  'for f in /var/www/html/wp-content/mu-plugins/*.php; do echo "-- $f"; php -l "$f"; done'

# Confirm it actually loaded (not just parses)
docker compose exec wordpress wp eval \
  'echo function_exists("<a_function_your_mu_plugin_defines>") ? "loaded" : "NOT loaded";' --allow-root

# Check for runtime warnings
docker compose exec wordpress tail -n 50 /var/www/html/wp-content/debug.log 2>/dev/null || echo "no debug.log"
```

**Record:** `No syntax errors detected` for each file, plus load confirmation.

---

## V5 — Do the Mag content fields already exist?

**Why it matters:** the listing spec needs `market`, `contentType`, `readingTime`, `whyItMatters`. None are standard WordPress. Per the standing rule — confirm the data exists before building the feature — this decides how much Phase 2 work is actually WordPress-side.

```bash
# Registered taxonomies
docker compose exec wordpress wp taxonomy list --allow-root --format=table

# Registered post types (are reports/monthlies a CPT?)
docker compose exec wordpress wp post-type list --allow-root --format=table

# Is ACF present and what field groups exist?
docker compose exec wordpress wp post list --post_type=acf-field-group \
  --fields=post_title,post_status --allow-root --format=table 2>/dev/null || echo "ACF not installed"
```

Then check whether anything is already exposed to GraphQL:

```bash
curl -s https://<wp-host>/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ __schema { types { name } } }"}' \
  | jq -r '.data.__schema.types[].name' | grep -iE 'market|categor|tag|report|monthly'
```

**Record:** which of the four fields exist, which need creating, and whether reports/monthlies are a CPT or live elsewhere.

---

## V6 — Subpath routing and asset resolution

**Why it matters:** `basePath` is inlined at build time and can't be changed without a rebuild. Asset 404s under a subpath are a classic failure.

```bash
# basePath / assetPrefix in the Next config
grep -nE 'basePath|assetPrefix|skipTrailingSlashRedirect' next.config.*

# nginx location blocks routing to the Next container
docker compose exec nginx sh -c 'grep -rnE "location .*(/mag|_next)" /etc/nginx/'

# Redirect-loop check: both must resolve in one hop, not bounce
curl -sIL https://thefinance.ir/mag  | grep -E '^HTTP|^[Ll]ocation'
curl -sIL https://thefinance.ir/mag/ | grep -E '^HTTP|^[Ll]ocation'

# Static assets must be 200, not 404
curl -s https://thefinance.ir/mag/ | grep -o '/_next/static/[^"]*' | head -3
# then curl -sI each of those paths
```

**Record:** number of redirect hops for `/mag` and `/mag/`, and the status code of at least one `_next/static` asset.

---

## V7 — Design tokens across all three themes

**Why it matters:** the listing spec is written against semantic roles. If any role is undefined in one theme, that theme breaks — and light theme is the usual casualty.

In the redesign repo (`IlyaXtm/thefinance-front-redesign`, branch `new`):

```bash
# Find the token definitions
grep -rn --include=*.{css,scss,ts,js,json} -E '(v1|v2).*(dark|light|navy)' src/ | head -40

# Which semantic roles exist?
grep -rhoE '\-\-[a-z0-9-]*(surface|bg|background|text|border|accent|focus)[a-z0-9-]*' src/ \
  | sort -u
```

Map the spec's roles → real token names and confirm all three themes define each:

| Spec role | Real token | v1 navy dark | v2 dark | v2 light |
|---|---|---|---|---|
| `surface` | | | | |
| `surface-raised` | | | | |
| `border-subtle` | | | | |
| `text-primary` | | | | |
| `text-secondary` | | | | |
| `text-muted` | | | | |
| `accent` | | | | |
| `accent-contrast` | | | | |
| focus ring | | | | |

**Also record:** the radius scale and the gap/spacing scale token names, so the components don't invent values.

---

## V8 — Persian font pipeline

**Why it matters:** the font is on the LCP path, and Google Fonts / foreign CDNs are unreliable or blocked from Iran.

```bash
# What font is configured, and is it self-hosted?
grep -rn --include=*.{ts,tsx,css,scss} -iE 'next/font|@font-face|fonts.googleapis|fontFamily' src/ | head -20

# Are the font files in the repo?
find . -type f \( -name '*.woff2' -o -name '*.woff' \) -not -path './node_modules/*'

# Any external font request at runtime? (should return nothing)
curl -s https://new.thefinance.ir/mag/ | grep -oE 'https?://[^"]*\.(woff2?|css)[^"]*' \
  | grep -viE 'thefinance|new\.thefinance'
```

**Record:** font family name, whether a subset build exists, file size of the woff2, and confirmation of zero external font requests.

---

## V9 — SEO baseline (only if `/mag` already has indexed content)

**Why it matters:** you can't detect a regression without a "before" number.

- Search Console → Performance → filter by page contains `/mag` → export the last 3 months (clicks, impressions, top pages, top queries). Save it dated.
- Search Console → Pages → record the count of indexed URLs under `/mag`.
- Export a full list of current live `/mag` URLs (from the WordPress sitemap or a crawl). This becomes the source for the 301 map if URLs change.

**Record:** indexed URL count, and whether the URL structure will change (`/mag/<slug>` staying identical means no redirect map is needed — that's the ideal outcome).

---

## Results table

Fill and send back:

| # | Check | Result | Blocks |
|---|---|---|---|
| V1 | `robots` shape + `seo.__typename` | | SEO layer types |
| V2 | Plugin versions; any failing field | | SEO layer |
| V3 | `/mag` crawlable in prod; staging noindexed | | Launch |
| V4 | mu-plugin `php -l` + load | | Everything WP-side |
| V5 | Which of market/contentType/readingTime/whyItMatters exist | | Components + taxonomy work |
| V6 | Redirect hops; `_next` asset status | | Deployment |
| V7 | Token map filled; all 3 themes complete | | Components |
| V8 | Font self-hosted + subset; zero external requests | | LCP |
| V9 | Indexed count; URL structure changing? | | Migration plan |

---

## What unblocks after this

- **V1 + V2 green** → finish the SEO layer types and the sitemap route.
- **V5 answered** → write the taxonomy/ACF registration and the mu-plugin additions.
- **V7 filled** → components can be built; the listing spec's semantic roles get replaced with real token names.
- **V3 + V9 green** → the migration plan is either trivial (structure unchanged) or needs a 301 map.

Three product questions still need your answer and don't depend on any of the above:

1. Does Mag carry `اخبار` as a content type, or does Khabarchi own news entirely?
2. Final market taxonomy list (proposed: بورس ایران، طلا و دلار، کریپتو، فارکس، اقتصاد جهانی، مسکن).
3. Is the content team committing to writing «چرا مهم است» per lead article — yes or no?
