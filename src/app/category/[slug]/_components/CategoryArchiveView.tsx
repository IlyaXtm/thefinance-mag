import { notFound } from 'next/navigation';
import {
  getAllSummaries,
  getArticles,
  getCategories,
  getMarkets,
} from '@/features/mag/api/v1/mag.service';
import { educationChips, educationGuides } from '@/features/mag/lib/education';
import { categoryCopy } from '@/features/mag/lib/taxonomy';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { MAG_NAME } from '@/features/mag/lib/site';
import type { Category } from '@/features/mag/types/mag.types';
import { ArchiveShell, ChipFilterBar, ContentTypeFilterBar } from '@/features/mag/components';
import { EducationLead } from './EducationLead';

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
  /*
    «آموزش» IS PRESENTED DIFFERENTLY (team review, 2026-10-05): its own title
    and promise, a «می‌خواهی چه چیزی یاد بگیری؟» search, editor-tagged guides
    above everything, topic chips instead of the content-type row, and no
    article count. Every other category is unchanged. The chips and guides
    read the cached archive fetch; nothing extra is asked of the CMS.
  */
  const isEducation = category.slug === 'education';
  const copy = categoryCopy(category);

  const [articles, markets, categories, archive] = await Promise.all([
    /* Server-side `categoryName`, not a JS filter over one unfiltered page.
       The list, the header count and `totalPages` are then one question asked
       once — the failure mode the market archives were rebuilt to remove. */
    getArticles({ page, perPage: 12, category: category.slug }),
    getMarkets(),
    getCategories(),
    isEducation ? getAllSummaries() : Promise.resolve([]),
  ]);

  if (isPageBeyondEnd(page, articles.items.length)) notFound();

  return (
    <ArchiveShell
      crumbs={[
        { name: MAG_NAME, href: '/' },
        { name: 'آرشیو', href: '/archive' },
        { name: category.name, href: `/category/${category.slug}` },
      ]}
      title={copy.title}
      description={copy.description}
      articles={articles}
      lead={
        isEducation && page === 1 ? <EducationLead guides={educationGuides(archive)} /> : undefined
      }
      filterBar={
        isEducation ? (
          <ChipFilterBar
            items={educationChips(archive, markets).map((chip) => ({
              key: chip.key,
              name: chip.name,
              href: `/category/education/${chip.key}`,
            }))}
            allHref="/category/education"
            label="موضوع آموزش"
            showLabel={false}
          />
        ) : (
          <ContentTypeFilterBar
            contentTypes={CONTENT_TYPES}
            activeSlug={category.slug}
            categories={categories}
          />
        )
      }
      headingId="category-list-heading"
      headingText={`مطالب ${category.name}`}
      basePath={`/category/${category.slug}`}
      emptyMessage={`هنوز مطلبی در دسته ${category.name} منتشر نشده.`}
      emptyAction={{ href: '/archive', label: 'همه مطالب' }}
      markets={markets}
      activeHref={`/category/${category.slug}`}
    />
  );
}
