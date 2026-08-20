import type { Metadata } from 'next';
import { getArticles } from '@/features/mag/api/v1/mag.service';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import {
  ArticleRow,
  ContentTypeFilterBar,
  Pagination,
  pageQueryHref,
  Section,
  SectionHeading,
} from '@/features/mag/components';

/**
 * /mag/archive — the complete reverse-chronological listing.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE INDEX.
 *
 * The index is curated: one lead, a short reading list, a topic index. It
 * deliberately does not try to show everything. That left a real gap — the
 * index showed seven articles and pagination started at the tenth, so three
 * were reachable from nowhere.
 *
 * This page is the honest complete list, and it's where the content-type
 * filter belongs: filtering is a browsing action, and browsing happens here
 * rather than on a curated front page.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'آرشیو',
  description: `همه مطالب ${MAG_NAME}`,
  alternates: { canonical: magUrl('/archive') },
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const { page, type } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const contentType = CONTENT_TYPES.find((t) => t.slug === type);

  const articles = await getArticles({
    page: currentPage,
    perPage: 15,
    contentType: contentType?.slug,
  });

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

        <div>
          {articles.items.map((article) => (
            <ArticleRow key={article.id} article={article} />
          ))}
        </div>

        {/* `type` travels with the page number — paging a filtered archive
            must not silently drop the filter. */}
        <Pagination
          page={articles.page}
          totalPages={articles.totalPages}
          hrefFor={pageQueryHref('/archive', { type: contentType?.slug })}
        />
      </Section>
    </main>
  );
}
