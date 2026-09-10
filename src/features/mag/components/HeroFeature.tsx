import Link from 'next/link';
import { CardImage } from './CardImage';
import { CategoryChip } from './CategoryChip';
import { cardCategory, cardDek } from '../lib/card';
import { formatJalaliShort, formatReadingTime, toDateTimeAttr } from '../lib/format';
import type { ArticleSummary } from '../types/mag.types';
import { bidiTitle } from '../lib/bidi-title';

/**
 * The lead card: full-bleed image, gradient, content bottom-aligned.
 *
 * THE LCP ELEMENT on the home page, so its image is the one `priority` request
 * — the design allows exactly one eager image per page.
 *
 * The gradient is `pointer-events:none` and `aria-hidden`: it is a scrim for
 * legibility, not content. Text sits on the darkest end of it
 * (--scrim-from, .94), which is where white clears 4.5:1 comfortably even over
 * a bright photograph.
 *
 * One link wrapping the whole card, whose accessible name is the title. No
 * `aria-label` duplicating it — a duplicate drifts out of sync with the
 * visible text — and the chip inside is a plain span rather than a nested
 * anchor.
 */
export function HeroFeature({ article }: { article: ArticleSummary }) {
  const category = cardCategory(article);
  const dek = cardDek(article, 1);

  /*
    NO ARTWORK MEANS NO OVERLAY TREATMENT — not a smaller one.

    A visual audit reported the lead card as "only a gradient" and proposed
    shrinking it. The gradient IS the no-image state, and shrinking a thing
    that should not be there is the wrong end of the problem: measured with
    every image 404ing, the card rendered an 812×472 block of scrim over an
    empty `--surface-hover` panel. `575f922`'s rule is that a missing image
    leaves NO TRACE, and 472px of gradient is a large trace.

    CardImage's own placeholder is deliberate and stays — but its recorded
    reason is the GRID: "its neighbours in the grid have images, and a card
    that loses its box makes the row reflow." The lead card has no such
    neighbour and the slot is the entire card, so that reason does not reach
    here and the placeholder was arriving by default rather than by decision.

    So with no image this renders as a text card on the theme's own surface:
    no image layer, no scrim, no `data-on-media`. The last part is the one
    that matters — the on-media tokens are white and deliberately DO NOT flip
    with the theme, so keeping them over a light card surface would be white
    text on #f2f4f7 at about 1.1:1. Removing the scrim without removing them
    is how this fix becomes a worse bug than the one it fixes.
  */
  const hasMedia = Boolean(article.featuredImage);

  return (
    <article /*
        Shorter on a phone. The design specifies a 220px hero image below
        768, but its mobile hero is a stacked block with the text UNDER the
        image; here the text is overlaid, and 220px cannot hold a three-line
        Persian headline plus dek and meta without the scrim swallowing them.
        380 is the measured floor for that content at 26px.
      */
      /* `data-hero-card`: the hook MediaErrorGuard needs to strip this
         treatment at RUNTIME too — an image that 404s produces the same empty
         card as one that was never uploaded, and it must look the same. */
      data-hero-card=""
      data-media-missing={hasMedia ? undefined : ''}
      className="group relative overflow-hidden rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none data-[media-missing]:min-h-0 md:min-h-[380px] lg:min-h-[470px]">
      {hasMedia && (
        <>
          <div className="absolute inset-0" data-hero-media="">
            <CardImage
              image={article.featuredImage}
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 100vw, 62vw"
              priority
              rounded=""
            />
          </div>

          <div
            aria-hidden="true"
            data-hero-scrim=""
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, var(--scrim-from) 0%, var(--scrim-mid) 38%, var(--scrim-to) 72%)',
            }}
          />
        </>
      )}

      {/* data-on-media re-points the text tokens for anything nested here that
          does not name a colour itself — see tokens.css. The elements below
          name --on-media* directly as well; both resolve to the same values,
          so they cannot drift apart. */}
      <div
        /* Present only over media. The guard REMOVES this attribute when the
           image fails, rather than the stylesheet trying to restore the theme
           values inside it — those are three tokens per theme and re-stating
           them is how the two copies drift. */
        {...(hasMedia ? { 'data-on-media': '' } : {})}
        className="relative flex h-full flex-col justify-end gap-3.5 p-6 data-[media-missing]:min-h-0 md:min-h-[380px] md:p-9 lg:min-h-[470px]"
      >
        <CategoryChip name={category.name} variant="solid" className="self-start" />

        <h2 className="max-w-[20ch] text-[26px] font-bold leading-[1.35] tracking-[-0.4px] text-text-primary [text-wrap:pretty] md:text-[36px]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h2>

        {dek && (
          <p className="max-w-[52ch] text-[15px] font-light leading-[1.85] text-text-secondary md:text-[17px]">
            {dek}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-muted">
          <span className="text-text-secondary">{article.author.name}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={toDateTimeAttr(article.publishedAt)}>
            {formatJalaliShort(article.publishedAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span>{formatReadingTime(article.readingTime)} مطالعه</span>
        </div>
      </div>
    </article>
  );
}

/**
 * The two stacked cards beside the hero: `150px | 1fr`.
 *
 * No dek — at 18px in a 150px-thumbnail row there is no space for one that
 * would still be readable, and the design does not draw it.
 */
export function HeroSideCard({ article }: { article: ArticleSummary }) {
  const category = cardCategory(article);

  return (
    <article className="group relative grid grid-cols-[110px_1fr] gap-4 rounded-card border border-border-subtle bg-surface-raised p-4 transition-colors duration-150 hover:border-accent motion-reduce:transition-none sm:grid-cols-[150px_1fr]">
      <div className="min-h-[110px]">
        <CardImage
          image={article.featuredImage}
          sizes="150px"
          rounded="rounded-lg"
          className="h-full"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-[12px] text-accent">{category.name}</span>

        <h3 className="text-[16px] font-semibold leading-[1.6] text-text-primary [text-wrap:pretty] md:text-[18px]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h3>

        <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-text-muted">
          <time dateTime={toDateTimeAttr(article.publishedAt)}>
            {formatJalaliShort(article.publishedAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span>{formatReadingTime(article.readingTime)}</span>
        </div>
      </div>
    </article>
  );
}
