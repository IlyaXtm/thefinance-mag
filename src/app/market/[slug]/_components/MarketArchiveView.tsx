import { notFound } from 'next/navigation';
import { getMarketArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import type { Market } from '@/features/mag/types/mag.types';
import {
  ArchiveCard,
  ArticleGridEmpty,
  CategoryCover,
  CategoryListCard,
  MarketFilterBar,
  NewsletterCta,
  Pagination,
  pagePathHref,
} from '@/features/mag/components';

/**
 * The market archive, shared by `/market/<slug>` and its paginated route.
 *
 * This is the v4 "category" template. The design draws one flat category axis
 * and `market` is the axis that carries it — `cardCategory` resolves the same
 * way, so a card's chip and this page's masthead always agree.
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

  const crumbs = [
    { name: MAG_NAME, href: '/' },
    { name: 'دسته‌بندی‌ها', href: '/archive' },
    { name: market.name, href: `/market/${market.slug}` },
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-24">
      <JsonLdScript
        data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: magUrl(c.href) })))}
      />

      <div className="pt-6 lg:pt-8">
        <CategoryCover
          title={market.name}
          crumbs={crumbs}
          description={market.description}
          /* articles.total, not market.count: the count and the list must be
             two readings of one array or they drift apart on screen. */
          count={articles.total}
          /* The taxonomy has no cover-image field, so this is always the
             no-image variant today. It is wired rather than removed because
             adding one is a mu-plugin change, not a template change. */
          image={null}
        />
      </div>

      <div className="mt-7">
        <MarketFilterBar markets={markets} activeSlug={market.slug} />
      </div>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <section aria-labelledby="market-list-heading">
          <h2 id="market-list-heading" className="sr-only">
            مطالب {market.name}
          </h2>

          {articles.items.length > 0 ? (
            <>
              <div className="flex flex-col gap-6">
                {articles.items.map((article, index) => (
                  <ArchiveCard key={article.id} article={article} priority={index === 0} />
                ))}
              </div>
              <Pagination
                page={articles.page}
                totalPages={articles.totalPages}
                hrefFor={pagePathHref(`/market/${market.slug}`)}
              />
            </>
          ) : (
            <ArticleGridEmpty message={`هنوز مطلبی در ${market.name} منتشر نشده.`} />
          )}
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[76px]">
          <CategoryListCard markets={markets} activeSlug={market.slug} />
          <NewsletterCta />
        </aside>
      </div>
    </main>
  );
}
