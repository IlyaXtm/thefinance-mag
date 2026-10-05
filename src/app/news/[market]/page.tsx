import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllSummaries, getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { toMetadata } from '@/features/mag/lib/seo';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { NEWS_SUBTITLE, newsInMarket, newsMarkets } from '@/features/mag/lib/news';
import { NewsView } from '../_components/NewsView';

/**
 * /mag/news/<market> — one market's news, where the chips under
 * «آخرین اخبار بازارهای مالی» lead.
 *
 * NOINDEX, FOLLOW. Every item here is also on `/news` and on the market's own
 * archive; a third indexable list of the same articles is a near-duplicate
 * that would compete with both, and three of the five markets have fewer than
 * eight news items (SITEMAP_MIN_ARTICLES). Readers get a real, linkable,
 * prerendered page; crawlers follow its links and index the articles.
 */

export const revalidate = 300;

const PER_PAGE = 30;

async function resolveMarket(slug: string) {
  const [markets, archive] = await Promise.all([getMarkets(), getAllSummaries()]);
  const withNews = newsMarkets(archive, markets);
  return { market: withNews.find((m) => m.slug === slug) ?? null, withNews, markets, archive };
}

export async function generateStaticParams() {
  const [markets, archive] = await Promise.all([getMarkets(), getAllSummaries()]);
  return newsMarkets(archive, markets).map((m) => ({ market: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ market: string }>;
}): Promise<Metadata> {
  const { market: slug } = await params;
  const { market } = await resolveMarket(slug);
  const title = market ? `اخبار ${market.name}` : 'اخبار';

  return toMetadata({
    seo: null,
    path: `/news/${slug}`,
    fallbackTitle: title,
    fallbackDescription: NEWS_SUBTITLE,
    noindex: true,
  });
}

export default async function NewsMarketPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market: slug } = await params;
  const [{ market, withNews, markets, archive }, related] = await Promise.all([
    resolveMarket(slug),
    getArticles({ page: 1, perPage: 4, contentType: 'education' }),
  ]);

  /* A market with no news has no chip, so its URL is not a page. */
  if (!market) notFound();

  const items = newsInMarket(archive, market.slug, PER_PAGE);

  return (
    <main id="main-content" tabIndex={-1} className="mag-gutter">
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: MAG_NAME, url: magUrl('/') },
          { name: 'اخبار', url: magUrl('/news') },
          { name: market.name, url: magUrl(`/news/${market.slug}`) },
        ])}
      />

      <NewsView
        title={`آخرین اخبار ${market.name}`}
        subtitle={NEWS_SUBTITLE}
        items={items}
        total={market.count ?? items.length}
        newsMarkets={withNews}
        allMarkets={markets}
        activeMarket={market.slug}
        related={related.items}
        /* More than a page: the market's full archive holds the rest. */
        moreHref={(market.count ?? 0) > PER_PAGE ? `/market/${market.slug}` : null}
      />
    </main>
  );
}
