import {
  formatJalali,
  formatJalaliShort,
  formatReadingTime,
  hasVisibleRevision,
  toDateTimeAttr,
} from '../lib/format';

/**
 * Reading time · date. Pinned to the bottom of a card by the card itself
 * (`mt-auto`), so cards in a row stay equal height regardless of title length.
 *
 * `showRevision` is off for cards — there is no room and it would compete with
 * the title. The article header turns it on, where the distinction between
 * «منتشر» and «بازبینی» is the point.
 */
export function ArticleMeta({
  readingTime,
  publishedAt,
  modifiedAt = null,
  showRevision = false,
  short = false,
}: {
  readingTime: number;
  publishedAt: string;
  modifiedAt?: string | null;
  showRevision?: boolean;
  short?: boolean;
}) {
  const format = short ? formatJalaliShort : formatJalali;
  const revised = showRevision && hasVisibleRevision(publishedAt, modifiedAt);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-muted">
      <span>{formatReadingTime(readingTime)}</span>

      <span aria-hidden="true">·</span>

      {revised ? (
        <>
          <span>
            منتشر:{' '}
            <time dateTime={toDateTimeAttr(publishedAt)}>{format(publishedAt)}</time>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            بازبینی:{' '}
            <time dateTime={toDateTimeAttr(modifiedAt)}>{format(modifiedAt)}</time>
          </span>
        </>
      ) : (
        <time dateTime={toDateTimeAttr(publishedAt)}>{format(publishedAt)}</time>
      )}
    </div>
  );
}
