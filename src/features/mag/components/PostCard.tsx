import Link from 'next/link';
import { CardImage } from './CardImage';
import { CardBody, CardFootMeta, CardKicker } from './CardMeta';
import { cardDek } from '../lib/card';
import type { ArticleSummary } from '../types/mag.types';
import { bidiTitle } from '../lib/bidi-title';

/**
 * The home grid card: 190px image, chip + date, title, dek, byline.
 *
 * `<article>` with ONE link whose accessible name is the title, stretched over
 * the card with an inset pseudo-element. That gives a card-sized hit target
 * with a single tab stop, rather than the three or four a naively linked card
 * produces.
 *
 * Hover is `border-color` and nothing else — no lift, no shadow growth, no
 * scale, per CLAUDE.md. (A 2px lift lived here until 2026-10-05; the reviewer
 * caught it once the landing showed these cards in two sections.)
 *
 * The focus ring lands on the link, and the card must NOT clip it: `rounded`
 * without `overflow-hidden` on the outer element, with the image clipping
 * itself instead.
 */
export function PostCard({ article }: { article: ArticleSummary }) {
  return (
    <article className="group relative flex flex-col rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none">
      {/* 16:10, like every other image-on-top card: a fixed box, so a
          wrong-aspect upload crops instead of reflowing the row. */}
      <div className="aspect-[16/10]">
        <CardImage
          image={article.featuredImage}
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          rounded="rounded-t-card"
        />
      </div>

      <CardBody article={article} />
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
export function ArchiveCard({
  article,
  /*
    THE LCP ELEMENT ON AN ARCHIVE is the first card's image, which is what the
    note on CategoryCover already says — the cover deliberately gives up
    `priority` so this card can have it. It never did: ArchiveCard had no way
    to be told, so every image in the list was lazy and LCP waited for a
    lazy-loaded request to be discovered.

    Measured on a 4x-throttled phone profile: 1.11s on /archive and 1.12s on a
    market archive, against 0.58–0.63s on the pages that do mark their hero.
    Both were inside the 2.5s target, so nothing looked wrong.
  */
  priority = false,
}: {
  article: ArticleSummary;
  priority?: boolean;
}) {
  const dek = cardDek(article);

  return (
    <article className="group relative grid gap-4 rounded-card border border-border-subtle bg-surface-raised p-[18px] transition-colors duration-150 hover:border-accent motion-reduce:transition-none sm:grid-cols-[220px_1fr] lg:grid-cols-[270px_1fr]">
      <div className="h-[180px] sm:h-[170px]">
        <CardImage
          image={article.featuredImage}
          sizes="(max-width: 639px) 100vw, 270px"
          priority={priority}
          rounded="rounded-lg"
          className="h-full"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        <CardKicker article={article} />

        <h3 className="text-h3 font-semibold leading-[1.6] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h3>

        {dek && (
          <p className="line-clamp-2 text-[15px] font-light leading-[1.85] text-text-secondary">
            {dek}
          </p>
        )}

        {/* The team's card rule: no author on cards, date only on news. */}
        <CardFootMeta article={article} className="mt-auto pt-3" />
      </div>
    </article>
  );
}
