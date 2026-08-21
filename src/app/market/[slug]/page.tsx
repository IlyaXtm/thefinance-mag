import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMarket } from '@/features/mag/api/v1/mag.service';
import { MagNotFoundError, MARKET_SLUGS } from '@/features/mag/types/mag.types';
import type { MarketSlug } from '@/features/mag/types/mag.types';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_NAME } from '@/features/mag/lib/site';
import { MarketArchiveView } from './_components/MarketArchiveView';

/**
 * /mag/market/<slug> — market archive.
 *
 * No hero image. An archive is a list, not a story: a decorative banner would
 * become the LCP element and buy nothing.
 */

export const revalidate = 300;

/**
 * Prerender page one for every market.
 *
 * The market list is a fixed six terms registered by the mu-plugin, so this is
 * a bounded, cheap set — and it is the page-one view that carries essentially
 * all of the traffic to these routes.
 */
export function generateStaticParams(): Array<{ slug: string }> {
  return MARKET_SLUGS.map((slug) => ({ slug }));
}

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

  return toMetadata({
    seo: null,
    path: `/market/${market.slug}`,
    fallbackTitle: market.name,
    fallbackDescription: market.description ?? `مطالب ${market.name} در ${MAG_NAME}`,
    ogTitle: `${market.name} | ${MAG_NAME}`,
  });
}

/**
 * Page ONE of the market archive.
 *
 * No `searchParams` here on purpose: reading them makes the route fully
 * dynamic, which is what made this archive uncacheable. Pages two and up live
 * at `/market/<slug>/page/<n>`.
 */
export default async function MarketArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const market = await fetchMarket(slug);

  if (!market) notFound();

  return <MarketArchiveView market={market} page={1} />;
}
