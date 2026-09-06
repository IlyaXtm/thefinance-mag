import Image from 'next/image';
import Link from 'next/link';
import type { ArticleSummary } from '../types/mag.types';
import { MarketChip } from './MarketChip';
import { formatJalali, formatReadingTime, toDateTimeAttr } from '../lib/format';
import { imageSrc } from '../lib/site';
import { bidiTitle } from '../lib/bidi-title';

/**
 * The lead article — and the ONLY card on the page that shows an image.
 *
 * WHY ONLY ONE IMAGE.
 *
 * Every featured image in this archive has the article's title baked into the
 * artwork. A grid of nine image cards therefore prints every headline twice —
 * once as artwork, once as text — which is why the previous listing read as
 * cluttered and repetitive no matter how the spacing was tuned. No CSS fixes
 * a content problem.
 *
 * Showing artwork exactly once gives the page a focal point and lets the rest
 * of the index be text, which is what an editorial contents page should be
 * anyway. It also removes eight image requests from the critical path.
 *
 * This image is the LCP element: priority, fixed aspect ratio, correct sizes.
 */
export function FeaturedArticle({ article }: { article: ArticleSummary }) {
  const { slug, title, featuredImage, market, contentType, readingTime, publishedAt } = article;

  return (
    <article className="group">
      <Link href={`/${slug}`} className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        {featuredImage && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-surface-raised lg:aspect-[3/2]">
            <Image
              src={imageSrc(featuredImage.url)}
              alt={featuredImage.alt}
              fill
              sizes="(max-width: 1023px) 100vw, 55vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            {market && <MarketChip market={market} />}
            <span className="text-[13px] text-text-muted">{contentType.name}</span>
          </div>

          {/*
            The lead headline is the largest type on the page. Persian runs
            roughly a fifth longer than English for the same content, so it is
            allowed three lines rather than the two a Latin design would give
            it — clamping tighter would truncate mid-thought.
          */}
          <h2 className="mt-3 text-[24px] font-bold leading-[1.5] text-text-primary transition-colors group-hover:text-accent md:text-[32px]">
            {bidiTitle(title)}
          </h2>

          <div className="mt-4 flex items-center gap-2 text-[14px] text-text-muted">
            {/*
              Reading time sits FIRST and unabbreviated.

              It ranges from 3 minutes to 41 minutes across this archive, which
              makes it genuinely decision-shaping rather than decorative: a
              41-minute piece is a commitment, a 3-minute one is a glance. Most
              indexes bury this; here it earns its place.
            */}
            <span className="text-text-secondary">{formatReadingTime(readingTime)} مطالعه</span>
            <span aria-hidden="true">·</span>
            <time dateTime={toDateTimeAttr(publishedAt)}>{formatJalali(publishedAt)}</time>
          </div>
        </div>
      </Link>
    </article>
  );
}
