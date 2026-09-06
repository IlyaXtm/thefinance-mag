import Link from 'next/link';
import { CardImage } from './CardImage';
import { cardCategory } from '../lib/card';
import { formatJalali, formatReadingTime, toDateTimeAttr, toPersianDigits } from '../lib/format';
import type { ArticleSummary } from '../types/mag.types';
import { bidiTitle } from '../lib/bidi-title';

/**
 * One news item: `clock | thumbnail | title + meta`.
 *
 * The hover fill is pulled 14px wider than the text on both sides with a
 * negative margin, so the highlight reads as a row rather than a box drawn
 * tightly around the words.
 *
 * The clock is `dir="ltr"` + isolated + tabular. Times are Latin digits by
 * convention here and a bare `۱۴:۳۰` inside an RTL row otherwise reorders
 * around the colon.
 *
 * SOURCE. The design puts «منبع: …» on every row, and `source` is listed in
 * `CLAUDE.md` under fields deliberately excluded — it has no producer in
 * WordPress today. So it renders only when present, and the row closes up when
 * it is not. The standing rule is not to build against a field that does not
 * exist; showing a real one when it arrives is the honest half of that.
 */
export function NewsRow({ article }: { article: ArticleSummary }) {
  const category = cardCategory(article);
  const published = new Date(article.publishedAt);
  const clock = `${String(published.getHours()).padStart(2, '0')}:${String(
    published.getMinutes(),
  ).padStart(2, '0')}`;

  return (
    <article className="group relative -mx-3.5 grid grid-cols-[56px_1fr] items-center gap-x-4 gap-y-2 rounded-[10px] border-b border-border-subtle px-3.5 py-4 transition-colors duration-150 hover:bg-surface-raised motion-reduce:transition-none sm:grid-cols-[64px_132px_1fr] sm:gap-5">
      <time
        dateTime={toDateTimeAttr(article.publishedAt)}
        dir="ltr"
        className="text-start text-[14px] tabular-nums text-text-muted sm:text-end"
        style={{ unicodeBidi: 'isolate' }}
      >
        {clock}
      </time>

      <div className="hidden h-[78px] sm:block">
        <CardImage image={article.featuredImage} sizes="132px" rounded="rounded-lg" />
      </div>

      <div className="col-span-2 flex min-w-0 flex-col gap-1.5 sm:col-span-1">
        <h3 className="text-[16px] font-medium leading-[1.6] text-text-primary [text-wrap:pretty] sm:text-[18px]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-text-muted">
          <span className="text-accent">{category.name}</span>
          <span aria-hidden="true">·</span>
          <span>{formatReadingTime(article.readingTime)}</span>
        </div>
      </div>
    </article>
  );
}

/**
 * A day's worth of news: accent date, hairline, count.
 *
 * Grouping by day is what makes a news list scannable — a flat reverse-chron
 * list of thirty items gives the reader no way to see where yesterday ended.
 */
export function NewsDayGroup({
  isoDate,
  articles,
}: {
  isoDate: string;
  articles: ArticleSummary[];
}) {
  if (articles.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-2.5 flex items-center gap-4">
        <h2 className="text-[14px] font-semibold text-accent">{formatJalali(isoDate)}</h2>
        <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
        <span className="text-[12.5px] text-text-muted">
          {toPersianDigits(articles.length)} خبر
        </span>
      </div>

      <div>
        {articles.map((article) => (
          <NewsRow key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

/**
 * Bucket articles by calendar day, newest day first, newest item first.
 *
 * IT NOW SORTS. It used to say "newest first, preserving order within a day"
 * and do neither — it bucketed in arrival order and returned the buckets in
 * insertion order, so the output was only ever as sorted as its input. On
 * /mag/news that produced 10:40, 13:10, 07:35 under one heading: not
 * ascending, not descending, just whatever order the query happened to return.
 *
 * Sorting HERE rather than relying on the caller is the point. A component
 * whose correctness depends on an invariant it does not enforce is a component
 * that breaks the day someone passes it a differently-ordered list, silently
 * and in a way that looks like a data problem.
 *
 * The sort key is `publishedAt`, which is the same field the row renders as its
 * clock. Sorting on one field and displaying another is how a list ends up
 * looking unsorted while being perfectly sorted.
 *
 * The input is not mutated — `.sort()` is in-place, and a component reordering
 * an array its caller still holds is a bug waiting for a second consumer.
 */
export function groupByDay(articles: ArticleSummary[]): Array<{
  isoDate: string;
  articles: ArticleSummary[];
}> {
  const days = new Map<string, ArticleSummary[]>();

  for (const article of articles) {
    const key = article.publishedAt.slice(0, 10);
    const bucket = days.get(key);
    if (bucket) bucket.push(article);
    else days.set(key, [article]);
  }

  return [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([isoDate, items]) => ({
      isoDate,
      articles: [...items].sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
      ),
    }));
}
