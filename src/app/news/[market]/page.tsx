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
 * Since 2026-10-07 this IS the sub-category «اخبار › <market>»
 * (lib/subcategories.ts) — the market archive it used to send readers on to
 * is gone, so it lists every news item in the market, not the first page.
 *
 * NOINDEX, FOLLOW. Every item here is also on `/news`; a second indexable list
 * of the same articles is a near-duplicate that would compete with it, and
 * most markets have fewer than eight news items (SITEMAP_MIN_ARTICLES).
 * Readers get a real, linkable, prerendered page; crawlers follow its links
 * and index the articles. The market's indexable page is its lessons,
 * `/category/education/<market>`.
 */

export const revalidate = 300;

/** All of them: a market has tens of news items, not hundreds, and the
    archive fetch already holds every one. */
const ALL_NEWS = Number.POSITIVE_INFINITY;

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

  const items = newsInMarket(archive, market.slug, ALL_NEWS);

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
        /* Nothing more to load: `items` is the whole market. */
        moreHref={null}
      />
    </main>
  );
}
