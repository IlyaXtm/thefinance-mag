import Link from 'next/link';
import { CategoryChip } from './CategoryChip';
import { formatJalaliShort, formatReadingTime, toDateTimeAttr } from '../lib/format';
import { cardCategory, cardDek } from '../lib/card';
import { levelOf } from '../lib/education';
import { bidiTitle } from '../lib/bidi-title';
import type { ArticleSummary } from '../types/mag.types';

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
 * No author on cards, and the date only on news — see CardFootMeta.
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
  const summary = showSummary ? cardDek(article) : null;

  return (
    <div className={`flex flex-1 flex-col gap-2.5 ${size === 'sm' ? 'p-4' : 'p-5'}`}>
      <CardKicker article={article} />

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

      <CardFootMeta article={article} className="mt-auto pt-2" />
    </div>
  );
}

/**
 * The foot of a card: reading time, and the date ONLY for news.
 *
 * The team's rule (2026-10-05): «در محتوای Evergreen آموزشی، سطح آموزش و مدت
 * مطالعه مهم‌تر از تاریخ انتشار و نام نویسنده است». A lesson from last year is
 * not stale, and a date on it says it might be. News is the opposite — its
 * date is the point — so news keeps it. The author is on the article page.
 */
export function CardFootMeta({
  article,
  className = '',
}: {
  article: ArticleSummary;
  className?: string;
}) {
  const isNews = article.contentType.slug === 'news';

  return (
    <div className={`flex flex-wrap items-center gap-x-2 text-meta text-text-muted ${className}`}>
      {isNews && (
        <>
          <time dateTime={toDateTimeAttr(article.publishedAt)}>
            {formatJalaliShort(article.publishedAt)}
          </time>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span>{formatReadingTime(article.readingTime)} مطالعه</span>
    </div>
  );
}

/**
 * The category badge, with the level beside it when the post is tagged with
 * one — «اقتصاد جهانی · مقدماتی», the team's example. No level, no trace.
 */
export function CardKicker({
  article,
  variant = 'soft',
}: {
  article: ArticleSummary;
  variant?: 'soft' | 'solid';
}) {
  const level = levelOf(article);

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <CategoryChip name={cardCategory(article).name} variant={variant} />
      {level && <span className="text-text-muted">{level}</span>}
    </div>
  );
}
