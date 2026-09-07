import { notFound } from 'next/navigation';
import { getArticles, getCategories, getMarkets } from '@/features/mag/api/v1/mag.service';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { MAG_NAME } from '@/features/mag/lib/site';
import type { Category } from '@/features/mag/types/mag.types';
import { ArchiveShell, ContentTypeFilterBar } from '@/features/mag/components';

/**
 * The category archive, shared by `/category/<slug>` and its paginated route.
 *
 * Same shell as `/archive` and `/market/<slug>`. Only the data differs — that
 * is the point of the shell and it is what the brief asked for.
 *
 * The filter row is the CONTENT-TYPE row, not a row of every category. Two
 * reasons, and the second is the constraint:
 *
 *   - it is the row this archive already has, so arriving here from
 *     `/archive` does not change what the controls under the masthead mean.
 *   - rendering every category the CMS returns is exactly what the brief rules
 *     out. The chip set stays the four modelled types; a category with no type
 *     behind it («مقالات») is reachable, has a route and is in the sitemap, but
 *     it does not get a nav slot for being large.
 */
export async function CategoryArchiveView({
  category,
  page,
}: {
  category: Category;
  page: number;
}) {
  const [articles, markets, categories] = await Promise.all([
    /* Server-side `categoryName`, not a JS filter over one unfiltered page.
       The list, the header count and `totalPages` are then one question asked
       once — the failure mode the market archives were rebuilt to remove. */
    getArticles({ page, perPage: 12, category: category.slug }),
    getMarkets(),
    getCategories(),
  ]);

  if (isPageBeyondEnd(page, articles.items.length)) notFound();

  return (
    <ArchiveShell
      crumbs={[
        { name: MAG_NAME, href: '/' },
        { name: 'آرشیو', href: '/archive' },
        { name: category.name, href: `/category/${category.slug}` },
      ]}
      title={category.name}
      description={
        category.description ?? `همه‌ی مطالب دسته‌ی ${category.name} در ${MAG_NAME}`
      }
      articles={articles}
      filterBar={
        <ContentTypeFilterBar
          contentTypes={CONTENT_TYPES}
          activeSlug={category.slug}
          routedSlugs={categories.map((c) => c.slug)}
        />
      }
      headingId="category-list-heading"
      headingText={`مطالب ${category.name}`}
      basePath={`/category/${category.slug}`}
      emptyMessage={`هنوز مطلبی در دسته ${category.name} منتشر نشده.`}
      emptyAction={{ href: '/archive', label: 'همه مطالب' }}
      markets={markets}
    />
  );
}
