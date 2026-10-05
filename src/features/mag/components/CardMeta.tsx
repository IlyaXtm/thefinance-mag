import Link from 'next/link';
import { CategoryChip } from './CategoryChip';
import { formatJalaliShort, formatReadingTime, toDateTimeAttr } from '../lib/format';
import { authorInitial, cardCategory, cardDek } from '../lib/card';
import { bidiTitle } from '../lib/bidi-title';
import type { ArticleSummary, Author } from '../types/mag.types';

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

/**
 * The text half of an image-on-top card, in the order the team specified
 * (2026-10-05): category badge → TITLE → two-line summary → date · reading
 * time. «عنوان همیشه dominant باشد.»
 *
 * The review that asked for it measured the problem rather than describing a
 * taste: title, date and meta carried near-equal visual weight, so nothing
 * led. Now the title is the only bold thing on the card and the only thing at
 * heading size; the summary is clamped to two lines so card heights in a row
 * stay close; the meta is the smallest, quietest text and sits at the foot.
 *
 * No author on cards — the spec does not include it, and it stays on the
 * article page where it belongs.
 */
export function CardBody({
  article,
  size = 'md',
  showSummary = true,
}: {
  article: ArticleSummary;
  size?: 'sm' | 'md' | 'lg';
  showSummary?: boolean;
}) {
  const category = cardCategory(article);
  const summary = showSummary ? cardDek(article, 2) : null;

  return (
    <div className={`flex flex-1 flex-col gap-2.5 ${size === 'sm' ? 'p-4' : 'p-5'}`}>
      <CategoryChip name={category.name} className="self-start" />

      <h3
        className={`font-bold text-text-primary [text-wrap:pretty] ${
          size === 'sm' ? 'text-[16px] leading-[1.65]' : 'text-h3 leading-[1.6]'
        }`}
      >
        <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
          {bidiTitle(article.title)}
        </Link>
      </h3>

      {summary && (
        <p className="line-clamp-2 text-[14px] font-light leading-[1.8] text-text-secondary">
          {summary}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-2 pt-2 text-meta text-text-muted">
        <time dateTime={toDateTimeAttr(article.publishedAt)}>
          {formatJalaliShort(article.publishedAt)}
        </time>
        <span aria-hidden="true">·</span>
        <span>{formatReadingTime(article.readingTime)} مطالعه</span>
      </div>
    </div>
  );
}
