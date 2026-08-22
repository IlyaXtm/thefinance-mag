import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAuthor } from '@/features/mag/api/v1/mag.service';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import { AuthorArchiveView } from '../../_components/AuthorArchiveView';

/**
 * /mag/author/<slug>/page/<n> — pages two and up.
 *
 * Page one stays canonical at `/author/<slug>`, which keeps that route static
 * and avoids two URLs for one page.
 */

export const revalidate = 300;

function parse(n: string): number | null {
  const page = Number(n);
  return Number.isInteger(page) && page >= 2 ? page : null;
}

async function fetchAuthor(slug: string) {
  try {
    return await getAuthor(slug);
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
  const author = page ? await fetchAuthor(slug) : null;

  if (!author || !page) return { title: 'صفحه پیدا نشد' };

  return toMetadata({
    seo: null,
    path: `/author/${author.slug}/page/${page}`,
    fallbackTitle: `${author.name} — صفحه ${toPersianDigits(page)}`,
    fallbackDescription: author.bio ?? `مطالب ${author.name} در ${MAG_NAME}`,
  });
}

export default async function AuthorPaginatedPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  const page = parse(n);

  if (!page) notFound();

  const author = await fetchAuthor(slug);
  if (!author) notFound();

  return <AuthorArchiveView author={author} page={page} />;
}
