import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticles, getAuthor } from '@/features/mag/api/v1/mag.service';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import {
  ArticleGrid,
  ArticleGridEmpty,
  AuthorBox,
  Breadcrumbs,
  Pagination,
  pageQueryHref,
  Section,
} from '@/features/mag/components';

/**
 * /mag/author/<slug>
 *
 * No market filter bar. An author's output spans markets, and filtering inside
 * an author page is a rare need that would add a control to every page load.
 */

export const revalidate = 300;

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

  return {
    title: author.name,
    description: author.bio ?? `مطالب ${author.name} در ${MAG_NAME}`,
    alternates: { canonical: magUrl(`/author/${author.slug}`) },
  };
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const author = await fetchAuthor(slug);

  if (!author) notFound();

  /* Same fix as the market archive: the page was pinned to 1 while pagination
     still rendered, so a prolific author's older articles had no route. */
  const currentPage = Math.max(1, Number(page) || 1);

  const articles = await getArticles({ page: currentPage, perPage: 9, authorSlug: author.slug });

  /* Past the last page is a URL that does not exist — and without this the
     empty state below would claim nothing has been published, which is false
     whenever the reader simply asked for a page beyond the end. */
  if (isPageBeyondEnd(articles.page, articles.items.length)) notFound();

  const crumbs = [
    { name: MAG_NAME, href: '/' },
    { name: 'نویسندگان', href: '/authors' },
    { name: author.name, href: `/author/${author.slug}` },
  ];

  return (
    <main>
      <JsonLdScript
        data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: magUrl(c.href) })))}
      />

      <Section className="!pb-0">
        <Breadcrumbs items={crumbs} />

        <div className="mt-5 max-w-prose">
          {/*
            The page-scale variant of the same component used after articles.
            `isCurrentPage` makes the name the page's h1 — without it this page
            had no h1 at all and started at the visually-hidden h2 below.
          */}
          <AuthorBox author={author} size="page" isCurrentPage />
        </div>

        {author.articleCount !== null && (
          <p className="mt-3 text-[13px] text-text-muted">
            {toPersianDigits(author.articleCount)} مطلب
          </p>
        )}
      </Section>

      <Section>
        <h2 className="sr-only">مطالب {author.name}</h2>

        {articles.items.length > 0 ? (
          <>
            <ArticleGrid articles={articles.items} />
            <Pagination
              page={articles.page}
              totalPages={articles.totalPages}
              hrefFor={pageQueryHref(`/author/${author.slug}`)}
            />
          </>
        ) : (
          <ArticleGridEmpty message="این نویسنده هنوز مطلبی منتشر نکرده." />
        )}
      </Section>
    </main>
  );
}
