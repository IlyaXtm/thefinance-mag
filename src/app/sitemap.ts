import type { MetadataRoute } from 'next';
import { getArticles, getAuthors, getMarkets } from '@/features/mag/api/v1/mag.service';
import { magUrl } from '@/features/mag/lib/site';

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
 */

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, markets, authors] = await Promise.all([
    getArticles({ page: 1, perPage: 500 }),
    getMarkets(),
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

  for (const market of markets) {
    /* A market with no articles would be an empty page in the sitemap —
       submitting it wastes crawl budget and looks like thin content. */
    if ((market.count ?? 0) === 0) continue;

    entries.push({
      url: magUrl(`/market/${market.slug}`),
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
