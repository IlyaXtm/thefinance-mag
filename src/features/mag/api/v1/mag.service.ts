/**
 * The ONLY source-switch point for Mag data.
 *
 * Everything else — server components, SWR hooks, route handlers — imports
 * from here. Switching mock ↔ real is an env change, never a refactor.
 *
 *   NEXT_PUBLIC_USE_MOCK=true   → mock
 *   NEXT_PUBLIC_USE_MOCK=false  → real WPGraphQL
 *
 * ── On server components vs SWR ─────────────────────────────────────
 * `layout.md` says UI renders from `use-*.swr.ts` only. The SEO decision
 * says indexable content must be server-rendered, because SWR hands crawlers
 * an empty shell. Both are right in their own scope, so:
 *
 *   • Server components import THIS FILE directly for indexable content
 *     (listing, article, archive, author, reports).
 *   • SWR hooks wrap this file for client-interactive views only
 *     (search-as-you-type, client-side pagination).
 *
 * The service stays the single switch point either way, which is what the
 * convention is actually protecting.
 */

import * as real from './mag.api';
import * as mock from './mag.mock';

const USE_MOCK = (process.env.USE_MOCK ?? process.env.NEXT_PUBLIC_USE_MOCK) === 'true';

/**
 * Structural check: both modules must satisfy the same contract.
 * If a signature drifts, this fails at compile time rather than at runtime.
 */
type MagSource = {
  getArticles: typeof mock.getArticles;
  getMarketArticles: typeof mock.getMarketArticles;
  getAllSummaries: typeof mock.getAllSummaries;
  magArchiveOverflowed: typeof mock.magArchiveOverflowed;
  getArticle: typeof mock.getArticle;
  getPreviewArticle: typeof mock.getPreviewArticle;
  getMarkets: typeof mock.getMarkets;
  getMarket: typeof mock.getMarket;
  getAuthor: typeof mock.getAuthor;
  getAuthors: typeof mock.getAuthors;
  getReports: typeof mock.getReports;
  searchArticles: typeof mock.searchArticles;
};

const mockSource: MagSource = mock;
const realSource: MagSource = real;

const source: MagSource = USE_MOCK ? mockSource : realSource;

export const getArticles: MagSource['getArticles'] = (params) =>
  source.getArticles(params);

export const getArticle: MagSource['getArticle'] = (slug) =>
  source.getArticle(slug);

/**
 * Draft preview. Goes through the same switch as everything else, so preview
 * is exercisable against the mock rather than only against a live CMS.
 */
export const getPreviewArticle: MagSource['getPreviewArticle'] = (id, secret) =>
  source.getPreviewArticle(id, secret);

export const getMarkets: MagSource['getMarkets'] = () => source.getMarkets();

export const getMarket: MagSource['getMarket'] = (slug) =>
  source.getMarket(slug);

export const getAuthor: MagSource['getAuthor'] = (slug) =>
  source.getAuthor(slug);

export const getAuthors: MagSource['getAuthors'] = () => source.getAuthors();

export const getReports: MagSource['getReports'] = (page, perPage) =>
  source.getReports(page, perPage);

export const searchArticles: MagSource['searchArticles'] = (params) =>
  source.searchArticles(params);

/** Useful in dev banners and diagnostics. */
/** A market's list, count and pagination from one source — see mag.api.ts. */
export const getMarketArticles: MagSource['getMarketArticles'] = (slug, page, perPage) =>
  source.getMarketArticles(slug, page, perPage);

export const getAllSummaries: MagSource['getAllSummaries'] = () => source.getAllSummaries();

/** True when the archive outgrew the single fetch market pages rely on. */
export const magArchiveOverflowed: MagSource['magArchiveOverflowed'] = () =>
  source.magArchiveOverflowed();

export const magDataSource = USE_MOCK ? 'mock' : 'wpgraphql';
