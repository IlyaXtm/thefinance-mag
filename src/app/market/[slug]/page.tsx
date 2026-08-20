import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticles, getMarket, getMarkets } from '@/features/mag/api/v1/mag.service';
import { MagNotFoundError, MARKET_SLUGS } from '@/features/mag/types/mag.types';
import type { MarketSlug } from '@/features/mag/types/mag.types';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import {
  ArticleGrid,
  ArticleGridEmpty,
  Breadcrumbs,
  MarketFilterBar,
  Pagination,
  pageQueryHref,
  Section,
  SectionInner,
} from '@/features/mag/components';

/**
 * /mag/market/<slug> — market archive.
 *
 * No hero image. An archive is a list, not a story: a decorative banner would
 * become the LCP element and buy nothing.
 */

export const revalidate = 300;

function isMarketSlug(slug: string): slug is MarketSlug {
  return (MARKET_SLUGS as readonly string[]).includes(slug);
}

async function fetchMarket(slug: string) {
  /* Narrow before hitting the service: an arbitrary URL segment shouldn't
     reach the data layer at all, and this turns it into a 404 instead. */
  if (!isMarketSlug(slug)) return null;

  try {
    return await getMarket(slug);
  } catch (error) {
    if (error instanceof MagNotFoundError) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const market = await fetchMarket(slug);

  if (!market) return { title: 'بازار پیدا نشد' };

  return {
    title: market.name,
    description: market.description ?? `مطالب ${market.name} در ${MAG_NAME}`,
    alternates: { canonical: magUrl(`/market/${market.slug}`) },
  };
}

export default async function MarketArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const market = await fetchMarket(slug);

  if (!market) notFound();

  /*
    The page number comes from the query string, the same shape the archive
    uses. It was previously pinned to 1 while the pagination below still
    rendered links, so every article past the ninth in a market was
    unreachable and the links pointed at a route that does not exist.
  */
  const currentPage = Math.max(1, Number(page) || 1);

  const [articles, markets] = await Promise.all([
    getArticles({ page: currentPage, perPage: 9, market: market.slug }),
    getMarkets(),
  ]);

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
              hrefFor={pageQueryHref(`/market/${market.slug}`)}
            />
          </>
        ) : (
          <ArticleGridEmpty message={`هنوز مطلبی در ${market.name} منتشر نشده.`} />
        )}
      </Section>
    </main>
  );
}
