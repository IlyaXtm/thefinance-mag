import { notFound } from 'next/navigation';
import { getMarketArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { MAG_NAME } from '@/features/mag/lib/site';
import type { Market } from '@/features/mag/types/mag.types';
import { ArchiveShell, MarketFilterBar } from '@/features/mag/components';

/**
 * The market archive, shared by `/market/<slug>` and its paginated route.
 *
 * Same shell as `/archive` and `/category/<slug>`; only the data differs.
 */
export async function MarketArchiveView({
  market,
  page,
}: {
  market: Market;
  page: number;
}) {
  const [articles, markets] = await Promise.all([
    /* Not getArticles({ market }): that filtered one unfiltered page in JS and
       took its total from an unfiltered count, so the header, the sidebar and
       the rows could each report a different number. */
    getMarketArticles(market.slug, page, 12),
    getMarkets(),
  ]);

  if (isPageBeyondEnd(articles.page, articles.items.length)) notFound();

  return (
    <ArchiveShell
      crumbs={[
        { name: MAG_NAME, href: '/' },
        { name: 'دسته‌بندی‌ها', href: '/archive' },
        { name: market.name, href: `/market/${market.slug}` },
      ]}
      title={market.name}
      description={market.description}
      articles={articles}
      filterBar={<MarketFilterBar markets={markets} activeSlug={market.slug} />}
      headingId="market-list-heading"
      headingText={`مطالب ${market.name}`}
      basePath={`/market/${market.slug}`}
      emptyMessage={`هنوز مطلبی در ${market.name} منتشر نشده.`}
      activeMarketSlug={market.slug}
      markets={markets}
    />
  );
}
