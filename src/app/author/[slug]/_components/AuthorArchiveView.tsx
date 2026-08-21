import { notFound } from 'next/navigation';
import { getArticles } from '@/features/mag/api/v1/mag.service';
import { isPageBeyondEnd } from '@/features/mag/lib/nav';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import type { Author } from '@/features/mag/types/mag.types';
import {
  ArticleGrid,
  ArticleGridEmpty,
  AuthorBox,
  Breadcrumbs,
  Pagination,
  pagePathHref,
  Section,
} from '@/features/mag/components';

/**
 * The author archive body, shared by `/author/<slug>` and
 * `/author/<slug>/page/<n>`.
 *
 * Two routes so page one can be static while the rest paginate; one component
 * so the markup cannot drift between them.
 */
export async function AuthorArchiveView({ author, page }: { author: Author; page: number }) {
  const articles = await getArticles({ page, perPage: 9, authorSlug: author.slug });

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
              hrefFor={pagePathHref(`/author/${author.slug}`)}
            />
          </>
        ) : (
          <ArticleGridEmpty message="این نویسنده هنوز مطلبی منتشر نکرده." />
        )}
      </Section>
    </main>
  );
}
