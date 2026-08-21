import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAuthor, getAuthors } from '@/features/mag/api/v1/mag.service';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_NAME } from '@/features/mag/lib/site';
import { AuthorArchiveView } from './_components/AuthorArchiveView';

/**
 * /mag/author/<slug>
 *
 * No market filter bar. An author's output spans markets, and filtering inside
 * an author page is a rare need that would add a control to every page load.
 */

export const revalidate = 300;

/**
 * Prerender page one for every author.
 *
 * Same reason as the article route: a dynamic segment with no
 * `generateStaticParams` is treated as fully dynamic no matter what
 * `revalidate` says, so without this the author archive stays uncacheable even
 * after the page number moved out of the query string.
 *
 * Six users, so the set is bounded and cheap. Degrades to an empty list rather
 * than failing a build that cannot reach WordPress.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const authors = await getAuthors();
    return authors.map((author) => ({ slug: author.slug }));
  } catch {
    return [];
  }
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await fetchAuthor(slug);

  if (!author) return { title: 'نویسنده پیدا نشد' };

  return toMetadata({
    seo: null,
    path: `/author/${author.slug}`,
    fallbackTitle: author.name,
    fallbackDescription: author.bio ?? `مطالب ${author.name} در ${MAG_NAME}`,
    ogTitle: `${author.name} | ${MAG_NAME}`,
  });
}

/**
 * Page ONE of the author archive.
 *
 * No `searchParams`: reading them makes the route fully dynamic, which is what
 * made this archive uncacheable. Pages two and up live at
 * `/author/<slug>/page/<n>`.
 */
export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await fetchAuthor(slug);

  if (!author) notFound();

  return <AuthorArchiveView author={author} page={1} />;
}
