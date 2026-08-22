import { notFound } from 'next/navigation';
import { getArticles } from '@/features/mag/api/v1/mag.service';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import type { ContentType } from '@/features/mag/types/mag.types';
import {
  ArticleGridEmpty,
  ArticleRow,
  ContentTypeFilterBar,
  Pagination,
  pagePathHref,
  Section,
  SectionHeading,
} from '@/features/mag/components';

/**
 * The archive body, shared by `/archive` and `/archive/page/<n>`.
 *
 * Two routes so the page number lives in the path — see `pagePathHref` for
 * why that matters — and one component so they cannot drift.
 */
export async function ArchiveView({
  contentType,
  page,
}: {
  contentType: ContentType | undefined;
  page: number;
}) {
  const articles = await getArticles({
    page,
    perPage: 15,
    contentType: contentType?.slug,
  });

  /* Past the last page is a URL that does not exist. Page 1 with nothing on it
     is a real empty archive and keeps its empty state below. */
  if (isPageBeyondEnd(page, articles.items.length)) notFound();

  return (
    <main>
      <Section className="!pb-0">
        <div className="border-b border-border-strong pb-8">
          <h1 className="text-[28px] font-bold leading-[1.4] text-text-primary md:text-[34px]">
            آرشیو
          </h1>
          <p className="mt-2 text-text-secondary">همه مطالب مجله، از تازه‌ترین</p>
        </div>
      </Section>

      <Section className="!pt-8">
        <div className="mb-8">
          <ContentTypeFilterBar contentTypes={CONTENT_TYPES} activeSlug={contentType?.slug} />
        </div>

        <SectionHeading title={contentType ? contentType.name : 'همه مطالب'} />

        {articles.items.length > 0 ? (
          <div>
            {articles.items.map((article) => (
              <ArticleRow key={article.id} article={article} />
            ))}
          </div>
        ) : (
          /* The market and author archives already do this; the archive was the
             one listing that rendered a bare heading and nothing else. */
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
      </Section>
    </main>
  );
}
