import Link from 'next/link';
import { toPersianDigits } from '@/features/mag/lib/format';
import type { ArticleSummary, Market } from '@/features/mag/types/mag.types';
import {
  ArticleGridEmpty,
  CategoryListCard,
  groupByDay,
  LinkListCard,
  MarketFilterBar,
  NewsDayGroup,
  NewsletterCta,
} from '@/features/mag/components';

/**
 * The news page, shared by `/news` and `/news/<market>`.
 *
 * Header copy is the team's (2026-10-05): «آخرین اخبار بازارهای مالی», then
 * the one-line promise. Under it, the market chips they sketched —
 * [همه] [اقتصاد جهانی] … 🔍 — as real links to `/news/<market>`, because
 * filtering is navigation here, never client-side state.
 */

/** Khabarchi — the product's live news stream, on the main site. */
const KHABARCHI_URL = 'https://thefinance.ir/khabarchi';

export function NewsView({
  title,
  subtitle,
  items,
  total,
  newsMarkets,
  allMarkets,
  activeMarket,
  related,
  moreHref,
}: {
  title: string;
  subtitle: string;
  items: ArticleSummary[];
  total: number;
  /** Markets that have news — one chip each. */
  newsMarkets: Market[];
  /** Every market, for the sidebar's category card. */
  allMarkets: Market[];
  activeMarket: string | null;
  related: ArticleSummary[];
  /** «خبرهای قدیمی‌تر» — shown only when there is more than this page holds. */
  moreHref: string | null;
}) {
  const days = groupByDay(items);

  return (
    <>
      <div className="border-b-2 border-border-strong pb-6 pt-6 lg:pt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-h1 font-bold tracking-[-0.3px] text-text-primary">{title}</h1>
            <p className="mt-2.5 max-w-[64ch] text-[15px] leading-[1.85] text-text-secondary">
              {subtitle}
            </p>
          </div>

          {/*
            Khabarchi is the live stream; the magazine is the edited summary.
            The team asked for this link «از نظر Product Funnel». A quiet text
            link, not a button: no «فوری», no pulse, no urgency styling — the
            brand list rules all three out, and a link that reads as an alarm
            would sell the magazine's own news as stale.
          */}
          <a
            href={KHABARCHI_URL}
            className="inline-flex min-h-11 shrink-0 items-center text-[14px] text-accent transition-colors hover:text-text-primary"
          >
            مشاهده خبرهای لحظه‌ای در خبرچی
            <span aria-hidden="true" className="ms-1">
              ←
            </span>
          </a>
        </div>

        <div className="mt-5">
          <MarketFilterBar
            markets={newsMarkets}
            activeSlug={activeMarket}
            hrefFor={(slug) => `/news/${slug}`}
            allHref="/news"
            label="بازار"
            showLabel={false}
            trailing={
              <Link
                href="/search"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-interactive text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="h-[18px] w-[18px]"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
                <span className="sr-only">جستجو در مجله</span>
              </Link>
            }
          />
        </div>
      </div>

      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <section aria-labelledby="news-list-heading">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <h2 id="news-list-heading" className="sr-only">
              فهرست خبرها
            </h2>
            {total > 0 && (
              <span className="text-[13px] text-text-muted">{toPersianDigits(total)} خبر</span>
            )}
          </div>

          {days.length > 0 ? (
            <>
              {days.map((day) => (
                <NewsDayGroup key={day.isoDate} isoDate={day.isoDate} articles={day.articles} />
              ))}

              {moreHref && (
                <div className="mt-2 flex justify-center">
                  <Link
                    href={moreHref}
                    className="inline-flex h-[46px] items-center rounded-full border border-border-interactive px-6 text-[15px] text-text-primary transition-colors hover:border-accent hover:bg-accent-soft"
                  >
                    خبرهای قدیمی‌تر
                  </Link>
                </div>
              )}
            </>
          ) : (
            <ArticleGridEmpty
              message="هنوز خبری منتشر نشده."
              actionHref="/news"
              actionLabel="همه‌ی خبرها"
            />
          )}
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[76px]">
          <LinkListCard
            title="پرونده‌های مرتبط"
            items={related.slice(0, 4).map((a) => ({
              slug: a.slug,
              title: a.title,
              meta: `${toPersianDigits(a.readingTime)} دقیقه مطالعه`,
            }))}
          />
          <CategoryListCard markets={allMarkets} />
          <NewsletterCta />
        </aside>
      </div>
    </>
  );
}
