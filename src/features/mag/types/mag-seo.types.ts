/**
 * SEO types mapping the `wp-graphql-rank-math` shape.
 *
 * ✅ VERIFIED against the installed plugin on wp.thefinance.ir (2026-08-19).
 *
 * `seo.__typename` is `RankMathPostObjectSeo` — the node-specific types from
 * the newer plugin versions.
 *
 * `robots` is a `[String]` list queried as a leaf with no sub-selection.
 * Live response:
 *   ["index","follow","max-snippet:-1","max-video-preview:-1",
 *    "max-image-preview:large"]
 *
 * `canonicalUrl` currently returns the public host already
 * (https://thefinance.ir/mag/<slug>/) because WordPress `siteurl` is set
 * there. That is deliberate — it means canonicals are correct with no
 * rewriting. The rewrite in the API layer stays as a guard: if `siteurl` ever
 * moves to the CMS host, it catches the regression instead of letting
 * wp.thefinance.ir reach a <link rel="canonical">.
 */

export interface SeoBreadcrumb {
  text: string;
  url: string;
  isHidden: boolean;
}

export interface SeoOpenGraph {
  title: string | null;
  description: string | null;
  url: string | null;
  type: string | null;
  locale: string | null;
  imageUrl: string | null;
  twitterCard: string | null;
}

export interface MagSeo {
  title: string | null;
  description: string | null;
  /**
   * ⚠️ Always rewritten to the frontend host before use.
   * Rank Math returns WordPress URLs (wp.thefinance.ir). Emitting those as
   * canonical would index the CMS and create duplicate content — the most
   * common headless-migration failure.
   */
  canonicalUrl: string | null;
  /** See the file-level warning. Verify the shape before trusting this. */
  robots: string[];
  breadcrumbs: SeoBreadcrumb[];
  /** Raw JSON-LD string from Rank Math. Parsed, never injected as HTML. */
  jsonLdRaw: string | null;
  openGraph: SeoOpenGraph | null;
}
