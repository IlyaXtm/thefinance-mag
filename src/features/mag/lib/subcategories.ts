import type { ArticleSummary, ContentTypeSlug, Market } from '../types/mag.types';

/**
 * Markets, as readers see them since 2026-10-07: SUB-CATEGORIES of آموزش and
 * اخبار, not a section of their own.
 *
 * The team: «اصلا مارکت رو نمیخوان؛ خودش و زیرمجموعه‌هاش باید زیرمجموعه‌ی
 * کتگوری بشن». So `/market/<slug>` is gone (301, see `marketRedirectTarget`),
 * the header has no «بازارها» menu, and every market link points into a
 * section: آموزش › کریپتو is `/category/education/crypto`, اخبار › کریپتو is
 * `/news/crypto`. Both pages already existed as the chips under each section.
 *
 * WordPress is unchanged: editors still tick one market per post, and the
 * market's name is still the sub-category's name. Two axes in the data, one
 * tree on the page — the same move `cardCategory` made for the v4 cards.
 */

/** The two sections that have sub-categories. `report` has no route; its
    posts (none today) are listed under آموزش, like every non-news post. */
export type SubcategoryParent = 'education' | 'news';

/** The sections, in the header's order (lib/nav.ts SECTION_NAV). */
export const SUBCATEGORY_PARENTS: ReadonlyArray<{
  key: SubcategoryParent;
  name: string;
  href: string;
}> = [
  { key: 'news', name: 'اخبار', href: '/news' },
  { key: 'education', name: 'آموزش', href: '/category/education' },
];

export function parentOf(type: ContentTypeSlug): SubcategoryParent {
  return type === 'news' ? 'news' : 'education';
}

export function subcategoryHref(parent: SubcategoryParent, marketSlug: string): string {
  return parent === 'news' ? `/news/${marketSlug}` : `/category/education/${marketSlug}`;
}

/** The markets that have posts under `parent` — a sub-category with nothing
    in it is a link to an empty page. */
export function subcategoriesOf(markets: ReadonlyArray<Market>, parent: SubcategoryParent): Market[] {
  return markets.filter((m) => (m.byType?.[parent] ?? 0) > 0);
}

/** `count` and `byType` for one market, derived from the summaries — the same
    array the archives render, for the reason `getMarkets` gives. */
export function marketCounts(
  archive: ReadonlyArray<ArticleSummary>,
  slug: string,
): Pick<Market, 'count' | 'byType'> {
  const byType: Partial<Record<ContentTypeSlug, number>> = {};
  let count = 0;
  for (const article of archive) {
    if (article.market?.slug !== slug) continue;
    count += 1;
    byType[article.contentType.slug] = (byType[article.contentType.slug] ?? 0) + 1;
  }
  return { count, byType };
}

/**
 * Markets merged by the team (2026-10-06): «بورس ایران» and «طلا و دلار»
 * become one «بازار ایران», which keeps the `tse` slug. The posts move in
 * wp-admin. Applied only once `gold-usd` HAS NO LESSONS (emptyLessonsFallback):
 * until the content team has moved them, its lessons page is real and must
 * stay reachable — sending it to `tse` early would hide twenty posts.
 */
const MERGED_MARKETS: Readonly<Record<string, string>> = { 'gold-usd': 'tse' };

/**
 * Where a lessons URL for a market with NO lessons should send the reader —
 * or null when the key is not a market at all (a real 404).
 *
 *   merged away (gold-usd, once its posts are in tse)  → the merged market
 *   a market with news but no lessons (housing)        → its news
 *   a market with nothing                              → آموزش
 *
 * This is what keeps `marketRedirectTarget`'s one hop from landing on a 404.
 */
export function emptyLessonsFallback(
  markets: ReadonlyArray<Market>,
  slug: string,
): string | null {
  const merged = MERGED_MARKETS[slug];
  if (merged) return subcategoryHref('education', merged);
  const market = markets.find((m) => m.slug === slug);
  if (!market) return null;
  return (market.byType?.news ?? 0) > 0 ? subcategoryHref('news', slug) : '/category/education';
}

/**
 * Where a retired `/market/<slug>` URL now lives: that market's lessons.
 * Lessons, not news, because they are the evergreen pages a market archive was
 * ranking with — the news for the same market stays one chip away.
 *
 * One hop for every market with lessons. A merged-away or lesson-less market
 * takes a second (the lessons page forwards it, emptyLessonsFallback) because
 * middleware cannot know a market's counts without a CMS call.
 */
export function marketRedirectTarget(slug: string): string {
  return subcategoryHref('education', slug);
}
