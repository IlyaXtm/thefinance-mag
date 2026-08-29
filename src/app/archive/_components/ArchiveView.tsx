import { notFound } from 'next/navigation';
import { getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { MAG_NAME } from '@/features/mag/lib/site';
import type { ContentType } from '@/features/mag/types/mag.types';
import {
  ArchiveCard,
  ArticleGridEmpty,
  CategoryCover,
  CategoryListCard,
  ContentTypeFilterBar,
  NewsletterCta,
  Pagination,
  pagePathHref,
} from '@/features/mag/components';

/**
 * The archive body, shared by `/archive` and `/archive/page/<n>`.
 *
 * v4 layout: masthead card, filter toolbar, a single column of horizontal
 * cards, and a 320px sidebar. Horizontal rows rather than a grid because a
 * long archive scans faster down one title column than across a zig-zag.
 */
export async function ArchiveView({
  contentType,
  page,
}: {
  contentType: ContentType | undefined;
  page: number;
}) {
  const [articles, markets] = await Promise.all([
    getArticles({ page, perPage: 12, contentType: contentType?.slug }),
    getMarkets(),
  ]);

  /* Past the last page is a URL that does not exist. Page 1 with nothing on it
     is a real empty archive and keeps its empty state below. */
  if (isPageBeyondEnd(page, articles.items.length)) notFound();

  const crumbs = [
    { name: MAG_NAME, href: '/' },
    { name: 'آرشیو', href: '/archive' },
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-24">
      <div className="pt-6 lg:pt-8">
        <CategoryCover
          title="آرشیو"
          crumbs={crumbs}
          description="همه‌ی مطالب مجله، از تازه‌ترین. برای محدود کردن فهرست، یکی از دسته‌ها را انتخاب کنید."
          count={articles.total}
        />
      </div>

      <div className="mt-7">
        <ContentTypeFilterBar contentTypes={CONTENT_TYPES} activeSlug={contentType?.slug} />
      </div>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <section aria-labelledby="archive-list-heading">
          <h2 id="archive-list-heading" className="sr-only">
            {contentType ? contentType.name : 'همه مطالب'}
          </h2>

          {articles.items.length > 0 ? (
            <div className="flex flex-col gap-6">
              {articles.items.map((article) => (
                <ArchiveCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <ArticleGridEmpty
              message={
                contentType
                  ? `هنوز مطلبی در دسته ${contentType.name} منتشر نشده.`
                  : 'هنوز مطلبی منتشر نشده.'
              }
              actionHref="/archive"
              actionLabel="همه مطالب"
            />
          )}

          {/* `type` travels with the page number — paging a filtered archive
              must not silently drop the filter. */}
          <Pagination
            page={articles.page}
            totalPages={articles.totalPages}
            hrefFor={pagePathHref('/archive', { type: contentType?.slug })}
          />
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[76px]">
          <CategoryListCard markets={markets} />
          <NewsletterCta />
        </aside>
      </div>
    </main>
  );
}
