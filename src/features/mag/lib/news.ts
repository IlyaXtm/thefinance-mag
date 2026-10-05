import type { ArticleSummary, Market } from '../types/mag.types';

/**
 * News by market, for the chip row under «آخرین اخبار بازارهای مالی».
 *
 * Derived from the archive summaries rather than a per-market query: the
 * archive fetch is one cached request that every listing already makes, and
 * it carries both axes an item needs here — content type and primary market.
 * The fetch is capped at the newest 100 posts; news is the newest content by
 * construction (about two a day), so a news filter never reaches the cap's
 * edge in practice.
 */

/**
 * The team's copy, 2026-10-05 — the news page's h1 and one-line promise. Here
 * and not in the page: Next rejects named exports a page does not define, and
 * `/news/<market>` reuses the promise.
 */
export const NEWS_TITLE = 'آخرین اخبار بازارهای مالی';
export const NEWS_SUBTITLE =
  'مهم‌ترین اخبار بورس، ارز، طلا، فارکس، کریپتو و اقتصاد جهانی؛ سریع، خلاصه و به‌روز.';

const isNews = (a: ArticleSummary) => a.contentType.slug === 'news';

/**
 * The markets that have at least one news item, with `count` set to their
 * NEWS count — a chip that leads to an empty list is the empty-section
 * failure, so a market with no news gets no chip.
 */
export function newsMarkets(
  archive: ReadonlyArray<ArticleSummary>,
  markets: ReadonlyArray<Market>,
): Market[] {
  const counts = new Map<string, number>();
  for (const article of archive) {
    if (isNews(article) && article.market) {
      counts.set(article.market.slug, (counts.get(article.market.slug) ?? 0) + 1);
    }
  }

  return markets
    .filter((m) => counts.has(m.slug))
    .map((m) => ({ ...m, count: counts.get(m.slug) ?? 0 }));
}

/** One market's news, newest first. */
export function newsInMarket(
  archive: ReadonlyArray<ArticleSummary>,
  marketSlug: string,
  limit: number,
): ArticleSummary[] {
  return archive
    .filter((a) => isNews(a) && a.market?.slug === marketSlug)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

export interface DayBlock {
  isoDate: string;
  articles: ArticleSummary[];
  /** The whole day's count — the heading shows it even when the day is split. */
  dayTotal: number;
  /** The second half of a day split by the banner: no date heading again. */
  continued: boolean;
}

/**
 * Where the Khabarchi banner goes in the day-grouped feed: «بعد از ۵–۶ خبر اول».
 *
 * At a day boundary when one falls between MIN and MAX items; otherwise the
 * day that would overshoot MAX is split after item MAX, and its second half
 * continues without repeating the date heading. A feed shorter than MIN gets
 * the banner after everything — still in the feed, never above an empty one.
 */
export function placeBanner(
  days: ReadonlyArray<{ isoDate: string; articles: ArticleSummary[] }>,
  min = 5,
  max = 6,
): { before: DayBlock[]; after: DayBlock[] } {
  const before: DayBlock[] = [];
  const after: DayBlock[] = [];
  let shown = 0;
  let placed = false;

  for (const day of days) {
    const block: DayBlock = {
      isoDate: day.isoDate,
      articles: day.articles,
      dayTotal: day.articles.length,
      continued: false,
    };

    if (placed) {
      after.push(block);
    } else if (shown + day.articles.length <= max) {
      before.push(block);
      shown += day.articles.length;
      placed = shown >= min;
    } else {
      const take = max - shown;
      if (take > 0) before.push({ ...block, articles: day.articles.slice(0, take) });
      after.push({ ...block, articles: day.articles.slice(take), continued: take > 0 });
      placed = true;
    }
  }

  return { before, after };
}
