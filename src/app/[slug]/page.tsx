import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  getArticle,
  getArticles,
  getCategories,
  getPreviewArticle,
} from '@/features/mag/api/v1/mag.service';
import { hasPreviewSecret, previewSecret } from '@/features/mag/lib/preview-secret';
import { getComments } from '@/features/mag/api/v1/mag.comments.service';
import { MagNotFoundError } from '@/features/mag/types/mag.types';
import { toMetadata } from '@/features/mag/lib/seo';
import { articleJsonLd, breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { bidiTitle } from '@/features/mag/lib/bidi-title';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { articleKicker, authorInitial, cardCategory } from '@/features/mag/lib/card';
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
 * In Draft Mode the segment is still a SLUG — `api/draft` resolves WordPress's
 * post ID before redirecting, so an article has one URL shape whether it is
 * published or not, and the author previews the address the piece will live at.
 * `magPreview` looks the slug up across every status and returns the newest
 * autosave, so the editor sees what they just typed rather than the last saved
 * revision.
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
  const [related, onward, latest, comments, categories] = await Promise.all([
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
    /* For the kicker's href only: which content types have a real category
       archive, so the chip links to it instead of spending a 301 on the query
       form. Same question FilterBar asks, and the same cached query. */
    getCategories(),
  ]);

  const category = cardCategory(article);
  const kicker = articleKicker(
    article,
    categories.map((c) => c.slug),
  );
  const heroRatios = article.featuredImage
    ? heroAspectRatios(article.featuredImage)
    : null;

  /* Both, not either. The ratios are derived from the image's own dimensions,
     and an image without them cannot be laid out CLS-safely — so it does not
     get a column either. */
  const hasHero = Boolean(article.featuredImage && heroRatios);

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
  /*
    THE DEDUPE COVERS THE FALLBACK TOO, and it did not before.

    `onwardInType` was filtered against «مطالب مرتبط» from the day it was
    written. The recency fallback underneath it was not — so on a content type
    too small to fill the panel, the reader could meet the same article in both
    places, which is the exact failure the filter exists to prevent. It was
    invisible while the two panels sat in different columns at opposite edges
    of a three-column row; now they are a rail and a block on the same reading
    path, one after the other on a phone.

    `relatedRendered` and not `related.items`: the section below only renders
    at three or more, so with fewer than three there is nothing to collide with
    and filtering against it would thin the panel for no reason.
  */
  const relatedRendered = related.items.length >= 3 ? related.items : [];
  const relatedSlugs = new Set(relatedRendered.map((a) => a.slug));
  /* THREE, NOT FOUR, and the rail's height budget is why. The panel is 446px
     at four items and 366 at three, and every pixel it takes comes off the
     contents list above it — at four, an ordinary four-heading ToC starts
     scrolling at a 1280×800 window. Three also matches «مطالب مرتبط» below.
     The count is shared by both placements so they cannot drift. */
  const onwardInType = onward.items.filter((a) => !relatedSlugs.has(a.slug)).slice(0, 3);
  const onwardItems =
    onwardInType.length > 0
      ? onwardInType
      : latest.items.filter((a) => !relatedSlugs.has(a.slug) && a.slug !== article.slug).slice(0, 3);
  const onwardTitle =
    onwardInType.length > 0 ? `بیشتر در ${article.contentType.name}` : 'تازه‌ترین مطالب';

  /* Mapped once. The panel renders in the rail above `xl` and after the body
     below it, and two call sites building their own list is how the two
     placements end up showing different articles. */
  const onwardCardItems = onwardItems.map((a) => ({
    slug: a.slug,
    title: a.title,
    meta: `${toPersianDigits(a.readingTime)} دقیقه مطالعه`,
  }));

  const crumbs = [
    { name: MAG_NAME, href: '/' },
    { name: category.name, href: category.href },
    { name: article.title, href: `/${article.slug}` },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="mag-gutter">
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
      {/*
        THE HEADER IS ONE BLOCK, NOT THREE STACKED ONES.

        It used to run title → meta → full-width hero → body, so the reader met
        a headline and a picture before a sentence. Bounding the hero to the
        title's measure shortened the picture without changing that order. This
        changes the order: text column and image sit side by side, the whole
        header occupies one screen, and the body starts directly under it.

        DIRECTION. The FIGURE takes grid column 1, which RTL resolves to the
        right — image right, text left. This comment used to say the opposite,
        and it was describing the arrangement before the reviewer asked for the
        image on the inline-start side; the code moved and the note did not.
        Nothing here names a side: swap `dir` and the whole thing mirrors.
        `left`/`right` would have looked identical in Persian and been silently
        wrong in the LTR case. The text column carries `order-2` rather than
        being second in the DOM, so a screen reader still meets the h1 before
        the figure.

        THE HEADER ROW IS THE BODY ROW, AND THE IMAGE KEEPS ITS SIZE. Getting
        both at once took three attempts and they are worth recording.

        First this row was `[320px 700px]` gap 56 while the body was
        `[260px 704px 300px]` gap 48, so the headline began 68px inside its own
        article's first paragraph. Then it was cut to the body's inline-start
        track, `[208px 700px]` — which closed the offset and cost the image a
        third of its width: 208 of a 940 pair is 22%, against the reference's
        31.5% and this project's own recorded 31%. Then it went back to 340 and
        the offset came back with it.

        The 1224 container settles it. The body row is now `[340 64 700]` and
        this row is the same two tracks, because the third column is gone and
        the rail is 340 wide — the image's width. So the image sits exactly
        above the rail, the h1 exactly above the first paragraph, and the image
        is 340: 30.8% of the 1104 pair, against the reference's 31.5%.

        There was never a version of this with a third column where both were
        possible. 68px was the bad middle — too big to look intentional, too
        small to look structural — and the way out was the row, not a
        compromise between the two numbers.

        The text column still caps at 700 from `md` up, so the headline is
        never wider than the paragraph it introduces, and the image gives way
        below `xl` rather than the measure — 300 at `lg`, 240 at `md`.

        MOBILE STACKS WITH THE IMAGE FIRST, via `order`, and that is a choice
        rather than a fallback — on a phone the picture establishes the subject
        in the space a headline does not have. DOM order stays text-first so a
        screen reader does not meet a figure before the page's h1; `order` moves
        only the visual sequence, which is the one case where the two are
        allowed to disagree.
      */}
      <div
        /*
          THE TEXT COLUMN IS THE 700px MEASURE, and that is the number that
          cannot move: it is calibrated to IRANYekanX at 70–73 characters (see
          tailwind.config.ts). The image takes the rest.

          Below xl both shrink together; at md the pair has 728px to live in, so
          the IMAGE drops to 240 rather than the text column dropping under its
          measure. Rendered widths are in the changelog — measured, not taken
          from the reference's numbers.

          WITH NO IMAGE THIS IS NOT A GRID AT ALL. `grid-cols` applies only in
          the hero branch, so the text column becomes an ordinary block at its
          own measure: no empty cell, no reserved track, no gap collapsing to
          nothing. A grid with one child still reserves the second column, which
          is why this is a class swap and not a conditional child.

          54 of 54 articles take the no-image branch whenever the CMS has no
          featured image, and `575f922`'s rule governs it — a missing image
          leaves no trace.
        */
        data-hero-grid=""
        className={
          hasHero
            ? 'mt-5 grid gap-6 md:grid-cols-[240px_minmax(0,700px)] md:items-center md:gap-8 lg:grid-cols-[300px_minmax(0,700px)] lg:gap-10 xl:max-w-[1104px] xl:grid-cols-[340px_minmax(0,700px)] xl:gap-16'
            : 'mt-5 max-w-[700px]'
        }
      >
        <div className="order-2 min-w-0">
        {/*
          THE KICKER — one chip or two, and the design's third is missing on
          purpose.

          The design draws «آموزش · تحلیل تکنیکال · راهنمای ابزار». The third
          segment matches no taxonomy that exists and roadmap.md files it under
          "still needs a decision"; inventing one to fill a chip is how a
          content model grows a sixth axis. The design's own export renders
          two.

          The two here are the axes the model already has — market, then
          content type. A card shows one because a card has room for one; the
          header has room for both. Roughly 60% of the archive carries no
          market, so ONE chip is the common case, and the row simply holds
          fewer items: nothing is reserved and nothing shifts.
        */}
        <div className="flex flex-wrap items-center gap-2">
          {kicker.map((chip) => (
            <CategoryChip key={chip.href} name={chip.name} href={chip.href} />
          ))}
        </div>

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

          BUT `balance` IS DESKTOP-ONLY NOW, because on a phone it costs width
          and buys nothing. Reported from a device as the title not using the
          space it has, and measured across four headlines at 390 and 320 —
          widest line as a share of the column, balance against pretty, with
          the LINE COUNT IDENTICAL in every single case:

            stress-rich-article       390    69%  →  97%
            headline-clause-break     390    79%  →  87%
            notcoin-guide             320    79%  →  87%
            fundamental-analysis      390    77%  →  77%

          Balancing evens the lines by making them all shorter. At 1440 that is
          the point — it is what stops «…ایران؛ آموزش کامل خرید،» stranding a
          clause. At 350px there is no clause to rescue: the same two lines come
          out up to 28% narrower and the headline just looks indented. Same
          shape of finding as the justify measurement — a property that is
          right at the 700px measure and wrong at 350.

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
        <h1 className="mt-4 text-h1 text-text-primary [text-wrap:pretty] md:[text-wrap:balance]">
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

          JUSTIFIED AT md AND UP, on the same evidence and at the same measure
          as the body — see the note in globals.css. It sits in the 700px text
          column, so it gets the treatment that column can defend, and `start`
          below 768 where it cannot. The two properties compose: `pretty`
          chooses where the lines break, `justify` distributes what is left.
        */}
        {article.excerpt && (
          <p className="mt-4 text-dek text-text-secondary [text-wrap:pretty] md:text-justify md:[text-justify:inter-word]">
            {article.excerpt}
          </p>
        )}

        <div
          /*
            NOT `flex-wrap`, and that was the whole defect. The name-and-meta
            column has an intrinsic width of 305px, so at 390 the row needed
            357 against 350 available and the AVATAR wrapped onto a line of its
            own — 101px of byline where the column alone is 49. Measured at
            320 it was 125.

            `flex-1 min-w-0` on the column lets it shrink instead, so the meta
            wraps inside it, which is the thing that is supposed to wrap.
          */
          className="mt-5 flex items-center gap-3 md:gap-4"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-hover text-[15px] text-text-secondary md:h-11 md:w-11 md:text-[16px]"
          >
            {authorInitial(article.author.name)}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link
              href={`/author/${article.author.slug}`}
              className="inline-flex min-h-6 items-center text-[15px] font-medium text-text-primary transition-colors hover:text-accent"
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

        {/*
          THE IMAGE COLUMN.

          The wrapper is not decoration. Without it the <figure> is a direct
          grid child at the default `order: 0`, so it sorts BEFORE the text
          column's `order: 1` and takes the 700px track while the text takes
          320. Measured that way for one build — and it looks deliberate in a
          screenshot, because the picture simply appears to be the wide one.
        */}
        <div className="order-1 min-w-0">
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
          <figure data-hero="">
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
                sizes="(max-width: 767px) 100vw, (max-width: 1279px) 300px, 320px"
                priority
                rounded="rounded-card"
              />
            </div>
            {article.featuredImage.alt && (
              <figcaption className="mt-2.5 text-caption text-text-muted">
                {article.featuredImage.alt}
              </figcaption>
            )}
          </figure>
        )}
        </div>
      </div>


      {/*
        TWO COLUMNS: THE TEXT, AND ONE RAIL THAT CARRIES BOTH NAVIGATIONS.

        The third column is gone, and the container is why. With the cap at
        1224 the content box is 1104px, and a three-column row needs 1240 for
        the 700px measure to survive — impossible at any padding. The reference
        this width came from runs two columns for the same reason.

        So the table of contents and «بیشتر در ...» share one rail. They belong
        together on their own merits: both are navigation, answering the same
        question at the same moment — the ToC moves the reader INSIDE the
        article, the onward panel moves them OUT of it. A reader chooses their
        next article mid-read, not after scrolling past the footer, and on a
        41-minute piece whoever reaches the bottom is the smallest part of the
        audience.

        THE ROW IS THE HERO ROW'S ROW: 340 + 64 + 700 = 1104, the same tracks
        the header above uses. The hero image sits exactly above the rail and
        the h1 exactly above the first paragraph — no near-miss offset, which
        this page has now produced twice by getting one of the two rows wrong.

        BREAKPOINT. The row needs 1104 of content, which arrives at a window of
        1224 — the cap plus the two 60px insets. `xl` (1280) is used anyway,
        because Tailwind has that stop and the 1224–1279 band is 56px of
        viewport; those windows get one column when they could hold two, and
        that is a deliberate trade against a custom screen for a 56px range.

        At 1223 the content is 1103 — one pixel short of the row. Below that it
        falls away fast: at 1024 the content is 904 and the rail would be
        904 − 764 = 140px, which is not a rail. One column there, contents as a
        <details> above the article and the onward panel below the body.
      */}
      <div className="mt-9 grid items-start gap-8 xl:mt-11 xl:grid-cols-[340px_minmax(0,700px)] xl:gap-16">
        {/*
          ONE STICKY ELEMENT: THE RAIL, WHICH IS THE GRID ITEM.

          Not each panel individually — that is `397475f`, where `sticky` sat on
          `ArticleAside`'s <nav> inside a wrapper the grid had sized to its own
          content. A sticky element travels only inside its containing block and
          a content-sized box has ZERO travel. Nothing errors, nothing warns,
          the class reads correctly, and it survived two reviews. A sticky GRID
          ITEM resolves against its grid AREA, which spans the row.

          THE ALTERNATIVE WAS BUILT AND MEASURED, AND IT FAILED ON ACCESSIBILITY.
          Sticking only the ToC inside a stretched rail does give the behaviour
          "contents pinned, onward panel scrolls away" — but the onward panel is
          a STATIC sibling below a POSITIONED one, so it scrolls BEHIND the
          pinned contents. Tab then lands on links the reader cannot see:
          measured at 1440, three occluded stops on the 24-heading article and
          one on a seven-heading article, at 800, 900 and 1169 viewport heights
          alike. Two of twelve articles, every height. That is SC 2.4.11, and a
          seven-heading article is not an edge case.

          Pinning the pair removes it by construction: nothing moves relative to
          anything, so nothing can be covered. The price is that the rail must
          FIT THE VIEWPORT, which is what the cap on the ToC's list buys — see
          ArticleAside, where the arithmetic is recorded.

          NO SCROLLBAR ON THIS RAIL. A column with its own scrollbar beside a
          page that also scrolls is two competing scroll contexts, and on a
          trackpad a reader cannot tell which one they are in. The cap is inside
          the ToC panel, on its list, which is the one place an overflow is
          load-bearing rather than a second scroll context for the page.
        */}
        <div className="flex flex-col gap-6 xl:order-1 xl:sticky xl:top-[76px]">
          <ArticleAside headings={article.outline} />

          {/*
            BENEATH THE CONTENTS, IN THE SAME RAIL — above `xl`. Below it this
            renders after the body instead; see the block further down. One
            component, one list, so the two placements cannot drift apart.
          */}
          <div className="hidden xl:block">
            <LinkListCard title={onwardTitle} items={onwardCardItems} />
          </div>
        </div>

        <div className="min-w-0 xl:order-2">
          <ArticleBody html={article.content} />

          {/*
            THE ONWARD PANEL'S MOBILE HOME: after the article, BEFORE
            «مطالب مرتبط».

            NOT inside the <details> that holds the contents below `xl`. That
            disclosure is closed by default and most readers on a phone never
            open it — a panel in there is a panel nobody sees. Putting it after
            the body is the first moment the question it answers ("what now?")
            is actually live.

            It sits above «مطالب مرتبط» rather than beside it because the two
            are deduped, not duplicated: this one is more of the same content
            type, that one is related articles, and `onwardCardItems` already
            removes anything appearing in the other. Order matters — same-type
            reading is the more specific offer, so it goes first.
          */}
          <div className="mt-10 xl:hidden">
            <LinkListCard title={onwardTitle} items={onwardCardItems} />
          </div>

          <div className="mt-10 flex flex-col gap-8">
            <ShareRow slug={article.slug} title={article.title} />
            <AuthorBox author={article.author} />
            <CommentList thread={comments} />
            <CommentForm articleId={article.id} />
          </div>
        </div>
      </div>

      {relatedRendered.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <div className="mb-6 flex items-center gap-4">
            <h2
              id="related-heading"
              className="text-h2 font-bold tracking-[-0.2px] text-text-primary"
            >
              مطالب مرتبط
            </h2>
            <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedRendered.map((item) => (
              <PostCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
