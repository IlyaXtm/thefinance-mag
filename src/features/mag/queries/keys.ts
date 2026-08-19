/**
 * SWR cache keys. Centralised so invalidation is predictable and keys can
 * never drift between hooks.
 */

import type {
  ArticleListParams,
  MarketSlug,
  SearchParams,
} from '../types/mag.types';

export const magKeys = {
  articles: (params: ArticleListParams = {}) =>
    ['mag', 'articles', params] as const,
  article: (slug: string) => ['mag', 'article', slug] as const,
  markets: () => ['mag', 'markets'] as const,
  market: (slug: MarketSlug) => ['mag', 'market', slug] as const,
  author: (slug: string) => ['mag', 'author', slug] as const,
  authors: () => ['mag', 'authors'] as const,
  reports: (page: number, perPage: number) =>
    ['mag', 'reports', page, perPage] as const,
  search: (params: SearchParams) => ['mag', 'search', params] as const,
} as const;
