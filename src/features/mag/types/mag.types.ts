/**
 * Mag domain types.
 *
 * Every field here must exist in the WordPress source. Fields that were
 * proposed but deliberately excluded (reviewedBy, factCheckedBy,
 * tickerRelations, source/sourceUrl) are absent by decision, not oversight —
 * see docs/roadmap-review.md C6.
 */

import type { MagSeo } from './mag-seo.types';

/* ------------------------------------------------------------------ */
/* Taxonomies                                                          */
/* ------------------------------------------------------------------ */

/** Market taxonomy slugs. The primary navigation axis. */
export const MARKET_SLUGS = [
  'tse',
  'gold-usd',
  'crypto',
  'forex',
  'global',
  'housing',
] as const;

export type MarketSlug = (typeof MARKET_SLUGS)[number];

export interface Market {
  slug: MarketSlug;
  /** Persian display name, e.g. «بورس ایران». */
  name: string;
  /**
   * One-line editorial description shown on the archive header.
   * Taxonomy field — may be empty; the archive renders correctly without it.
   */
  description: string | null;
  /** Published article count. Null when not requested. */
  count: number | null;
}

/**
 * Content type taxonomy.
 *
 * `news` was originally excluded pending the Mag/Khabarchi boundary decision.
 * It is now included: an RSS automation publishes roughly two news items a day
 * and they are meant to be indexed, so the type exists whether the frontend
 * models it or not.
 *
 * News is treated differently downstream in two places that matter:
 *   - schema is NewsArticle, not Article — publication date is the primary
 *     signal for translated news, whereas evergreen education leans on the
 *     revision date
 *   - the landing page keeps news in its own rail. At two items a day, a
 *     date-sorted feed buries the human-written educational archive within
 *     about two months.
 */
export const CONTENT_TYPE_SLUGS = ['analysis', 'report', 'education', 'news'] as const;

export type ContentTypeSlug = (typeof CONTENT_TYPE_SLUGS)[number];

export interface ContentType {
  slug: ContentTypeSlug;
  /** Persian display name: تحلیل · گزارش · آموزش · اخبار */
  name: string;
}

/* ------------------------------------------------------------------ */
/* Media & people                                                      */
/* ------------------------------------------------------------------ */

export interface MagImage {
  url: string;
  /** Real alt text. Never an empty string for content images. */
  alt: string;
  width: number;
  height: number;
}

export interface Author {
  slug: string;
  name: string;
  /**
   * Factual role, e.g. «تحلیل‌گر بازار سرمایه».
   * Never a superlative claim — brand constraint.
   */
  role: string | null;
  bio: string | null;
  avatar: MagImage | null;
  /** Null when not requested. */
  articleCount: number | null;
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

/**
 * Card-shaped article. What listing, grid, archive, author and search
 * responses return. Deliberately has no `excerpt`: the design shows no
 * excerpt on cards, and the live site's excerpts are auto-truncated
 * mid-sentence anyway.
 */
export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  featuredImage: MagImage | null;
  /**
   * Primary market — shown as the card chip.
   *
   * NULL for most of the archive. Verified in Phase 0: roughly 60% of posts
   * are general technical-analysis education (Ichimoku, OBV, ATR…) that
   * belongs to no single market. Consumers omit the chip and reflow; they must
   * never render a placeholder.
   */
  market: Market | null;
  contentType: ContentType;
  /** Minutes. Computed server-side in the mu-plugin, never in React. */
  readingTime: number;
  /** ISO 8601. */
  publishedAt: string;
  /**
   * ISO 8601, or null when never revised.
   *
   * When present it differs from publishedAt, and the meta row shows both —
   * «منتشر: … · بازبینی: …». That is the honest freshness signal for evergreen
   * content, where a relative date would make a still-valid article look stale.
   */
  modifiedAt: string | null;
  author: Author;
  /**
   * The editor-written excerpt, or null.
   *
   * `excerpt(format: RAW)` returns ONLY the manual field — WordPress's
   * auto-generated summary is what `RENDERED` would give, and that is the
   * mid-sentence truncation `decisions.md` rejected as a dek source. So a
   * non-empty value here is something a person actually wrote.
   *
   * Standard WPGraphQL, present on every schema, so unlike `outlineHeadings`
   * it carries no plugin-version dependency.
   */
  excerpt: string | null;
  /**
   * The article's own H2 headings, server-derived.
   * Feeds both the featured card's «در این مقاله» block and the article ToC —
   * one source, two consumers, so they can never disagree.
   * Fewer than 2 entries → consumers omit the block entirely.
   */
  outline: string[];
}

/** Full article. Adds body content, secondary markets and SEO. */
export interface Article extends ArticleSummary {
  /** Rendered HTML body from Gutenberg. */
  content: string;
  /**
   * Markets this piece touches beyond the primary one, for the
   * RelatedMarkets row. Empty array → the row is omitted entirely.
   * Navigation only: no prices, no percentages, no live data.
   */
  secondaryMarkets: Market[];
  seo: MagSeo;
}

/* ------------------------------------------------------------------ */
/* Reports & monthlies                                                 */
/* ------------------------------------------------------------------ */

export interface Report {
  id: string;
  slug: string;
  title: string;
  /** 3:4 cover — a distinct shape from the 16:9 article grid. */
  cover: MagImage | null;
  /** e.g. «شماره ۱۲» or «بهار ۱۴۰۵». */
  issueLabel: string;
  publishedAt: string;
  /** Absolute or relative URL to the artifact itself, when one exists. */
  fileUrl: string | null;
}

/* ------------------------------------------------------------------ */
/* Requests & responses                                                */
/* ------------------------------------------------------------------ */

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ArticleListParams {
  page?: number;
  perPage?: number;
  market?: MarketSlug;
  contentType?: ContentTypeSlug;
  authorSlug?: string;
  /** Excluded from results — used by RelatedArticles. */
  excludeSlug?: string;
}

export interface SearchParams {
  query: string;
  page?: number;
  perPage?: number;
}

export interface SearchResult extends Paginated<ArticleSummary> {
  /** Echoed back so the results header can render it safely. */
  query: string;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class MagNotFoundError extends Error {
  readonly slug: string;
  constructor(slug: string) {
    super(`Mag resource not found: ${slug}`);
    this.name = 'MagNotFoundError';
    this.slug = slug;
  }
}

export class MagFetchError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'MagFetchError';
    this.status = status;
  }
}
