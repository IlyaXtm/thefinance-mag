# Phase 0 status

Last verified: 2026-08-19.

| Check | Current evidence | Status |
|---|---|---|
| Repository | Public repository exists but began empty | Ready for foundation |
| V1 Rank Math GraphQL SEO | `Post.seo` is absent; `RankMathPostObjectSeo` is absent | Blocked: bridge missing/inactive |
| V2 SEO fields and versions | Public schema cannot expose the expected fields; server access needed for versions | Partial |
| V3 indexability | Production is index/follow; staging returns 401 and `X-Robots-Tag: noindex` | Pass |
| V4 mu-plugin validity | Requires WordPress/server access | Pending |
| V5 content contract | Public schema has no market/contentType/readingTime/whyItMatters fields | New work required |
| V6 routing | `/mag` redirects to `http://thefinance.ir/mag/`; `/mag/` is classic WordPress | Defect recorded |
| V7 design tokens | Target is `v1` navy dark; exact redesign token identifiers still required | Partial |
| V8 Persian font | Requires redesign source and runtime inspection | Pending |
| V9 baseline | Public REST and sitemap expose 32 posts and 432 media items | Partial; Search Console pending |

## Confirmed product decisions

- Target: Dockerized headless WordPress plus Next.js with strong SEO.
- Existing Mag must not be deleted or overwritten.
- News belongs inside Mag and existing news content will be migrated.
- Initial markets are confirmed but the taxonomy must support future terms.
- `whyItMatters` is optional.
- WordPress/server access will be supplied before migration work.

## Public production observations

- WordPress version disclosed by HTML: 7.0.4.
- WPGraphQL endpoint: `https://thefinance.ir/mag/graphql`.
- Rank Math sitemap: `https://thefinance.ir/mag/sitemap_index.xml`.
- The main site sitemap currently does not reference the Mag sitemap.
