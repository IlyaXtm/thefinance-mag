import { formatJalaliShort, formatReadingTime, toDateTimeAttr } from '../lib/format';
import { authorInitial } from '../lib/card';
import type { Author } from '../types/mag.types';

/**
 * The byline strip under a card: avatar, author, reading time.
 *
 * The avatar is an INITIAL, never Gravatar — a third-party request per author
 * that leaks a hash of their email abroad and is unreliable from Iran
 * (`decisions.md`). It is `aria-hidden`: the author's name is right beside it,
 * so announcing a letter adds nothing.
 *
 * Reading time is stored, never computed at render — the mu-plugin owns it.
 */
export function CardByline({
  author,
  readingTime,
  className = '',
}: {
  author: Author;
  readingTime: number;
  className?: string;
}) {
  return (
    <span
      className={`flex items-center gap-2.5 border-t border-border-subtle pt-3 text-[12.5px] text-text-muted ${className}`}
    >
      <span
        aria-hidden="true"
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-hover text-[11px] text-text-secondary"
      >
        {authorInitial(author.name)}
      </span>
      <span className="truncate">{author.name}</span>
      <span aria-hidden="true">·</span>
      <span className="shrink-0">{formatReadingTime(readingTime)} مطالعه</span>
    </span>
  );
}

/**
 * Category + date, the strip above a card title.
 *
 * The date is a real `<time>` with a machine-readable `dateTime`, and renders
 * as an absolute Jalali date. Not «۲ روز قبل»: much of this archive is
 * evergreen, and a relative date makes a still-valid explainer look stale.
 */
export function CardDate({ iso, className = '' }: { iso: string; className?: string }) {
  return (
    <time dateTime={toDateTimeAttr(iso)} className={`text-text-muted ${className}`}>
      {formatJalaliShort(iso)}
    </time>
  );
}
