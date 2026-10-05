import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllSummaries, getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { magBlogJsonLd, organizationJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_DESCRIPTION, MAG_NAME } from '@/features/mag/lib/site';
import { buildLanding } from '@/features/mag/lib/landing';
import {
  CategoryListCard,
  HeroFeature,
  HeroSideCard,
  InchartPricesCard,
  NewsletterCta,
} from '@/features/mag/components';
import { EditorsPicks, LatestSection, TopicSection } from './_components/LandingSections';

/**
 * thefinance.ir/mag — the home page.
 *
 * v4: image-led. The previous listing showed artwork exactly once because
 * every featured image had the headline baked into it, so a card grid printed
 * each title twice. The v4 design reverses that decision deliberately and this
 * page follows it — which makes the artwork a real dependency: a card with a
 * missing or wrong-aspect image now reads as broken rather than as restraint.
 * `CardImage` fixes the box so the grid cannot reflow, and every image needs a
 * real Persian alt.
 */

export const revalidate = 300;

export const metadata: Metadata = toMetadata({
  seo: null,
  path: '/',
  fallbackTitle: MAG_NAME,
  fallbackDescription: MAG_DESCRIPTION,
});

export default async function MagIndexPage() {
  const [archive, markets, inchart] = await Promise.all([
    getAllSummaries(),
    getMarkets(),
    /*
      The one section that can fail on its own without taking the page down:
      it is the last block of the body, and a home page that 500s because a
      three-article category did not answer is a worse outcome than a home
      page without that block. Everything above it still throws.
    */
    getArticles({ page: 1, perPage: 3, category: 'inchart' })
      .then((r) => r.items)
      .catch(() => []),
  ]);

  const { featured, heroSide, picks, latestArticles, latestNews, topics } = buildLanding(
    archive,
    inchart,
  );

  return (
    <main id="main-content" tabIndex={-1} className="mag-gutter">
      <JsonLdScript data={[organizationJsonLd(), magBlogJsonLd(archive.slice(0, 8))]} />

      <h1 className="sr-only">{MAG_NAME}</h1>

      {/*
        Hero: 2fr | 1fr from lg; the side cards two-up under the lead at md,
        stacked below that. 2fr, not the old 1.55fr, because the side cards
        are image-on-top now and need height rather than width — at 2:1 the
        two columns land within ~50px of each other at the archive's usual
        ratios, and the cards' text areas absorb the rest.
      */}
      {featured && (
        <section aria-labelledby="lead-heading" className="mt-6 lg:mt-8">
          <h2 id="lead-heading" className="sr-only">
            مطلب اصلی
          </h2>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <HeroFeature article={featured} />

            {heroSide.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:flex lg:flex-col [&>*]:lg:flex-1">
                {heroSide.map((article) => (
                  <HeroSideCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {picks.length > 0 && <EditorsPicks items={picks} />}

      {/* Body: 1fr | 320px, 56px column gap. */}
      {/* Section rhythm is the system's 60 / 96 — between every block below. */}
      <div className="mt-[60px] grid items-start gap-[60px] lg:mt-24 lg:grid-cols-[1fr_320px] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-[60px] lg:gap-24">
          {/*
            TWO «تازه‌ترین», NOT ONE. A single list let the RSS automation's
            two items a day push every analysis and lesson off the page within
            a week; the team asked for news and articles to have a list each.
          */}
          <LatestSection
            id="latest-articles-heading"
            title="تازه‌ترین مقالات"
            href="/archive"
            linkLabel="همه‌ی مطالب"
            items={latestArticles}
          />
          <LatestSection
            id="latest-news-heading"
            title="تازه‌ترین اخبار"
            href="/news"
            linkLabel="همه‌ی اخبار"
            items={latestNews}
          />

          {topics.map((topic) => (
            <TopicSection key={topic.key} topic={topic} />
          ))}

          <div className="flex justify-center">
            <Link
              href="/archive"
              className="inline-flex h-[46px] items-center rounded-full border border-border-interactive px-6 text-[15px] text-text-primary transition-colors hover:border-accent hover:bg-accent-soft"
            >
              مطالب بیشتر
            </Link>
          </div>
        </div>

        {/*
          NOT STICKY ANY MORE. With the InChart card added the column is taller
          than a laptop viewport, and a sticky box taller than the viewport
          holds its TOP edge until the page bottom arrives — the newsletter
          form at its foot would be unreachable for the whole of a body that is
          now several screens long.
        */}
        <aside className="flex flex-col gap-6">
          <CategoryListCard markets={markets} />
          <InchartPricesCard />
          <NewsletterCta />
        </aside>
      </div>
    </main>
  );
}
