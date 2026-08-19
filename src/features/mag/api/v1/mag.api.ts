/**
 * Real WPGraphQL implementation.
 *
 * Never imported by a page or component. Only `mag.service.ts` imports this.
 *
 * ⚠️ The queries below are written against the EXPECTED schema. Field names
 * and the `robots` shape must be confirmed in GraphiQL (build-plan S0) before
 * this file is trusted. A field name written from memory becomes a silent
 * null in production metadata.
 */

import {
  MagFetchError,
  type Article,
  type ArticleListParams,
  type ArticleSummary,
  type Author,
  type Market,
  type MarketSlug,
  type Paginated,
  type Report,
  type SearchParams,
  type SearchResult,
} from '../../types/mag.types';

const ENDPOINT = process.env.NEXT_PUBLIC_WP_GRAPHQL_ENDPOINT ?? '';

/**
 * The public frontend origin. Canonical URLs are rewritten to this host —
 * Rank Math returns wp.thefinance.ir URLs and emitting those would index the
 * CMS alongside the public site.
 */
const PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://thefinance.ir';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  if (!ENDPOINT) {
    throw new MagFetchError('NEXT_PUBLIC_WP_GRAPHQL_ENDPOINT is not set');
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch (cause) {
    throw new MagFetchError(
      `GraphQL request failed: ${(cause as Error).message}`,
    );
  }

  if (!res.ok) {
    throw new MagFetchError(`GraphQL responded ${res.status}`, res.status);
  }

  const json = (await res.json()) as GraphQLResponse<T>;

  if (json.errors?.length) {
    throw new MagFetchError(
      json.errors.map((e) => e.message).join('; '),
      res.status,
    );
  }
  if (!json.data) {
    throw new MagFetchError('GraphQL response contained no data');
  }
  return json.data;
}

/**
 * Rewrites a WordPress URL to the public frontend host.
 * Applied to every canonical before it reaches a <link rel="canonical">.
 */
export function toPublicUrl(wpUrl: string | null): string | null {
  if (!wpUrl) return null;
  try {
    const parsed = new URL(wpUrl);
    const target = new URL(PUBLIC_ORIGIN);
    parsed.protocol = target.protocol;
    parsed.host = target.host;
    return parsed.toString();
  } catch {
    return wpUrl;
  }
}

/* ------------------------------------------------------------------ */
/* Fragments                                                           */
/* ------------------------------------------------------------------ */

const IMAGE_FIELDS = `
  sourceUrl
  altText
  mediaDetails { width height }
`;

const CARD_FIELDS = `
  id
  slug
  title
  date
  modified
  featuredImage { node { ${IMAGE_FIELDS} } }
  magMeta { readingTime outline }
  markets(first: 1) { nodes { slug name magMarketMeta { description } count } }
  contentTypes(first: 1) { nodes { slug name } }
  author { node { slug name magAuthorMeta { role bio } avatar { url } } }
`;

/* ------------------------------------------------------------------ */
/* Not yet implemented                                                 */
/* ------------------------------------------------------------------ */

/**
 * These throw rather than returning fake data. The scaffolding ships with
 * mocks so UI work can proceed; wiring the real queries happens once the
 * WordPress fields exist and the schema is verified (build-plan S2).
 *
 * Throwing keeps the failure loud. Returning empty arrays would let a broken
 * integration look like an empty state.
 */
function notWired(operation: string): never {
  throw new MagFetchError(
    `mag.api.${operation} is not wired yet — verify the schema (S0) and ` +
      `register the WordPress fields (S2) first. Run with ` +
      `NEXT_PUBLIC_USE_MOCK=true until then.`,
  );
}

export async function getArticles(
  _params: ArticleListParams = {},
): Promise<Paginated<ArticleSummary>> {
  void CARD_FIELDS;
  return notWired('getArticles');
}

export async function getArticle(slug: string): Promise<Article> {
  void slug;
  return notWired('getArticle');
}

export async function getMarkets(): Promise<Market[]> {
  return notWired('getMarkets');
}

export async function getMarket(slug: MarketSlug): Promise<Market> {
  void slug;
  return notWired('getMarket');
}

export async function getAuthor(slug: string): Promise<Author> {
  void slug;
  return notWired('getAuthor');
}

export async function getAuthors(): Promise<Author[]> {
  return notWired('getAuthors');
}

export async function getReports(
  _page = 1,
  _perPage = 12,
): Promise<Paginated<Report>> {
  return notWired('getReports');
}

export async function searchArticles(
  _params: SearchParams,
): Promise<SearchResult> {
  return notWired('searchArticles');
}

/** Exported for the schema-verification script. */
export const __internal = { gql, toPublicUrl };
