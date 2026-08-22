import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMarket } from '@/features/mag/api/v1/mag.service';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import type { MarketSlug } from '@/features/mag/types/mag.types';
import { MARKET_SLUGS } from '@/features/mag/types/mag.types';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import { MarketArchiveView } from '../../_components/MarketArchiveView';

/**
 * /mag/market/<slug>/page/<n> — pages two and up.
 *
 * Separate from the base route so page one stays canonical at
 * `/market/<slug>` rather than existing at two URLs, and so that route can be
 * static. Both render `MarketArchiveView`.
 */

export const revalidate = 300;

function parse(n: string): number | null {
  const page = Number(n);
  /* Page one lives at the base URL. `/page/1` is a second URL for the same
     content, so it 404s rather than rendering a duplicate. */
  return Number.isInteger(page) && page >= 2 ? page : null;
}

async function fetchMarket(slug: string) {
  if (!(MARKET_SLUGS as readonly string[]).includes(slug)) return null;

  try {
    return await getMarket(slug as MarketSlug);
  } catch (error) {
    if (error instanceof MagNotFoundError) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}): Promise<Metadata> {
  const { slug, n } = await params;
  const page = parse(n);
  const market = page ? await fetchMarket(slug) : null;

  if (!market || !page) return { title: 'صفحه پیدا نشد' };

  return toMetadata({
    seo: null,
    path: `/market/${market.slug}/page/${page}`,
    fallbackTitle: `${market.name} — صفحه ${toPersianDigits(page)}`,
    fallbackDescription: market.description ?? `مطالب ${market.name} در ${MAG_NAME}`,
  });
}

export default async function MarketArchivePaginatedPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  const page = parse(n);

  if (!page) notFound();

  const market = await fetchMarket(slug);
  if (!market) notFound();

  return <MarketArchiveView market={market} page={page} />;
}
