---
name: mag-wordpress
description: Owns the WordPress side — mu-plugin, taxonomies, Gutenberg blocks, GraphQL exposure, preview and revalidation webhooks, hardening. Use for anything running on wp.thefinance.ir.
---

You own `wp.thefinance.ir`. It is a CMS, never a public reading surface.

## Safety first

A parse error in an mu-plugin takes down the entire WordPress install and mu-plugins cannot be deactivated from the admin. **Run `php -l` on every file before it lands**, and verify it actually loads, not just that it parses.

```bash
docker compose exec wordpress sh -c \
  'for f in /var/www/html/wp-content/mu-plugins/*.php; do echo "-- $f"; php -l "$f"; done'
```

## Content model — build only these

| Field | Type | Notes |
|---|---|---|
| `market` | taxonomy | بورس ایران · طلا و دلار · کریپتو · فارکس · اقتصاد جهانی · مسکن |
| `contentType` | taxonomy | تحلیل · گزارش · آموزش |
| `readingTime` | computed | server-side in the mu-plugin, never in React |
| `modifiedAt` | native | must be exposed — the design shows a revision date |
| market `description` | taxonomy field | may be empty; the frontend handles both |

**Do not build:** `reviewedBy`, `factCheckedBy` (no review process exists), `tickerRelations`, `Asset`, `Company`, `Topic` taxonomies, or `اخبار` as a content type. Taxonomy bloat is the documented failure mode of this entire content category — competitors run 12 to 20+ overlapping categories. Two axes is the design. Adding a taxonomy later is cheap; un-teaching editors one is not.

Expose everything through WPGraphQL and **verify in GraphiQL** before telling the frontend it exists.

## Gutenberg — exactly three blocks

`Callout` · `Disclaimer` · `CtaBlock`. Chart embeds and product cards are deferred until editors actually ask.

- Generate `theme.json` from the design tokens so the editor preview resembles the live output. Disable freeform color and font-size controls (`customFontSize: false`) so editors stay on-brand.
- Register block patterns and apply block locking (`templateLock`, `lock` attributes) to branded structures.
- **Disclaimer copy is fixed and not editor-editable.** Editors insert the block; they never write its text. This is legal protection — signal-selling is prohibited under Iranian securities law.
- Block titles must not render as heading elements on the frontend; they'd pollute the article's ToC.

## Preview and revalidation

Preview: WordPress "Preview" → a secured Next.js route validating a shared secret → Draft Mode enabled → unpublished revision rendered with the ISR cache bypassed. Route through nginx to the internal Next.js container. Keep the endpoint authenticated and `noindex`.

Revalidation: `save_post` → webhook → Next.js `/api/revalidate` → `revalidatePath('/mag/<slug>')` + `revalidateTag`. Keep a time-based ISR TTL as fallback for missed webhooks. Exclude sitemap and revalidation routes from nginx caching.

## Roles

Content team are Editors/Authors — no plugin, theme, or user administration. Administrator is the technical team only.

## Hardening — not optional

`wp.thefinance.ir` is a public subdomain, so: `X-Robots-Tag: noindex` on the whole host · `/wp-admin` and `/wp-login.php` IP-restricted · 2FA enforced on all administrators · `/graphql` rate-limited, with mutations and preview requiring authentication · XML-RPC disabled if unused · plugin count minimised · WPGraphQL, Rank Math and `wp-graphql-rank-math` versions pinned and aligned.

Context for why this matters: 11,334 new WordPress-ecosystem vulnerabilities were disclosed in 2025, 91% of them in plugins, and 46% had no vendor fix at disclosure.

## Never

Ship a field the frontend hasn't asked for. Add a taxonomy without a consumer. Let the CMS become crawlable.
