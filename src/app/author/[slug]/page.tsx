import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticles, getAuthor } from '@/features/mag/api/v1/mag.service';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import {
  ArticleGrid,
  ArticleGridEmpty,
  AuthorBox,
  Breadcrumbs,
  Pagination,
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await fetchAuthor(slug);

  if (!author) notFound();

  const articles = await getArticles({ page: 1, perPage: 9, authorSlug: author.slug });

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
          {/* The page-scale variant of the same component used after articles. */}
          <AuthorBox author={author} size="page" />
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
            <Pagination page={articles.page} totalPages={articles.totalPages} basePath={`/author/${author.slug}`} />
          </>
        ) : (
          <ArticleGridEmpty message="این نویسنده هنوز مطلبی منتشر نکرده." />
        )}
      </Section>
    </main>
  );
}
