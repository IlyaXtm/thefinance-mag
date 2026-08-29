import Link from 'next/link';
import { CardImage } from './CardImage';
import { CardByline, CardDate } from './CardMeta';
import { CategoryChip } from './CategoryChip';
import { cardCategory, cardDek } from '../lib/card';
import type { ArticleSummary } from '../types/mag.types';

/**
 * The home grid card: 190px image, chip + date, title, dek, byline.
 *
 * `<article>` with ONE link whose accessible name is the title, stretched over
 * the card with an inset pseudo-element. That gives a card-sized hit target
 * with a single tab stop, rather than the three or four a naively linked card
 * produces.
 *
 * Hover is `border-color` plus a 2px lift and nothing else — no shadow growth,
 * no scale. `motion-reduce` drops both.
 *
 * The focus ring lands on the link, and the card must NOT clip it: `rounded`
 * without `overflow-hidden` on the outer element, with the image clipping
 * itself instead.
 */
export function PostCard({ article }: { article: ArticleSummary }) {
  const category = cardCategory(article);
  const dek = cardDek(article);

  return (
    <article className="group relative flex flex-col rounded-card border border-border-subtle bg-surface-raised transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent motion-reduce:transform-none motion-reduce:transition-none">
      <div className="h-[190px]">
        <CardImage
          image={article.featuredImage}
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          rounded="rounded-t-card"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-center gap-2.5 text-[12px]">
          <CategoryChip name={category.name} />
          <CardDate iso={article.publishedAt} />
        </div>

        <h3 className="text-[19px] font-semibold leading-[1.6] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {article.title}
          </Link>
        </h3>

        {dek && (
          <p className="text-[14.5px] font-light leading-[1.85] text-text-secondary [text-wrap:pretty]">
            {dek}
          </p>
        )}

        <CardByline
          author={article.author}
          readingTime={article.readingTime}
          className="mt-auto pt-3"
        />
      </div>
    </article>
  );
}

/**
 * The archive row: horizontal `270px | 1fr`.
 *
 * Same content as `PostCard` in a shape that scans faster down a long list —
 * the eye tracks one title column instead of a zig-zag.
 *
 * Collapses to the vertical card layout below 640px rather than shrinking the
 * thumbnail to a stamp.
 */
export function ArchiveCard({ article }: { article: ArticleSummary }) {
  const category = cardCategory(article);
  const dek = cardDek(article);

  return (
    <article className="group relative grid gap-4 rounded-card border border-border-subtle bg-surface-raised p-[18px] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent motion-reduce:transform-none motion-reduce:transition-none sm:grid-cols-[220px_1fr] lg:grid-cols-[270px_1fr]">
      <div className="h-[180px] sm:h-[170px]">
        <CardImage
          image={article.featuredImage}
          sizes="(max-width: 639px) 100vw, 270px"
          rounded="rounded-lg"
          className="h-full"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px]">
          <CategoryChip name={category.name} />
          <CardDate iso={article.publishedAt} />
        </div>

        <h3 className="text-[19px] font-semibold leading-[1.6] text-text-primary [text-wrap:pretty] lg:text-[21px]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {article.title}
          </Link>
        </h3>

        {dek && (
          <p className="text-[15px] font-light leading-[1.85] text-text-secondary [text-wrap:pretty]">
            {dek}
          </p>
        )}

        <CardByline
          author={article.author}
          readingTime={article.readingTime}
          className="mt-auto pt-3"
        />
      </div>
    </article>
  );
}
