import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import { ArchiveView } from '../../_components/ArchiveView';

/**
 * /mag/archive/page/<n> — pages two and up.
 *
 * Page one stays at `/archive`. `?type=` still travels alongside, so paging a
 * filtered archive keeps the filter.
 */

export const revalidate = 300;

function parse(n: string): number | null {
  const page = Number(n);
  /* `/archive/page/1` is a second URL for `/archive`, so it 404s. */
  return Number.isInteger(page) && page >= 2 ? page : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const page = parse(n);

  if (!page) return { title: 'صفحه پیدا نشد' };

  return toMetadata({
    seo: null,
    path: `/archive/page/${page}`,
    fallbackTitle: `آرشیو — صفحه ${toPersianDigits(page)}`,
    fallbackDescription: `همه مطالب ${MAG_NAME}`,
  });
}

export default async function ArchivePaginatedPage({
  params,
  searchParams,
}: {
  params: Promise<{ n: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { n } = await params;
  const { type } = await searchParams;
  const page = parse(n);

  if (!page) notFound();

  const contentType = CONTENT_TYPES.find((t) => t.slug === type);

  return <ArchiveView contentType={contentType} page={page} />;
}
