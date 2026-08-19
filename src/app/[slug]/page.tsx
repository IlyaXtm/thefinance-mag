import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticle, getArticles } from '@/features/mag/api/v1/mag.service';
import { getComments } from '@/features/mag/api/v1/mag.comments.service';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { toMetadata } from '@/features/mag/lib/seo';
import { articleJsonLd, breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import {
  ArticleBody,
  ArticleGrid,
  ArticleMeta,
  AuthorBox,
  Breadcrumbs,
  CommentForm,
  CommentList,
  ContentTypeLabel,
  NewsletterCta,
  MarketChip,
  Section,
  TableOfContents,
} from '@/features/mag/components';

/**
 * thefinance.ir/mag/<slug> — the article page.
 *
 * This is where search traffic lands, so it is where LCP, heading structure and
 * structured data actually matter. The listing is mostly internal navigation.
 *
 * ISR: articles are stable, so a 5-minute window is generous. The revalidation
 * webhook from WordPress will make this near-immediate on publish.
 */

export const revalidate = 300;

/**
 * Slugs are percent-encoded Persian for most of the archive, e.g.
 * `%d8%a7%d9%86%d8%af%db%8c%da%a9%d8%a7%d8%aa%d9%88%d8%b1-...`
 *
 * Next.js decodes route params, so the value arriving here is the decoded
 * Persian string. It must be re-encoded before being sent to WordPress, which
 * stores the encoded form. Skipping this 404s most of the archive.
 */
function normaliseSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * The data layer signals a missing article by throwing, not by returning null.
 *
 * That is the right shape for the service — a caller that forgets to check a
 * nullable return gets a silent blank page, whereas a throw is loud. But this
 * page has to turn it into a 404 rather than a 500: a missing article is an
 * expected outcome, and a 500 tells Google the server is broken while a 404
 * tells it the URL is gone.
 */
async function fetchArticle(slug: string) {
  try {
    return await getArticle(slug);
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
  const article = await fetchArticle(normaliseSlug(slug));

  if (!article) return { title: 'مقاله پیدا نشد' };

  return toMetadata({
    seo: article.seo,
    path: `/${article.slug}`,
    fallbackTitle: article.title,
    imageUrl: article.featuredImage?.url,
    publishedAt: article.publishedAt,
    modifiedAt: article.modifiedAt,
    authorName: article.author.name,
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchArticle(normaliseSlug(slug));

  if (!article) notFound();

  /*
    Related articles and comments in parallel — neither depends on the other,
    and sequential awaits would add a round trip on every ISR regeneration.

    A comment fetch failure must not take the article down: comments are
    supplementary, the article is the point. So it degrades to an empty thread,
    which the list already handles by rendering nothing.
  */
  const [related, comments] = await Promise.all([
    getArticles({
      page: 1,
      perPage: 3,
      contentType: article.contentType.slug,
      excludeSlug: article.slug,
    }),
    getComments(article.slug).catch(() => ({ items: [], total: 0 })),
  ]);

  const crumbs = [
    { name: MAG_NAME, href: '/' },
    ...(article.market ? [{ name: article.market.name, href: `/market/${article.market.slug}` }] : []),
    { name: article.title, href: `/${article.slug}` },
  ];

  return (
    <main>
      {/*
        Structured data. Article, not NewsArticle — most of this archive is
        evergreen education, and NewsArticle would signal a freshness the
        content doesn't claim.
      */}
      <JsonLdScript
        data={[
          articleJsonLd(article),
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: magUrl(c.href) }))),
        ]}
      />

      <Section className="!pb-0">
        <div className="max-w-prose">
          <Breadcrumbs items={crumbs} />

          <div className="mt-5 flex items-center gap-2">
            {article.market && <MarketChip market={article.market} />}
            {article.market && <span className="text-text-muted" aria-hidden="true">·</span>}
            <ContentTypeLabel contentType={article.contentType} />
          </div>

          {/* The page's only h1. No clamp — the full title always shows. */}
          <h1 className="mt-3 text-[26px] font-bold leading-[1.5] text-text-primary md:text-[38px]">
            {article.title}
          </h1>

          <div className="mt-4">
            <ArticleMeta
              readingTime={article.readingTime}
              publishedAt={article.publishedAt}
              modifiedAt={article.modifiedAt}
              showRevision
            />
          </div>

          {/*
            Hero is the LCP element: priority, fixed 3:2 box, no text overlay.
            Mag thumbnails frequently have the title baked into the image, so an
            overlay would collide with it.
          */}
          {article.featuredImage && (
            <div className="relative mt-6 aspect-[3/2] w-full overflow-hidden rounded-card bg-surface-raised">
              <Image
                src={article.featuredImage.url}
                alt={article.featuredImage.alt}
                fill
                sizes="(max-width: 1023px) 100vw, 700px"
                className="object-cover"
                priority
              />
            </div>
          )}
        </div>
      </Section>

      <Section className="!pt-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="mb-8 lg:hidden">
              <TableOfContents headings={article.outline} />
            </div>

            <ArticleBody html={article.content} />

            <div className="mt-12 max-w-prose space-y-8">
              <AuthorBox author={article.author} />

              <NewsletterCta />

              {/* Renders nothing when there are no approved comments. */}
              <CommentList thread={comments} />

              <CommentForm articleId={article.id} />
            </div>
          </div>

          {/* Inline-end column — the LEFT side in RTL. */}
          <aside className="hidden w-[260px] shrink-0 lg:block">
            <TableOfContents headings={article.outline} />
          </aside>
        </div>
      </Section>

      {related.items.length >= 3 && (
        <Section className="!pt-0">
          <h2 className="mb-6 text-[22px] font-bold text-text-primary">مطالب مرتبط</h2>
          <ArticleGrid articles={related.items} />
        </Section>
      )}
    </main>
  );
}
