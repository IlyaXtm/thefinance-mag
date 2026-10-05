import type { Metadata } from 'next';
import { getAllSummaries, getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { toMetadata } from '@/features/mag/lib/seo';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { NEWS_SUBTITLE, NEWS_TITLE, newsMarkets } from '@/features/mag/lib/news';
import { NewsView } from './_components/NewsView';

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
  fallbackTitle: NEWS_TITLE,
  fallbackDescription: NEWS_SUBTITLE,
  ogTitle: `${NEWS_TITLE} | ${MAG_NAME}`,
});

export default async function NewsPage() {
  const [news, markets, related, archive] = await Promise.all([
    getArticles({ page: 1, perPage: PER_PAGE, contentType: 'news' }),
    getMarkets(),
    /* «پرونده‌های مرتبط» — longer pieces that give a news reader somewhere to
       go. Editorially adjacent rather than ranked: this is the slot the design
       gave a most-read list, which the brand rules exclude. Education since
       «تحلیل» was retired (2026-10-05); it held one post. */
    getArticles({ page: 1, perPage: 4, contentType: 'education' }),
    getAllSummaries(),
  ]);

  return (
    <main id="main-content" tabIndex={-1} className="mag-gutter">
      {/* «اخبار» is a top-level indexable section and had no breadcrumb of any
          kind, structured or visible, while every other archive had both. Only
          the markup is added here — the page's own header already names the
          section, so a visible crumb above an <h1> saying the same thing would
          be noise. */}
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: MAG_NAME, url: magUrl('/') },
          { name: 'اخبار', url: magUrl('/news') },
        ])}
      />

      <NewsView
        title={NEWS_TITLE}
        subtitle={NEWS_SUBTITLE}
        items={news.items}
        total={news.total}
        newsMarkets={newsMarkets(archive, markets)}
        allMarkets={markets}
        activeMarket={null}
        related={related.items}
        moreHref={news.totalPages > 1 ? '/archive?type=news' : null}
      />
    </main>
  );
}
