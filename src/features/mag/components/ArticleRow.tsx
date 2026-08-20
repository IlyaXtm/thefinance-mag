import Link from 'next/link';
import type { ArticleSummary } from '../types/mag.types';
import { MarketChip } from './MarketChip';
import { formatJalali, formatReadingTime, toDateTimeAttr, toPersianDigits } from '../lib/format';

/**
 * A text-only article row.
 *
 * The index reads like a contents page rather than a card grid. Three reasons,
 * and the first is specific to this archive:
 *
 *   1. Every featured image has the headline baked into the artwork, so a card
 *      grid prints each title twice. Dropping the thumbnail removes the
 *      duplication that made the previous listing feel cluttered.
 *
 *   2. Persian headlines run long. Given full width instead of a card's third,
 *      they fit on one or two lines and stay scannable.
 *
 *   3. Eight fewer images on the page is eight fewer requests competing with
 *      the LCP hero.
 *
 * The optional leading index number turns a list into a sequence. Used only
 * where an order is real — never as decoration on a set that has none.
 */
export function ArticleRow({
  article,
  index,
}: {
  article: ArticleSummary;
  /** 1-based position. Omit when the list has no meaningful order. */
  index?: number;
}) {
  const { slug, title, market, contentType, readingTime, publishedAt } = article;

  return (
    <article className="group border-b border-border-subtle last:border-b-0">
      <Link href={`/${slug}`} className="flex items-start gap-4 py-5">
        {index !== undefined && (
          <span
            aria-hidden="true"
            className="mt-1 w-6 shrink-0 text-[13px] tabular-nums text-text-muted"
          >
            {toPersianDigits(index)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold leading-[1.6] text-text-primary transition-colors group-hover:text-accent md:text-[19px]">
            {title}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-muted">
            <span className="text-text-secondary">{formatReadingTime(readingTime)}</span>
            <span aria-hidden="true">·</span>
            <span>{contentType.name}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={toDateTimeAttr(publishedAt)}>{formatJalali(publishedAt)}</time>
          </div>
        </div>

        {/* Pushed to the reading-end side so the eye tracks titles down a
            single edge rather than zig-zagging around chips. */}
        {market && (
          <div className="hidden shrink-0 pt-0.5 sm:block">
            <MarketChip market={market} />
          </div>
        )}
      </Link>
    </article>
  );
}

/**
 * Section heading with a hairline rule.
 *
 * The rule is what makes the page read as a publication rather than an app
 * screen: it groups without boxing, and costs nothing in weight or motion.
 */
export function SectionHeading({
  title,
  href,
  linkLabel = 'همه',
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-4 border-b border-border-strong pb-3">
      <h2 className="text-[15px] font-bold text-text-primary">{title}</h2>

      {href && (
        <Link
          href={href}
          className="shrink-0 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
        >
          {linkLabel}
          {/* Points left — forward in RTL. */}
          <span aria-hidden="true" className="ms-1">
            ←
          </span>
        </Link>
      )}
    </div>
  );
}
