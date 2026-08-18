# Architecture

## Decision

The public Mag uses Next.js under `/mag`. WordPress runs as a Dockerized,
headless editorial backend and exposes content through WPGraphQL.

Production content remains the source of truth until a staged migration passes
the reconciliation gates in `migration-safety.md`.

## Boundaries

- WordPress owns posts, media references, authors, editorial taxonomies, and
  optional editorial fields.
- Next.js owns rendering, metadata, structured data, sitemaps, redirects, and
  caching/revalidation.
- The `market` taxonomy is extensible. Initial terms are بورس ایران، طلا و
  دلار، کریپتو، فارکس، اقتصاد جهانی، and مسکن.
- Content types initially include تحلیل، گزارش، آموزش، and اخبار.
- `whyItMatters` is optional plain text and must never create an empty UI row.
- Existing `/mag/<slug>/` URLs are preserved wherever technically possible.

## WordPress GraphQL contract

Posts expose:

- `markets` — extensible `mag_market` taxonomy connection
- `magContentTypes` — تحلیل، گزارش، آموزش، or اخبار
- `readingTime` — non-null server-computed minutes
- `whyItMatters` — nullable string, maximum 120 characters
- `seo` — non-null title, canonical URL, optional description, and robots values;
  explicit Rank Math post metadata is preferred and safe WordPress fallbacks are
  used when it is absent

The SEO field is owned by the Mag MU plugin. The available pre-release Rank Math
GraphQL bridge was runtime-tested against the pinned stack and is not activated
because its resolvers fail. This keeps the public contract small and testable.

## Deployment principle

Local and staging environments are disposable. Production content is not.
Imports are additive, repeatable, and verified before traffic moves to Next.js.
