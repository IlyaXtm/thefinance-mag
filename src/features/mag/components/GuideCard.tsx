import Link from 'next/link';
import { CardImage } from './CardImage';
import { CardFootMeta } from './CardMeta';
import { cardDek } from '../lib/card';
import { bidiTitle } from '../lib/bidi-title';
import { heroAspectRatios } from '../lib/hero-ratio';
import type { ArticleSummary } from '../types/mag.types';

/**
 * A «راهنمای جامع» — a pillar piece, shown large at the top of آموزش.
 *
 * The team's example was the 66-minute options article: «این خودش تقریباً یک
 * Course است» and should not sit in the grid like an ordinary card. Editors
 * mark a guide with the WordPress tag `راهنمای-جامع` (lib/education.ts); this
 * card is how it is set apart — wider, heavier title, labelled for what it is.
 *
 * The image keeps the artwork's own ratio, like the hero, so a baked-in
 * headline is never cropped.
 */
export function GuideCard({ article }: { article: ArticleSummary }) {
  const image = article.featuredImage;
  const summary = cardDek(article);

  return (
    <article className="group relative grid gap-5 rounded-card border border-border-subtle bg-surface-raised p-4 transition-colors duration-150 hover:border-accent motion-reduce:transition-none md:grid-cols-[minmax(0,320px)_1fr] md:items-center md:p-5">
      {image && (
        <div style={{ aspectRatio: heroAspectRatios(image).mobile }}>
          <CardImage
            image={image}
            sizes="(max-width: 767px) 100vw, 320px"
            rounded="rounded-lg"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-accent">راهنمای جامع</span>

        <h3 className="text-h2 font-bold leading-[1.5] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h3>

        {summary && (
          <p className="line-clamp-2 text-[15px] font-light leading-[1.85] text-text-secondary">
            {summary}
          </p>
        )}

        <CardFootMeta article={article} className="pt-1" />
      </div>
    </article>
  );
}
