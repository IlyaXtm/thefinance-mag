import { notFound } from 'next/navigation';
import { getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import type { Market } from '@/features/mag/types/mag.types';
import {
  ArticleGrid,
  ArticleGridEmpty,
  Breadcrumbs,
  MarketFilterBar,
  Pagination,
  pagePathHref,
  Section,
  SectionInner,
} from '@/features/mag/components';

/**
 * The market archive body, shared by `/market/<slug>` and
 * `/market/<slug>/page/<n>`.
 *
 * The two routes exist so that page one can be a static ISR route while the
 * rest paginate — see `pagePathHref`. They render the same thing, so the
 * markup lives here rather than being copied and left to drift.
 */
export async function MarketArchiveView({
  market,
  page,
}: {
  market: Market;
  page: number;
}) {
  const [articles, markets] = await Promise.all([
    getArticles({ page, perPage: 9, market: market.slug }),
    getMarkets(),
  ]);

  /* Past the last page is a URL that does not exist — and without this the
     empty state below would claim nothing has been published, which is false
     whenever the reader simply asked for a page beyond the end. */
  if (isPageBeyondEnd(articles.page, articles.items.length)) notFound();

  const crumbs = [
    { name: MAG_NAME, href: '/' },
    { name: market.name, href: `/market/${market.slug}` },
  ];

  return (
    <main>
      <JsonLdScript
        data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: magUrl(c.href) })))}
      />

      <Section className="!pb-0">
        <Breadcrumbs items={crumbs} />

        <h1 className="mt-4 text-[28px] font-bold leading-[1.5] text-text-primary md:text-[34px]">
          {market.name}
        </h1>

        {/*
          The description is a taxonomy field that may be empty. When absent the
          heading and count still sit correctly — no placeholder, no gap.
        */}
        {market.description && (
          <p className="mt-2 max-w-prose text-text-secondary">{market.description}</p>
        )}

        {market.count !== null && (
          <p className="mt-2 text-[13px] text-text-muted">
            {toPersianDigits(market.count)} مطلب
          </p>
        )}
      </Section>

      <SectionInner className="pt-8">
        <MarketFilterBar markets={markets} activeSlug={market.slug} />
      </SectionInner>

      <Section>
        <h2 className="sr-only">مطالب {market.name}</h2>

        {articles.items.length > 0 ? (
          <>
            <ArticleGrid articles={articles.items} />
            <Pagination
              page={articles.page}
              totalPages={articles.totalPages}
              hrefFor={pagePathHref(`/market/${market.slug}`)}
            />
          </>
        ) : (
          <ArticleGridEmpty message={`هنوز مطلبی در ${market.name} منتشر نشده.`} />
        )}
      </Section>
    </main>
  );
}
