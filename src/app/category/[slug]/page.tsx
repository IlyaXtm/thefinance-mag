import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getCategory } from '@/features/mag/api/v1/mag.service';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_NAME } from '@/features/mag/lib/site';
import { isExcludedCategory, isThinArchive } from '@/features/mag/lib/taxonomy';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { CategoryArchiveView } from './_components/CategoryArchiveView';

/**
 * /mag/category/<slug> — the category archive.
 *
 * ── Why this is a route and not a redirect to `/archive?type=` ───────────
 *
 * Because `/archive?type=education` cannot be indexed, and that is not a
 * tuning problem. Reading `searchParams` opts a Next route out of prerendering
 * entirely: the server cannot know which query strings will arrive, so the
 * filtered archive is dynamic on every request and never becomes a static page
 * Google can be handed. «آموزش» is 41 of 53 articles — the largest single body
 * of topical authority this magazine has — and it was sitting behind the one
 * URL shape the build cannot prerender.
 *
 * A path segment is part of the resource's identity, so `/category/education`
 * is a static ISR page. Same reasoning that moved pagination out of `?page=`.
 *
 * ── Generated from the CMS, not from a constant ─────────────────────────
 *
 * `generateStaticParams` reads the live taxonomy. A category the editors add
 * next month gets a working, prerendered, sitemap-listed archive on the next
 * revalidation — no deploy. That is deliberate and it is the difference from
 * `/market/<slug>`, whose six terms are registered by the mu-plugin and cannot
 * change without one.
 *
 * THE NAV DOES NOT FOLLOW. Every category getting a route does not mean every
 * category getting a link in the header: `CATEGORY_NAV` stays hand-picked, and
 * an archive can be routed, indexed and unlinked-from-the-nav all at once.
 */

export const revalidate = 300;

/**
 * `false`, not `true`. A slug outside this list is not a category that merely
 * has not been generated yet — it is a URL with nothing behind it, and it must
 * 404 rather than be rendered on demand. New terms arrive through revalidation,
 * which regenerates this list.
 */
export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

async function fetchCategory(slug: string) {
  /* «دسته‌بندی نشده» is WordPress's default term and is being deleted CMS-side.
     Until it is, it must not resolve to a page. */
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await fetchCategory(slug);

  if (!category) return { title: 'دسته پیدا نشد' };

  return toMetadata({
    seo: null,
    path: `/category/${category.slug}`,
    fallbackTitle: category.name,
    fallbackDescription:
      category.description ?? `همه‌ی مطالب دسته‌ی ${category.name} در ${MAG_NAME}`,
    ogTitle: `${category.name} | ${MAG_NAME}`,
    /* Below the floor the archive still renders and is still linked; it just
       stops asking to be indexed. See lib/taxonomy.ts for where 8 comes from
       and why the sitemap and this flag have to move together. */
    noindex: isThinArchive(category.count),
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await fetchCategory(slug);

  if (!category) notFound();

  return <CategoryArchiveView category={category} page={1} />;
}
