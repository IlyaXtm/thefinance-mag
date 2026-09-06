import Image from 'next/image';
import Link from 'next/link';
import type { ArticleSummary } from '../types/mag.types';
import { MarketChip } from './MarketChip';
import { ContentTypeLabel } from './ContentTypeLabel';
import { ArticleMeta } from './ArticleMeta';
import { imageSrc } from '../lib/site';
import { bidiTitle } from '../lib/bidi-title';

/**
 * Grid article card.
 *
 * Equal heights within a row come from three things together, and removing any
 * one breaks it:
 *   - the image box is a fixed 16:9 that never varies
 *   - the title clamps at 2 lines with a min-height, so a one-line title still
 *     occupies two lines' worth of space
 *   - the meta row is pushed to the bottom with `mt-auto`
 *
 * The whole card is ONE link. No nested CTA button: a button inside a
 * clickable card produces overlapping hit targets and two tab stops for one
 * destination.
 *
 * There is deliberately no `aria-label` on the link. The title text is the
 * accessible name already, and a duplicated label drifts out of sync with the
 * visible text — clamping is visual only, the full text node is present.
 *
 * No excerpt: the design shows none, and the live site's excerpts are
 * auto-truncated mid-sentence anyway.
 */
export function ArticleCard({
  article,
  priority = false,
}: {
  article: ArticleSummary;
  /** Set on the LCP card only — the first card above the fold. */
  priority?: boolean;
}) {
  const { slug, title, featuredImage, market, contentType, readingTime, publishedAt } = article;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-raised transition-colors hover:border-border-strong hover:bg-surface-hover">
      <Link href={`/${slug}`} className="flex h-full flex-col">
        {/*
          Fixed aspect ratio, always. An image without a reserved box is the
          most common source of layout shift, and CLS is a ranking factor.
        */}
        <div className="relative aspect-[16/9] w-full bg-surface">
          {featuredImage ? (
            <Image
              src={imageSrc(featuredImage.url)}
              alt={featuredImage.alt}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xs text-text-muted"
              aria-hidden="true"
            >
              بدون تصویر
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          {/*
            Single line, never wraps. `market` is null for most of the archive
            — general technical-analysis education belongs to no market — so
            the chip is omitted rather than shown empty.
          */}
          <div className="flex min-h-[30px] items-center gap-2">
            {market && <MarketChip market={market} />}
            {market && <span className="text-text-muted" aria-hidden="true">·</span>}
            <ContentTypeLabel contentType={contentType} />
          </div>

          {/*
            2-line clamp with a matching min-height (17px × 1.5 × 2 = 51px).
            The min-height is what keeps a short title from pulling the meta
            row up and breaking row alignment.
          */}
          <h3 className="mt-2 min-h-[51px] text-[17px] font-semibold leading-[1.5] text-text-primary [display:-webkit-box] [overflow:hidden] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {bidiTitle(title)}
          </h3>

          <div className="mt-auto pt-3">
            <ArticleMeta readingTime={readingTime} publishedAt={publishedAt} />
          </div>
        </div>
      </Link>
    </article>
  );
}

/**
 * Skeleton.
 *
 * Geometry matches the real card exactly — same 16:9 box, same 30px chip row,
 * same 51px title block, same meta line. A skeleton that doesn't match its
 * component causes the layout shift it was meant to prevent.
 */
export function ArticleCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-raised"
      aria-hidden="true"
    >
      <div className="aspect-[16/9] w-full animate-pulse bg-skeleton" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex min-h-[30px] items-center">
          <div className="h-[22px] w-24 animate-pulse rounded-full bg-skeleton" />
        </div>
        <div className="mt-2 min-h-[51px] space-y-2">
          <div className="h-[17px] w-full animate-pulse rounded bg-skeleton-strong" />
          <div className="h-[17px] w-2/3 animate-pulse rounded bg-skeleton-strong" />
        </div>
        <div className="mt-auto pt-3">
          <div className="h-[13px] w-32 animate-pulse rounded bg-skeleton" />
        </div>
      </div>
    </div>
  );
}
