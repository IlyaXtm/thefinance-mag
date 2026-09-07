import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategory } from '@/features/mag/api/v1/mag.service';
import { toMetadata } from '@/features/mag/lib/seo';
import { toPersianDigits } from '@/features/mag/lib/format';
import { MAG_NAME } from '@/features/mag/lib/site';
import { isExcludedCategory } from '@/features/mag/lib/taxonomy';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { CategoryArchiveView } from '../../_components/CategoryArchiveView';

/**
 * /mag/category/<slug>/page/<n> — pages two and up.
 *
 * Page one stays at `/category/<slug>`; `/page/1` 404s rather than becoming a
 * second URL for it.
 *
 * NOINDEX ON EVERY PAGE HERE, regardless of how large the category is, and
 * that is a different rule from page one. A paginated slice is not a page
 * anyone should arrive at from a search result — it has no subject of its own,
 * its content moves as articles are published, and it competes with page one
 * for the same query. `follow` stays on, so the articles it lists are still
 * crawled, which is the only job this URL has for a crawler.
 *
 * Not prerendered either: the page count moves with every publish, so a
 * `generateStaticParams` here would be a list that goes stale by design.
 */

export const revalidate = 300;

function parse(n: string): number | null {
  const page = Number(n);
  return Number.isInteger(page) && page >= 2 ? page : null;
}

async function fetchCategory(slug: string) {
  if (isExcludedCategory(slug)) return null;

  try {
    return await getCategory(decodeURIComponent(slug));
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
  const category = page ? await fetchCategory(slug) : null;

  if (!page || !category) return { title: 'صفحه پیدا نشد' };

  return toMetadata({
    seo: null,
    path: `/category/${category.slug}/page/${page}`,
    fallbackTitle: `${category.name} — صفحه ${toPersianDigits(page)}`,
    fallbackDescription: `مطالب دسته‌ی ${category.name} در ${MAG_NAME}`,
    noindex: true,
  });
}

export default async function CategoryPaginatedPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  const page = parse(n);

  if (!page) notFound();

  const category = await fetchCategory(slug);
  if (!category) notFound();

  return <CategoryArchiveView category={category} page={page} />;
}
