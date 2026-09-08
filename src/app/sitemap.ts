import type { MetadataRoute } from 'next';
import {
  getArticles,
  getAuthors,
  getCategories,
  getMarkets,
} from '@/features/mag/api/v1/mag.service';
import { magUrl } from '@/features/mag/lib/site';
import { isThinArchive } from '@/features/mag/lib/taxonomy';

/**
 * Sitemap for /mag.
 *
 * Generated in Next.js, NOT proxied from Rank Math.
 *
 * Rank Math's sitemap emits WordPress URLs, which after the headless cutover
 * point at the CMS host. Serving those to Google would invite it to index
 * wp.thefinance.ir — the exact duplicate-content failure the noindex header
 * exists to prevent. Building the sitemap here means every URL is a frontend
 * URL by construction.
 *
 * Search is excluded: those pages are noindex.
 *
 * So are taxonomy archives below the floor in lib/taxonomy.ts — see the note
 * further down.
 */

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, markets, categories, authors] = await Promise.all([
    getArticles({ page: 1, perPage: 500 }),
    getMarkets(),
    getCategories(),
    getAuthors(),
  ]);

  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: magUrl('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: magUrl('/archive'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      /*
        `daily` and above /archive, because it genuinely is: the RSS automation
        files roughly two translated items a day under «اخبار», so this page
        turns over faster than anything else on the site. It was missing here
        while being a real, indexable route — a new section Google would have
        had to find by crawling alone.
      */
      url: magUrl('/news'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: magUrl('/authors'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  for (const article of articles.items) {
    entries.push({
      url: magUrl(`/${article.slug}`),
      /* The revision date when there is one, otherwise publication. This is
         the signal Google uses to decide whether to recrawl. */
      lastModified: new Date(article.modifiedAt ?? article.publishedAt),
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  /*
    TAXONOMY ARCHIVES ARE FILTERED BY A FLOOR, NOT BY "HAS ANY ARTICLES".

    The old test was `count === 0`, which kept an archive of two out of the
    sitemap only if it held zero. Submitting a two-article archive is not
    neutral: it spends crawl budget on a page that will not rank and it dilutes
    the signal of the archives that will. The floor lives in lib/taxonomy.ts
    together with the `noindex` the same pages carry, because a URL kept out of
    the sitemap is still reachable from the links on every page — the two
    directives have to move as one or the exclusion is decorative.

    Today this admits education (41), articles (39) and news (10), and excludes
    analysis (2) and inchart (2).

    IT ALSO EXCLUDES EVERY MARKET ARCHIVE — crypto 5, forex 3, global 3, tse 2,
    gold-usd 1, housing 0 — including the three the header nav links to. That
    is not a bug in the floor and it is not a reason to lower it. 39 of 53
    articles carry no market at all, so those archives ARE thin, and indexing
    them would not make them less so. The fix is tagging, which is a content
    workflow, not a template: backlog B17.
  */
  for (const market of markets) {
    if (isThinArchive(market.count)) continue;

    entries.push({
      url: magUrl(`/market/${market.slug}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  for (const category of categories) {
    if (isThinArchive(category.count)) continue;

    entries.push({
      url: magUrl(`/category/${category.slug}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  for (const author of authors) {
    if ((author.articleCount ?? 0) === 0) continue;

    entries.push({
      url: magUrl(`/author/${author.slug}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.4,
    });
  }

  return entries;
}
