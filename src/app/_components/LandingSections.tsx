import Link from 'next/link';
import { CompactCard, PostCard } from '@/features/mag/components';
import { cardCategory } from '@/features/mag/lib/card';
import { bidiTitle } from '@/features/mag/lib/bidi-title';
import { formatJalaliShort, formatReadingTime, toDateTimeAttr } from '@/features/mag/lib/format';
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
 *
 * Home v2 (2026-10-08): news became a text list and the market blocks one
 * row of columns — NewsListSection and MarketColumnsSection below.
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
          /* Hide what would sit alone on the last row: in the 2-up band (md–xl)
             and in the 3-up band (xl+). 4 news items used to leave one card
             alone at xl. */
          const cls = [
            'contents',
            i >= items.length - (items.length % 2) ? 'md:max-xl:hidden' : '',
            i >= items.length - (items.length % 3) ? 'xl:hidden' : '',
          ].join(' ');
          return (
            <div key={article.id} className={cls}>
              <PostCard article={article} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * «تازه‌ترین اخبار» as a TEXT LIST — home v2 (handoff 2026-10-08).
 *
 * No images. News artwork has the headline baked into it, so an image card
 * prints every title twice; a list is also the shape readers scan news in.
 * Date, then the title, then «market · reading time». Two columns at lg; each
 * row is one link, 44px at least, hover is a colour shift only.
 */
export function NewsListSection({ items }: { items: ArticleSummary[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="news-heading">
      <LandingSectionHeader id="news-heading" title="تازه‌ترین اخبار" href="/news" />
      <ul className="grid border-t border-border-subtle lg:grid-cols-2 lg:gap-x-12">
        {items.map((article) => (
          <li key={article.id} className="border-b border-border-subtle">
            <Link
              href={`/${article.slug}`}
              className="group grid min-h-11 grid-cols-[72px_1fr] items-baseline gap-4 py-4"
            >
              <time
                dateTime={toDateTimeAttr(article.publishedAt)}
                className="whitespace-nowrap text-[13px] text-text-muted"
              >
                {formatJalaliShort(article.publishedAt)}
              </time>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[16px] font-semibold leading-[1.7] text-text-primary transition-colors duration-150 [text-wrap:pretty] group-hover:text-accent motion-reduce:transition-none">
                  {bidiTitle(article.title)}
                </span>
                <span className="text-[12.5px] text-text-muted">
                  {cardCategory(article).name} · {formatReadingTime(article.readingTime)} مطالعه
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * «آموزش بر اساس بازار» — one column per market, home v2 (handoff 2026-10-08).
 *
 * Replaces the stacked «آموزش <market>» card blocks: four markets as four
 * panels side by side at xl, two at md, each a short list of lessons and a
 * link to that market's lessons page. Titles only — the cards above already
 * show the artwork. `mt-auto` on the footer link keeps the links level when a
 * column holds two lessons and its neighbour three.
 */
export function MarketColumnsSection({ blocks }: { blocks: TopicBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <section aria-labelledby="markets-heading">
      <h2
        id="markets-heading"
        className="mb-6 text-h2 font-bold tracking-[-0.2px] text-text-primary"
      >
        آموزش بر اساس بازار
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        {blocks.map((block) => (
          <div
            key={block.key}
            className="flex flex-col rounded-card border border-border-subtle bg-surface-raised p-5 lg:px-[22px]"
          >
            <h3 className="mb-2 text-h5 font-bold text-accent">{block.name}</h3>
            <ul className="flex flex-col">
              {block.items.map((article) => (
                <li key={article.id} className="border-t border-border-subtle">
                  <Link
                    href={`/${article.slug}`}
                    className="group flex min-h-11 flex-col gap-0.5 py-2.5"
                  >
                    <span className="text-[14.5px] font-semibold leading-[1.65] text-text-primary transition-colors duration-150 [text-wrap:pretty] group-hover:text-accent motion-reduce:transition-none">
                      {bidiTitle(article.title)}
                    </span>
                    <span className="text-[12.5px] text-text-muted">
                      {formatReadingTime(article.readingTime)} مطالعه
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={block.href}
              className="mt-auto inline-flex min-h-11 items-center pt-2 text-[14px] text-accent transition-colors hover:text-text-primary"
            >
              همه‌ی آموزش‌های {block.name}
              <span aria-hidden="true" className="ms-1">
                ←
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
