import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import { getArticle, getArticles, getPreviewArticle } from '@/features/mag/api/v1/mag.service';
import { hasPreviewSecret, previewSecret } from '@/features/mag/lib/preview-secret';
import { getComments } from '@/features/mag/api/v1/mag.comments.service';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { toMetadata } from '@/features/mag/lib/seo';
import { articleJsonLd, breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { bidiTitle } from '@/features/mag/lib/bidi-title';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { authorInitial, cardCategory } from '@/features/mag/lib/card';
import { toPersianDigits } from '@/features/mag/lib/format';
import Link from 'next/link';
import { PreviewBanner } from './_components/PreviewBanner';
import {
  ArticleAside,
  ArticleBody,
  ArticleMeta,
  AuthorBox,
  Breadcrumbs,
  CardImage,
  CategoryChip,
  CommentForm,
  CommentList,
  LinkListCard,
  NewsletterCta,
  PostCard,
  ShareRow,
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
 * WITHOUT THIS THE ARTICLE PAGE IS NOT CACHED AT ALL.
 *
 * A dynamic segment with no `generateStaticParams` is treated as fully
 * dynamic: Next server-renders it on every request and sends
 * `Cache-Control: private, no-cache, no-store, must-revalidate`. Measured
 * before this existed — the route was absent from `dynamicRoutes` in
 * prerender-manifest.json entirely, so `revalidate = 300` above was dead
 * code.
 *
 * That is the worst place in the product for it to happen. Articles are where
 * search traffic lands, so this meant: the ArvanCloud CDN could never hold an
 * article, every request re-ran the article, related and comment queries, and
 * all of it went at a /graphql that nginx limits to 10 r/s. A crawl burst
 * would spend that budget on pages that had not changed in months.
 *
 * Returning the slugs prerenders the archive at build time. `dynamicParams`
 * stays at its default of true, so anything published after the build is still
 * generated on demand and then ISR-cached.
 *
 * The catch matters: a build machine that cannot reach WordPress degrades to
 * an empty list — every article generated on demand and cached — rather than
 * failing the build outright.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const articles = await getArticles({ page: 1, perPage: 200 });
    return articles.items.map((article) => ({ slug: article.slug }));
  } catch {
    return [];
  }
}

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

/**
 * The article, or the draft an editor is previewing.
 *
 * In Draft Mode the route segment is a POST ID rather than a slug — see
 * `api/draft`. `magPreview` returns the newest autosave, so the editor sees
 * what they just typed rather than the last saved revision.
 *
 * Reading `draftMode()` does NOT make this route dynamic. During static
 * generation `isEnabled` is false and Next does not bail out; the page only
 * switches to per-request rendering once the cookie is actually set. Verified
 * against the build output rather than assumed, because getting this wrong
 * silently un-caches the most important page in the product.
 */
async function fetchArticleOrPreview(segment: string) {
  const { isEnabled } = await draftMode();

  if (isEnabled && hasPreviewSecret()) {
    try {
      return await getPreviewArticle(segment, previewSecret());
    } catch (error) {
      if (error instanceof MagNotFoundError) return null;
      /*
        A preview failure must not 500. An editor whose CMS session or secret
        has drifted should still see the published article rather than an error
        page they cannot interpret.
      */
      return fetchArticle(normaliseSlug(segment));
    }
  }

  return fetchArticle(normaliseSlug(segment));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();
  const article = await fetchArticleOrPreview(slug);

  if (!article) return { title: 'مقاله پیدا نشد' };

  /*
    A preview must never be indexable. An indexed draft is worse than having no
    preview at all — it puts unpublished editorial in front of readers and
    competes with the real URL once it publishes.
  */
  if (isPreview) {
    return {
      title: `پیش‌نمایش — ${article.title}`,
      robots: { index: false, follow: false, nocache: true },
    };
  }

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
  const { isEnabled: isPreview } = await draftMode();
  const article = await fetchArticleOrPreview(slug);

  if (!article) notFound();

  /*
    Related, onward reading and comments in parallel — none depends on another,
    and sequential awaits would add round trips on every ISR regeneration.

    A comment fetch failure must not take the article down: comments are
    supplementary, the article is the point. It degrades to an empty thread,
    which the list already handles by rendering nothing.
  */
  const [related, onward, comments] = await Promise.all([
    getArticles({
      page: 1,
      perPage: 3,
      contentType: article.contentType.slug,
      excludeSlug: article.slug,
    }),
    getArticles({ page: 1, perPage: 4, excludeSlug: article.slug }),
    getComments(article.slug).catch(() => ({ items: [], total: 0 })),
  ]);

  const category = cardCategory(article);

  const crumbs = [
    { name: MAG_NAME, href: '/' },
    { name: category.name, href: category.href },
    { name: article.title, href: `/${article.slug}` },
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-24">
      {isPreview && <PreviewBanner />}

      <JsonLdScript
        data={[
          articleJsonLd(article),
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: magUrl(c.href) }))),
        ]}
      />

      <div className="pt-6 lg:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      {/* Title block, capped at 820 — the design's measure for a 44px h1. */}
      <div className="mt-5 max-w-[820px]">
        <CategoryChip name={category.name} href={category.href} />

        <h1 className="mt-4 text-[30px] font-bold leading-[1.3] tracking-[-0.6px] text-text-primary [text-wrap:pretty] md:text-[44px]">
          {bidiTitle(article.title)}
        </h1>

        {/*
          NO LEAD PARAGRAPH, and the omission is deliberate.

          The design draws a 20px standfirst here. There is no `dek` field to
          fill it — `decisions.md` dropped the idea because the live site's
          excerpts are auto-truncated mid-sentence, which is the evidence that
          this team does not write summaries. On a CARD the fallback is the
          article's own H2 headings, which works: the card has nothing else.

          Here it does not. The table of contents sits a few hundred pixels
          below and lists those same headings, so a derived lead would print
          the article's outline twice on one screen — and the body's first
          paragraph, which follows immediately, is already the standfirst in
          practice.

          When a real dek field exists, it goes here.
        */}

        <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-border-subtle pb-6">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-hover text-[16px] text-text-secondary"
          >
            {authorInitial(article.author.name)}
          </span>

          <div className="flex min-w-0 flex-col gap-1">
            <Link
              href={`/author/${article.author.slug}`}
              className="text-[15px] font-medium text-text-primary transition-colors hover:text-accent"
            >
              {article.author.name}
            </Link>
            <ArticleMeta
              readingTime={article.readingTime}
              publishedAt={article.publishedAt}
              modifiedAt={article.modifiedAt}
              showRevision
            />
          </div>

          <div className="ms-auto">
            <ShareRow slug={article.slug} title={article.title} />
          </div>
        </div>
      </div>

      {/* Featured image — the ONE priority image on this page. */}
      {article.featuredImage && (
        <figure className="mt-7">
          <div className="h-[220px] md:h-[420px]">
            <CardImage
              image={article.featuredImage}
              sizes="(max-width: 1023px) 100vw, 1360px"
              priority
              rounded="rounded-card"
            />
          </div>
          {article.featuredImage.alt && (
            <figcaption className="mt-2.5 text-[12.5px] leading-[1.7] text-text-muted">
              {article.featuredImage.alt}
            </figcaption>
          )}
        </figure>
      )}

      {/*
        THREE COLUMNS ONLY AT xl (1280+).

        The obvious `lg:grid-cols-[260px_1fr_300px]` is wrong and measurably
        so: at exactly 1024 it leaves the article column 299px wide — about 30
        Persian characters a line, less than half the 70–73 the type scale is
        built for. The design's responsive note says the post page drops to two
        columns between 1024 and 1279, with the contents collapsing into a
        `<details>` above the article, and this is why.

        So: one column below lg, article + right rail at lg, all three at xl.
      */}
      <div className="mt-9 grid items-start gap-8 lg:mt-11 lg:grid-cols-[1fr_300px] lg:gap-12 xl:grid-cols-[260px_1fr_300px]">
        <div className="lg:order-2 lg:col-span-2 xl:order-1 xl:col-span-1">
          <ArticleAside headings={article.outline} />
        </div>

        <div className="min-w-0 lg:order-3 xl:order-2">
          <ArticleBody html={article.content} />

          <div className="mt-10 flex flex-col gap-8">
            <AuthorBox author={article.author} />
            <CommentList thread={comments} />
            <CommentForm articleId={article.id} />
          </div>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:order-4 lg:top-[76px] xl:order-3">
          <LinkListCard
            title="ادامه‌ی مسیر"
            items={onward.items.slice(0, 4).map((a) => ({
              slug: a.slug,
              title: a.title,
              meta: `${toPersianDigits(a.readingTime)} دقیقه مطالعه`,
            }))}
          />
          <NewsletterCta />
        </aside>
      </div>

      {related.items.length >= 3 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <div className="mb-6 flex items-center gap-4">
            <h2
              id="related-heading"
              className="text-[22px] font-bold tracking-[-0.2px] text-text-primary md:text-[24px]"
            >
              مطالب مرتبط
            </h2>
            <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.items.map((item) => (
              <PostCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
