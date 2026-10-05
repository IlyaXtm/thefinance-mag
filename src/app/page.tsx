import type { Metadata } from 'next';
import { getAllSummaries, getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { magBlogJsonLd, organizationJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_DESCRIPTION, MAG_NAME } from '@/features/mag/lib/site';
import { buildLanding } from '@/features/mag/lib/landing';
import { NEWSLETTER_ENABLED } from '@/features/mag/lib/newsletter';
import {
  HeroFeature,
  HeroSideCard,
  InchartPricesCard,
  NewsletterCta,
  SocialChannelsCard,
} from '@/features/mag/components';
import {
  CategoryChips,
  FeaturedSection,
  LatestSection,
  TopicSection,
} from './_components/LandingSections';

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

  const { featured, heroSide, picks, picksSource, latestArticles, latestNews, topics } =
    buildLanding(archive, inchart);

  return (
    <main id="main-content" tabIndex={-1} className="mag-gutter">
      <JsonLdScript data={[organizationJsonLd(), magBlogJsonLd(archive.slice(0, 8))]} />

      <h1 className="sr-only">{MAG_NAME}</h1>

      {/*
        THE PAGE FOLLOWS THE TEAM'S REFERENCE (faraz.io/blog, 2026-10-05):
        hero → featured → categories → latest articles → latest news → topics
        → a closing row. Full width throughout; see LandingSections for why the
        sidebar went. Section rhythm is the system's 60 / 96.
      */}
      {featured && (
        <section aria-labelledby="lead-heading" className="mt-6 lg:mt-8">
          <h2 id="lead-heading" className="sr-only">
            مطلب اصلی
          </h2>

          {/*
            Lead | 2×2 — five image articles above the fold. Equal halves: the
            2×2 cells are image-on-top cards and need the width. The rows
            stretch to the lead's height and the cards' text areas absorb it.
          */}
          <div className="grid gap-6 lg:grid-cols-2">
            <HeroFeature article={featured} />

            {heroSide.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                {heroSide.map((article) => (
                  <HeroSideCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mt-[60px] flex flex-col gap-[60px] lg:mt-24 lg:gap-24">
        <FeaturedSection items={picks} source={picksSource} />

        <CategoryChips markets={markets} />

        {/*
          TWO «تازه‌ترین», NOT ONE. A single list let the RSS automation's two
          items a day push every analysis and lesson off the page within a
          week; the team asked for news and articles to have a list each.
        */}
        <LatestSection
          id="latest-articles-heading"
          title="تازه‌ترین مقالات"
          href="/archive"
          items={latestArticles}
        />
        <LatestSection
          id="latest-news-heading"
          title="تازه‌ترین اخبار"
          href="/news"
          items={latestNews}
        />

        {topics.map((topic) => (
          <TopicSection key={topic.key} topic={topic} />
        ))}

        {/*
          What the sidebar carried, as a row. InChart first: it stands where
          the team asked for a live price strip, which Mag does not print —
          see InchartPricesCard.
        */}
        {/* Three-up only with the newsletter on: it renders nothing while
            NEWSLETTER_ENABLED is false, and two cards in a three-column row
            leave the empty slot the team called wasteful. */}
        <div
          className={`grid gap-4 md:grid-cols-2 lg:gap-6 ${NEWSLETTER_ENABLED ? 'xl:grid-cols-3' : ''}`}
        >
          <InchartPricesCard />
          <NewsletterCta />
          <SocialChannelsCard />
        </div>
      </div>
    </main>
  );
}
