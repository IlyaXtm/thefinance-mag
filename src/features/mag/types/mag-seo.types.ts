/**
 * SEO types mapping the `wp-graphql-rank-math` shape.
 *
 * ⚠️ UNVERIFIED AGAINST THE INSTALLED PLUGIN VERSION.
 *
 * `robots` is typed as `string[]` on the expectation that the plugin exposes
 * it as a `[String]` list queried as a leaf with no sub-selection, e.g.
 * ["index", "follow", "max-image-preview:large"].
 *
 * Confirm in GraphiQL before relying on this (build-plan step S0). If the
 * query errors with "must have a selection of subfields", it is an object
 * type and this file needs rewriting.
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
