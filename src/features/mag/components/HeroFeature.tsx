import Link from 'next/link';
import { CardImage } from './CardImage';
import { CategoryChip } from './CategoryChip';
import { cardCategory, cardDek } from '../lib/card';
import { formatJalaliShort, formatReadingTime, toDateTimeAttr } from '../lib/format';
import type { ArticleSummary } from '../types/mag.types';
import { bidiTitle } from '../lib/bidi-title';
import { heroAspectRatios } from '../lib/hero-ratio';

/**
 * The lead card: image on top at the artwork's own proportions, text below.
 *
 * ── THE TEXT USED TO SIT ON THE IMAGE, and the team asked for it off ────────
 *
 * Bottom-aligned over a scrim, which is a fine pattern for photography and the
 * wrong one for this archive: most featured images carry their headline baked
 * into the artwork, so the card printed the title twice, one on top of the
 * other, and the two collided (reported 2026-10-05 with a screenshot of
 * «توصیه‌های وارن بافت»). No scrim strength fixes two texts in one place.
 *
 * So the image gets its own box and the text gets the card surface. That also
 * retires the on-media token swap — the text is on the theme's own surface in
 * every theme now.
 *
 * ── The box takes the IMAGE'S ratio, not a chosen one ───────────────────────
 *
 * With nothing overlaid, cropping is the only way to lose the baked-in
 * headline, and the archive is two shapes — 1376×768 (1.79) and 1200×800
 * (1.50), 76 of 100 measured. Any fixed box crops one of them. The ratio comes
 * from `mediaDetails`, so it is known at render and CLS stays 0 — the same
 * guarantee the article hero gets from the same helper, with its mobile floor
 * (1.5) because this column is never the 1360px full-bleed that floor guards.
 *
 * THE LCP ELEMENT on the home page, so its image is the one `priority` request.
 *
 * One link wrapping the whole card, whose accessible name is the title. No
 * `aria-label` duplicating it, and the chip is a plain span, not a nested link.
 */
export function HeroFeature({ article }: { article: ArticleSummary }) {
  const category = cardCategory(article);
  const dek = cardDek(article, 1);
  const image = article.featuredImage;

  return (
    <article
      /* `data-hero-card`: MediaErrorGuard's hook. An image that 404s at
         runtime marks the card, and the stylesheet drops the media box — so a
         failed image reads exactly like an article that never had one. */
      data-hero-card=""
      className="group relative flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none"
    >
      {image && (
        <div
          data-hero-media=""
          className="relative"
          style={{ aspectRatio: heroAspectRatios(image).mobile }}
        >
          <CardImage
            image={image}
            /* The 1.55fr column of a 1224px container is ~730px; 62vw asked
               for 893px at 1440. */
            sizes="(max-width: 1023px) 100vw, 740px"
            priority
            rounded=""
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-6 md:p-8">
        <CategoryChip name={category.name} variant="solid" className="self-start" />

        <h2 className="text-display font-bold tracking-[-0.4px] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h2>

        {dek && (
          <p className="max-w-[60ch] text-[15px] font-light leading-[1.85] text-text-secondary md:text-[17px]">
            {dek}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[13px] text-text-muted">
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

        <h3 className="text-h3 font-semibold leading-[1.6] text-text-primary [text-wrap:pretty]">
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
