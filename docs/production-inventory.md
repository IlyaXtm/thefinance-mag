# Production content inventory

Last read-only snapshot: 2026-08-19 (Asia/Tehran).

The inventory is generated with `npm run inventory:production`. It sends only
HTTP `GET` requests to the public WordPress REST API and writes the detailed,
content-bearing manifest under the gitignored `artifacts/production-inventory/`
directory.

## Current public baseline

| Resource | Public API result |
|---|---:|
| Published posts | 32 |
| Published pages | 3 |
| Media total reported by REST headers | 432 |
| Unique public media records retrieved | 431 |
| Categories | 6 |
| Tags | 59 |
| Public authors | 6 |

The one-record media discrepancy is preserved as a failed reconciliation check.
It must be resolved against the database and uploads archive before migration;
the missing record is not guessed or silently discarded.

## Integrity findings

- All 32 post links remain under `https://thefinance.ir/mag/`.
- No duplicate post slug was found.
- Every featured-media ID used by a post resolves through the public API.
- 14 featured images have empty alt text and need an editorial accessibility
  pass.
- Media IDs `1383` and `1384` expose the same source URL. Both records must be
  preserved until the database confirms whether they are intentional aliases.

## Existing classification

The current categories are overlapping and cannot be treated as the new market
taxonomy:

| Category slug | Post assignments |
|---|---:|
| `articles` | 26 |
| `education` | 27 |
| `news` | 3 |
| `analysis` | 2 |
| `inchart` | 1 |

Assignment counts exceed 32 because a post can carry more than one category.
The migration will preserve these original terms and add `mag_market` and
`mag_content_type`; it will not rename or repurpose the existing categories.
Market assignment needs an explicit mapping/review pass because production has
no equivalent market taxonomy.

## SEO coverage visible through REST

| Rank Math value | Posts with a public value |
|---|---:|
| SEO title | 16 / 32 |
| SEO description | 22 / 32 |
| Focus keyword | 26 / 32 |
| Canonical URL | 0 / 32 |
| Robots directives | 0 / 32 |

The zero values for canonical and robots mean those fields are not exposed by
the public endpoint, not that they are absent in the database. A database or
authenticated server export is required before they can pass reconciliation.

## Manifest coverage

Each manifest records source IDs, slugs, URLs, publication and modification
dates, author IDs, taxonomy IDs, featured-media IDs, rendered content, a SHA-256
content hash, public Rank Math values, media paths/dimensions/alt text, and a
checksum for the manifest payload.

Before any import, the remaining required inputs are:

1. Database dump from the existing WordPress instance.
2. Verified archive of `wp-content/uploads`.
3. Installed plugin/version inventory from the server.
4. Search Console export for URLs under `/mag`.

Production remains the source of truth until those inputs reconcile with this
public baseline.
