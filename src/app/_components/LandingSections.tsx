import Link from 'next/link';
import { CompactCard, PostCard } from '@/features/mag/components';
import type { TopicBlock } from '@/features/mag/lib/landing';
import type { ArticleSummary } from '@/features/mag/types/mag.types';

/**
 * The home page's sections, in the shape of the team's reference (faraz.io/blog,
 * 2026-10-05): full width, three across, no sidebar.
 *
 * THE SIDEBAR WENT BECAUSE OF THE WHITESPACE. «فضای سفید صفحه مگ خیلی زیاده —
 * سه ردیف میتونه بشه؟» The card grids sat in a `1fr | 320px` body and could
 * only ever be two-up; at full width they are the system grid exactly
 * (1 / 2 / 3 columns at <768 / 768 / 1280), and what the sidebar carried
 * moved into the page — the markets as their own blocks, InChart and the
 * social channels into a closing row.
 */

/**
 * h2, a hairline, and «مشاهده همه». The label was «همه‌ی کریپتو»; the team
 * circled it and the reference reads «مشاهده همه», which also stops seven
 * section links each restating their own heading.
 *
 * The link is `min-h-11` — 44px — because it is a control. The chevron points
 * left, forward in RTL, and is kept out of the accessible name.
 */
export function LandingSectionHeader({
  id,
  title,
  href,
}: {
  id: string;
  title: string;
  href?: string;
}) {
  return (
    /* No hairline across the row (team, 2026-10-05: «به جای خط سرتاسری،
       فاصله»). Sections are separated by the 60/96 rhythm alone; lines stay
       in the header, the news feed and the footer. */
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 id={id} className="text-h2 font-bold tracking-[-0.2px] text-text-primary">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center text-[14px] text-accent transition-colors hover:text-text-primary"
        >
          مشاهده همه
          <span aria-hidden="true" className="ms-1">
            ←
          </span>
        </Link>
      )}
    </div>
  );
}

/**
 * Two large, then up to four small — the 2 + 4 of the team's reference.
 *
 * That reference was a «پربازدیدترین» ranking with a view count on every card;
 * both are on CLAUDE.md's never-build list, and WordPress records no views.
 * The shape is kept, the ranking is not: editors' picks when there are any,
 * the newest education pieces until then — and the heading says which.
 *
 * Four across at `xl`, against the three-column card grid, to keep the 2 + 4
 * the team sent: the row runs the full container, so a small card is ~260px.
 */
export function FeaturedSection({
  items,
  source,
}: {
  items: ArticleSummary[];
  source: 'editors' | 'recent';
}) {
  if (items.length === 0) return null;
  const [large, small] = [items.slice(0, 2), items.slice(2)];

  return (
    <section aria-labelledby="featured-heading">
      <LandingSectionHeader
        id="featured-heading"
        title={source === 'editors' ? 'پیشنهاد سردبیر' : 'پیشنهاد مطالعه'}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        {large.map((article) => (
          <CompactCard
            key={article.id}
            article={article}
            size="lg"
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        ))}
      </div>

      {small.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:mt-6 lg:gap-6 xl:grid-cols-4">
          {small.map((article) => (
            <CompactCard
              key={article.id}
              article={article}
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 25vw"
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Rows of three: «تازه‌ترین مقالات» (three rows) and «تازه‌ترین اخبار» (two).
 *
 * An odd count leaves one card alone on the last row of the two-column grid
 * (md–xl), so that card is hidden there — the same rule TopicSection uses.
 */
export function LatestSection({
  id,
  title,
  href,
  items,
}: {
  id: string;
  title: string;
  href: string;
  items: ArticleSummary[];
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={id}>
      <LandingSectionHeader id={id} title={title} href={href} />
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {items.map((article, i) => {
          const orphan = items.length % 2 === 1 && i === items.length - 1;
          return (
            <div key={article.id} className={orphan ? 'contents md:max-xl:hidden' : 'contents'}>
              <PostCard article={article} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * One topic: three cards, three across. The third hides between md and xl,
 * where the grid is two-up and it would sit alone on a row.
 *
 * A topic left with two — اینچارت has three articles in all, and one may
 * already be on the page above — stays two-up at every width rather than
 * leaving an empty third column, which is the whitespace the team objected to.
 */
export function TopicSection({ topic }: { topic: TopicBlock }) {
  const id = `topic-${topic.key}-heading`;
  const threeUp = topic.items.length >= 3;

  return (
    <section aria-labelledby={id}>
      <LandingSectionHeader id={id} title={topic.title} href={topic.href} />
      <div className={`grid gap-4 md:grid-cols-2 lg:gap-6 ${threeUp ? 'xl:grid-cols-3' : ''}`}>
        {topic.items.map((article, i) => (
          <div key={article.id} className={i === 2 ? 'contents md:max-xl:hidden' : 'contents'}>
            <CompactCard
              article={article}
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
