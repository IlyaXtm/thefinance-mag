import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { toMetadata } from '@/features/mag/lib/seo';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import {
  ArticleGridEmpty,
  CategoryListCard,
  groupByDay,
  LinkListCard,
  NewsDayGroup,
  NewsletterCta,
} from '@/features/mag/components';

/**
 * /mag/news — «اخبار».
 *
 * A separate route rather than `/archive?type=news`, because news genuinely
 * has a different shape: dated, grouped by day, clock-stamped, and short. The
 * archive template would render thirty three-minute items as full cards and
 * bury the one long piece published that week.
 *
 * Underneath it is still the `news` content type — no new taxonomy, per the
 * two-axis decision.
 */

export const revalidate = 300;

const PER_PAGE = 30;

export const metadata: Metadata = toMetadata({
  seo: null,
  path: '/news',
  fallbackTitle: 'اخبار',
  fallbackDescription: `تازه‌ترین خبرهای بازار در ${MAG_NAME}`,
  ogTitle: `اخبار | ${MAG_NAME}`,
});

export default async function NewsPage() {
  const [news, markets, related] = await Promise.all([
    getArticles({ page: 1, perPage: PER_PAGE, contentType: 'news' }),
    getMarkets(),
    /* «پرونده‌های مرتبط» — longer pieces that give a news reader somewhere to
       go. Editorially adjacent rather than ranked: this is the slot the design
       gave a most-read list, which the brand rules exclude. */
    getArticles({ page: 1, perPage: 4, contentType: 'analysis' }),
  ]);

  const days = groupByDay(news.items);

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-24">
      {/* «اخبار» is a top-level indexable section and had no breadcrumb of any
          kind, structured or visible, while every other archive had both. Only
          the markup is added here — the page's own header already names the
          section, so a visible crumb above an <h1> saying the same word would
          be noise. */}
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: MAG_NAME, url: magUrl('/') },
          { name: 'اخبار', url: magUrl('/news') },
        ])}
      />

      <div className="flex flex-col gap-6 border-b-2 border-border-strong pb-7 pt-6 md:flex-row md:items-end md:justify-between lg:pt-8">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.3px] text-text-primary md:text-[32px]">
            اخبار
          </h1>
          <p className="mt-2.5 max-w-[64ch] text-[15px] font-light leading-[1.85] text-text-muted">
            خبرها کوتاه و تاریخ‌دارند. هر خبر به مطلب کامل خود پیوند دارد و پس از انتشار،
            اصلاحیه‌ها در انتهای آن ثبت می‌شود.
          </p>
        </div>

        {news.total > 0 && (
          <span className="shrink-0 text-[13px] text-text-muted">
            {toPersianDigits(news.total)} خبر
          </span>
        )}
      </div>

      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <section aria-labelledby="news-list-heading">
          <h2 id="news-list-heading" className="sr-only">
            فهرست خبرها
          </h2>

          {days.length > 0 ? (
            <>
              {days.map((day) => (
                <NewsDayGroup key={day.isoDate} isoDate={day.isoDate} articles={day.articles} />
              ))}

              {news.totalPages > 1 && (
                <div className="mt-2 flex justify-center">
                  <Link
                    href="/archive?type=news"
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
              actionHref="/archive"
              actionLabel="همه مطالب"
            />
          )}
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[76px]">
          <LinkListCard
            title="پرونده‌های مرتبط"
            items={related.items.slice(0, 4).map((a) => ({
              slug: a.slug,
              title: a.title,
              meta: `${toPersianDigits(a.readingTime)} دقیقه مطالعه`,
            }))}
          />
          <CategoryListCard markets={markets} />
          <NewsletterCta />
        </aside>
      </div>
    </main>
  );
}
