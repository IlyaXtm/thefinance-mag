import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticles } from '@/features/mag/api/v1/mag.service';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import {
  ArticleGrid,
  ContentTypeFilterBar,
  PageHeader,
  Pagination,
  Section,
  SectionInner,
} from '@/features/mag/components';

/**
 * /mag/page/<n> — paginated listing.
 *
 * Separate from the listing route so page 1 stays canonical at /mag rather
 * than existing at two URLs. Every paginated page is crawlable, which is how
 * articles beyond the first nine get discovered.
 */

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const page = Number(n);

  return {
    title: `${MAG_NAME} — صفحه ${toPersianDigits(page)}`,
    alternates: { canonical: magUrl(`/page/${page}`) },
  };
}

export default async function PaginatedListingPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const page = Number(n);

  /* Page 1 lives at /mag, not /mag/page/1 — two URLs for one page is a
     duplicate-content problem. */
  if (!Number.isInteger(page) || page < 2) notFound();

  const articles = await getArticles({ page, perPage: 9 });

  if (articles.items.length === 0) notFound();

  return (
    <main>
      <Section className="!pb-0">
        <PageHeader title={MAG_NAME} subtitle="تحلیل، گزارش و آموزش برای بازارهای مالی" />
      </Section>

      <SectionInner className="pt-10">
        <ContentTypeFilterBar contentTypes={CONTENT_TYPES} />
      </SectionInner>

      <Section>
        <h2 className="sr-only">صفحه {toPersianDigits(page)}</h2>
        <ArticleGrid articles={articles.items} />
        <Pagination page={articles.page} totalPages={articles.totalPages} basePath={'/'} />
      </Section>
    </main>
  );
}
