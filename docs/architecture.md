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

## Deployment principle

Local and staging environments are disposable. Production content is not.
Imports are additive, repeatable, and verified before traffic moves to Next.js.
