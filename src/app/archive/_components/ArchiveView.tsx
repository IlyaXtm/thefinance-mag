import { notFound } from 'next/navigation';
import { getArticles, getCategories, getMarkets } from '@/features/mag/api/v1/mag.service';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { MAG_NAME } from '@/features/mag/lib/site';
import type { ContentType } from '@/features/mag/types/mag.types';
import { ArchiveShell, ContentTypeFilterBar } from '@/features/mag/components';

/**
 * The archive body, shared by `/archive` and `/archive/page/<n>`.
 *
 * The layout itself lives in `ArchiveShell` — this file supplies the data and
 * the masthead copy, and nothing else. See the note on the shell.
 *
 * `contentType` is still accepted, and after the category routes landed it is
 * reached by fewer and fewer URLs: `/archive?type=education` now 301s to
 * `/category/education` when the category exists. It survives for the one case
 * that has no category behind it — «گزارش», a content type the taxonomy does
 * not hold — and for any old link with a `?type=` nobody has cleaned up.
 */
export async function ArchiveView({
  contentType,
  page,
}: {
  contentType: ContentType | undefined;
  page: number;
}) {
  const [articles, markets, categories] = await Promise.all([
    getArticles({ page, perPage: 12, contentType: contentType?.slug }),
    getMarkets(),
    getCategories(),
  ]);

  /* Past the last page is a URL that does not exist. Page 1 with nothing on it
     is a real empty archive and keeps its empty state below. */
  if (isPageBeyondEnd(page, articles.items.length)) notFound();

  return (
    <ArchiveShell
      crumbs={[
        { name: MAG_NAME, href: '/' },
        { name: 'آرشیو', href: '/archive' },
      ]}
      title="آرشیو"
      description="همه‌ی مطالب مجله، از تازه‌ترین. برای محدود کردن فهرست، یکی از دسته‌ها را انتخاب کنید."
      articles={articles}
      filterBar={
        <ContentTypeFilterBar
          contentTypes={CONTENT_TYPES}
          activeSlug={contentType?.slug}
          routedSlugs={categories.map((c) => c.slug)}
        />
      }
      headingId="archive-list-heading"
      headingText={contentType ? contentType.name : 'همه مطالب'}
      basePath="/archive"
      baseQuery={{ type: contentType?.slug }}
      emptyMessage={
        contentType
          ? `هنوز مطلبی در دسته ${contentType.name} منتشر نشده.`
          : 'هنوز مطلبی منتشر نشده.'
      }
      emptyAction={{ href: '/archive', label: 'همه مطالب' }}
      markets={markets}
    />
  );
}
