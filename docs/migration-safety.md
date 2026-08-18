# Migration safety contract

These gates apply before any staging import or production cutover.

## Non-destructive rules

1. Production WordPress remains read-only during development and staging.
2. Take verified filesystem and database backups before an import or plugin
   change. Record checksums and test that the database dump can be restored.
3. Never run search/replace directly against production first.
4. Import into a fresh staging database using stable source identifiers so the
   operation is repeatable and does not duplicate content.
5. Preserve original slugs, publication dates, authors, featured images,
   attachments, categories, SEO metadata, and canonical URLs.
6. Build an explicit redirect map only where a URL cannot be preserved. Every
   redirect must be a single-hop 301 to a relevant 200 response.
7. Keep staging protected by authentication and `noindex` throughout QA.
8. Cut over traffic only after reconciliation and rollback rehearsal pass.

## Baseline to reconcile

The public API currently reports:

- 32 posts
- 432 media items
- 3 posts assigned to the existing `اخبار` category

Counts alone are insufficient. The migration manifest must compare every post
by source ID and URL, plus its content hash, publication date, media references,
taxonomy terms, and SEO fields.

## Required access before migration

- Read-only SSH or an equivalent archive of `wp-content`
- Database dump produced from the current WordPress database
- WordPress plugin/version inventory
- Search Console export for `/mag`
- Staging credentials

No production mutation is authorized by this document.
