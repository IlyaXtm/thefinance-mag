import type { ContentType, ContentTypeSlug } from '../types/mag.types';

/**
 * The content type taxonomy, as a constant.
 *
 * These are fixed and known — three values that don't change without a code
 * change — so fetching them would be a network round trip for data we already
 * have. Markets are different: their terms and counts come from WordPress and
 * grow as content is tagged.
 *
 * `news` is included: an RSS automation publishes roughly two items a day and
 * they are meant to be indexed.
 *
 * Order is not alphabetical and is not arbitrary — it is the priority order
 * used when an article carries several categories. See CATEGORY_TO_TYPE below.
 */
export const CONTENT_TYPES: ContentType[] = [
  { slug: 'news', name: 'اخبار' },
  { slug: 'analysis', name: 'تحلیل' },
  { slug: 'report', name: 'گزارش' },
  { slug: 'education', name: 'آموزش' },
];

/**
 * WordPress category slug → content type.
 *
 * WHY THIS MAPPING EXISTS.
 *
 * The category counts don't add up to the article count: 27 + 26 + 3 + 2 + 1
 * against 32 published posts. Articles carry roughly two categories each,
 * because «مقالات» has been used as a general tag rather than a type — most
 * educational pieces are filed under both «آموزش» and «مقالات».
 *
 * The frontend needs exactly one content type per article, so picking "the
 * first category" would be non-deterministic: GraphQL guarantees no ordering,
 * and an article's type could silently change after an unrelated edit.
 *
 * Two categories are mapped to null and dropped:
 *   «مقالات» — a catch-all tag, not a type
 *   «اینچارت» — one article, a product name, not a type
 */
const CATEGORY_TO_TYPE: Record<string, ContentTypeSlug | null> = {
  news: 'news',
  analysis: 'analysis',
  report: 'report',
  education: 'education',
  articles: null,
  inchart: null,
};

/**
 * Resolve one content type from an article's categories.
 *
 * Priority order is CONTENT_TYPES order, and it is deliberate:
 *
 *   news first — a translated news item also tagged «تحلیل» is still news.
 *   Treating it as analysis would give it Article schema and the wrong
 *   freshness signal.
 *
 *   education last as the fallback — 26 of 32 articles sit in «مقالات», and
 *   the archive is overwhelmingly educational. Defaulting to analysis instead
 *   would mislabel dozens of tutorials.
 *
 * This runs entirely in the mapper, so the WordPress category cleanup can
 * happen later without any code change: once «مقالات» is emptied and «گزارش»
 * exists, this function returns the same answers.
 */
export function resolveContentType(categorySlugs: string[]): ContentType {
  const mapped = categorySlugs
    .map((slug) => CATEGORY_TO_TYPE[slug])
    .filter((type): type is ContentTypeSlug => Boolean(type));

  const match = CONTENT_TYPES.find((type) => mapped.includes(type.slug));

  return match ?? { slug: 'education', name: 'آموزش' };
}

export function findContentType(slug: string): ContentType | undefined {
  return CONTENT_TYPES.find((t) => t.slug === slug);
}
