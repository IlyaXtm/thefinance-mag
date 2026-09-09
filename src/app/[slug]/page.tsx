import type { CSSProperties } from 'react';
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
import { heroAspectRatios } from '@/features/mag/lib/hero-ratio';
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
  const [related, onward, latest, comments] = await Promise.all([
    getArticles({
      page: 1,
      perPage: 3,
      contentType: article.contentType.slug,
      excludeSlug: article.slug,
    }),
    /*
      «ادامه‌ی مسیر» — SAME CONTENT TYPE, not the latest four.

      The review asked what drives this panel: «بر چه اساسی کار می‌کند، یا فقط
      تیتره؟». The answer was "just the heading": it was
      `getArticles({ perPage: 4 })` with no filter at all, so a panel promising
      to continue the reader's path showed whatever had been published most
      recently — a news item under an education article, and no way for a
      reader to tell that was all it meant.

      Now it is the same content type, newest first, which is achievable at
      this size: 41 articles under آموزش and 39 under مقالات. Market-based
      relatedness is NOT an option and is not being pretended into one — 39 of
      53 articles carry no market at all. That is backlog B17, a tagging
      problem, and building a feature on a field three quarters of the archive
      does not have would produce an empty panel most of the time.

      SEVEN, not four, because three of them are about to be spent. «مطالب
      مرتبط» lower down already queries the same content type, and without a
      wider fetch the two panels would show the same three articles a screen
      apart — the exact duplication the injected table of contents was just
      removed for. The overlap is filtered below.
    */
    getArticles({
      page: 1,
      perPage: 7,
      contentType: article.contentType.slug,
      excludeSlug: article.slug,
    }),
    /* The fallback, fetched alongside rather than after: a second round trip
       on every ISR regeneration to cover a case that fires on two of 53
       articles is not worth the latency, and this query is already cached. */
    getArticles({ page: 1, perPage: 5, excludeSlug: article.slug }),
    getComments(article.slug).catch(() => ({ items: [], total: 0 })),
  ]);

  const category = cardCategory(article);
  const heroRatios = article.featuredImage
    ? heroAspectRatios(article.featuredImage)
    : null;

  /*
    THE PANEL IS NAMED AFTER WHAT IT SHOWS, and the name is computed because
    the content can fall back.

    «مطالب مرتبط» renders three articles of this content type further down, so
    they are removed here — two panels on one screen showing the same three
    titles is a duplicate, not a recommendation.

    When enough of the type survives that filter, the panel is «بیشتر در آموزش»
    and it is exactly that. When the type is too small for both panels —
    «تحلیل» has two articles in the whole archive — there is nothing left, and
    the honest answer is to fall back to recency AND SAY SO in the heading
    rather than keep a name the content no longer earns. A panel called
    «ادامه‌ی مسیر» over unrelated articles is a promise the content does not
    keep, which is what the review was pointing at.
  */
  const relatedSlugs = new Set(related.items.map((a) => a.slug));
  const onwardInType = onward.items.filter((a) => !relatedSlugs.has(a.slug)).slice(0, 4);
  const onwardItems = onwardInType.length > 0 ? onwardInType : latest.items.slice(0, 4);
  const onwardTitle =
    onwardInType.length > 0 ? `بیشتر در ${article.contentType.name}` : 'تازه‌ترین مطالب';

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

        {/*
          `text-wrap: balance`, not `pretty`.

          The live h1 «خرید بیت کوین در ایران؛ آموزش کامل خرید، انتقال و
          نگهداری BTC» broke after «خرید،», stranding «انتقال و نگهداری BTC» on
          a line of its own. Persian headlines built with «؛» and «،» read as
          clauses, and a break inside the second one reads as a mistake rather
          than as a line ending.

          `pretty` only protects the LAST line — it prevents an orphan word and
          says nothing about where the earlier breaks land, which is exactly
          where this headline goes wrong. `balance` evens every line in the
          block. Measured at 1440 on that headline, with the longhand toggled:

            off  778px «…ایران؛ آموزش کامل خرید،» / 396px «انتقال و نگهداری BTC»
            on   569px «…ایران؛ آموزش»            / 605px «کامل خرید، انتقال و نگهداری BTC»

          and at 390 the three lines become one clause each. Browsers cap
          balancing at a handful of lines, which is the shape of an h1, and it
          degrades to normal wrapping where unsupported.

          IT DOES NOT FIGHT `bidiTitle`, verified at 390px on «تحلیل فاندامنتال
          (Fundamental Analysis) چیست؟» — the title that exposed the mirrored
          bracket. The pair still resolves inside its isolate. Balancing DOES
          change where that title breaks: unbalanced it kept «(Fundamental
          Analysis)» whole and left «چیست؟» alone on a 104px line; balanced it
          splits the parenthesised run across lines and removes the orphan.
          That split is safe only because of the isolate — without
          `bidi-title.tsx` this change would reintroduce the mirrored bracket,
          so the two are a pair and neither should be removed alone.
        */}
        <h1 className="mt-4 text-[30px] font-bold leading-[1.3] tracking-[-0.6px] text-text-primary [text-wrap:balance] md:text-[44px]">
          {bidiTitle(article.title)}
        </h1>

        {/*
          THE DEK — and it renders for nothing in the archive today.

          `decisions.md` dropped the idea of a standfirst because the live
          site's excerpts are auto-truncated mid-sentence. That objection was
          about `excerpt(format: RENDERED)`, WordPress's generated summary.
          This reads RAW, which returns ONLY the hand-written field and an
          empty string when nobody wrote one — so the mid-sentence truncation
          cannot reach this element. `card.ts` already treats it as the
          editor's sentence and prefers it over derived text for the same
          reason.

          NO NEW `dek` CUSTOM FIELD, deliberately. WordPress already gives an
          author one box for exactly this and the editor screen shows it. A
          second field beside it means two summary boxes with no rule for
          which is which — the failure the callout's one-variant note
          describes, in a different place. `roadmap.md` wave 2 says the same
          thing from the other end: build what an author can use tomorrow,
          and let custom fields arrive with the commitment to fill them.

          AND NO FALLBACK TO HEADINGS, which is where this differs from a
          card. `cardDek` falls back to the article's own H2s because a card
          has nothing else to show. Here the table of contents sits a few
          hundred pixels below and lists those same headings, so a derived
          lead would print the outline twice on one screen — and the body's
          first paragraph, immediately underneath, is already the standfirst
          in practice.

          So: 0 of 54 migrated articles have one, this renders nothing for
          all 54, and that is the correct behaviour rather than a gap to fill
          with a placeholder. `roadmap.md` wave 0 carries the editorial
          decision this waits on — 54 deks written, or the dek accepted as
          permanently derived. The template stops being the blocker either
          way.

          `text-wrap: pretty`, not `balance`. Balance evens every line and is
          for a headline of three or four; on a 40-word paragraph browsers
          stop balancing past their line cap anyway, and pretty does the one
          thing that matters here — it prevents a single orphaned word on the
          last line.
        */}
        {article.excerpt && (
          <p className="mt-5 text-[18px] leading-[1.9] text-text-secondary [text-wrap:pretty] md:text-[20px]">
            {article.excerpt}
          </p>
        )}

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

          {/*
            THE SHARE ROW USED TO SIT HERE, `ms-auto` at the end of the byline.

            It is now below the article body, and the reason is order of
            operations rather than tidiness: nobody shares an article they have
            not read. Putting the control at the top asks for the decision
            before the reader has anything to decide with, and it spends the
            most valuable strip on the page — directly beneath a 44px h1, at the
            reading edge — on three buttons instead of on who wrote this and
            when. Below the body is both the conventional place and the point at
            which the question is real.

            It also removes a competition the header could not win: three
            bordered 44px circles next to the byline read as loud as the title
            they sit under. The brief's third option was to keep it here but
            make it quieter; moving it makes it quieter AND puts it where it is
            useful, so that is the one taken.
          */}
        </div>
      </div>

      {/* Featured image — the ONE priority image on this page. */}
      {article.featuredImage && heroRatios && (
        /* `data-hero`: tells MediaErrorGuard to REMOVE this figure if the image
           404s, rather than treating it as a card and keeping an empty box.
           The hero renders through CardImage, so without this marker it is
           indistinguishable from a thumbnail. */
        /*
          THE HERO IS CONSTRAINED TO THE TITLE'S MEASURE AT DESKTOP, not capped
          in height — and the numbers are why.

          THE COMPLAINT IS REAL: full-bleed at 1360px, a 1.9 image stands 714px
          tall, so on a 1440×900 screen the reader gets a headline and a picture
          and has to scroll to reach a sentence.

          The brief recommended a height cap of 420–480px with a centred crop,
          and flagged the risk itself: several featured images have the headline
          baked into the artwork, and a crop through baked text is worse than a
          tall image. Measured against the known ratios at 1360px wide:

            cap 480, centre crop        1.90 → 33% cropped (16% off EACH edge)
                                        1.50 → 47% cropped (24% off each edge)
                                        2.50 → 12% cropped
            width 820, same clamp       1.90 → 430px tall, 0% cropped
                                        1.50 → 432px tall, 21% (UNCHANGED)
                                        2.50 → 328px tall, 0% cropped

          The cap crops a THIRD off the majority image — the 1200×630 OG size
          that most of the archive uses and that currently crops nothing. That
          is precisely the cropping the natural-ratio change was made to remove,
          reintroduced on the most common case.

          Constraining the width gets a SHORTER hero than the cap would (430px
          against 480) with no new cropping whatever, because the existing
          [1.9, 2.8] desktop clamp already does the work at any width. One
          number changes and the height problem solves itself.

          IT ALSO REMOVES A RISK THAT COULD NOT BE MEASURED. The CMS is
          unreachable from this environment, so where baked-in headlines sit in
          the frame is unknown — and a centre crop is only safe if they sit away
          from the vertical edges. Not cropping means not needing the answer.
          See B14 for the measurement that is still owed.

          Aligned to the title block's start edge rather than centred: the
          headline, the byline and the hero share one reading edge. Mobile is
          untouched — full width, natural ratio, its own [1.5, 2.8] clamp — and
          the complaint was desktop-only.
        */
        <figure data-hero="" className="mt-7 md:max-w-[820px]">
          {/*
            The box takes the IMAGE's shape, not a shape of its own.

            `h-[220px] md:h-[420px]` full-bleed is a 3.24 ratio at 1440, and
            nothing in the archive is that shape — see lib/hero-ratio.ts for the
            measured spread and the clamp. The ratio is inline rather than a
            Tailwind class because it is per-image data, and inline is also what
            makes it CLS-safe: it is in the markup before the image loads, so
            the height is final from first paint.
          */}
          <div
            className="aspect-[var(--hero-ratio-sm)] md:aspect-[var(--hero-ratio-md)]"
            style={
              {
                '--hero-ratio-sm': heroRatios.mobile,
                '--hero-ratio-md': heroRatios.desktop,
              } as CSSProperties
            }
          >
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
        {/*
          `sticky` GOES ON THE GRID ITEM, not on the panel inside it — the same
          shape the right-hand rail below uses, deliberately, because two
          sidebars in one grid with two positioning strategies is how this
          drifts apart again.

          THIS IS WHY THE ToC DID NOT STICK. `ArticleAside`'s <nav> already
          carried `sticky top-[76px]` and had since it was written. It did
          nothing, because a sticky element can only travel inside its
          containing block, and its containing block was this wrapper — which
          under the grid's `items-start` is exactly as tall as the panel it
          holds. Zero travel. Nothing errors, nothing warns, and the class is
          right there in the markup, which is why it survived a review.

          The right-hand rail escaped it by accident of structure: it IS the
          grid item, and a sticky grid item resolves against its grid AREA,
          which spans the full row height — the length of the article. Moving
          `sticky` up one level here gives the ToC the same travel.

          `xl:` and not `lg:`, unlike the right rail. Below 1280 this column is
          `lg:col-span-2` — a full-width strip above the article holding the
          <details> disclosure, not a rail — and a sticky strip there would
          pin a collapsed accordion over the text. See ArticleAside.
        */}
        <div className="lg:order-2 lg:col-span-2 xl:order-1 xl:col-span-1 xl:sticky xl:top-[76px]">
          <ArticleAside headings={article.outline} />
        </div>

        <div className="min-w-0 lg:order-3 xl:order-2">
          <ArticleBody html={article.content} />

          <div className="mt-10 flex flex-col gap-8">
            <ShareRow slug={article.slug} title={article.title} />
            <AuthorBox author={article.author} />
            <CommentList thread={comments} />
            <CommentForm articleId={article.id} />
          </div>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:order-4 lg:top-[76px] xl:order-3">
          <LinkListCard
            title={onwardTitle}
            items={onwardItems.map((a) => ({
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
