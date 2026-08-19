/**
 * Public surface of the Mag feature.
 *
 * Pages and components import from here. Note that `mag.api` and `mag.mock`
 * are deliberately NOT exported — the service is the only way in.
 */

export * from './types/mag.types';
export * from './types/mag-seo.types';
export * from './types/mag-blocks.types';

export {
  getArticles,
  getArticle,
  getMarkets,
  getMarket,
  getAuthor,
  getAuthors,
  getReports,
  searchArticles,
  magDataSource,
} from './api/v1/mag.service';

export { magKeys } from './queries/keys';
export { useMagArticles } from './queries/use-mag-articles.swr';
export { useMagArticle } from './queries/use-mag-article.swr';
export { useMagMarkets } from './queries/use-mag-markets.swr';
export { useMagSearch } from './queries/use-mag-search.swr';
