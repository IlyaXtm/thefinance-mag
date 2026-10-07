import type { Metadata } from 'next';
import { getAllSummaries } from '@/features/mag/api/v1/mag.service';
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
import { FeaturedSection, LatestSection, TopicSection } from './_components/LandingSections';

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
  const archive = await getAllSummaries();
  const { featured, heroSide, picks, picksSource, articles, news, markets } =
    buildLanding(archive);

  return (
    <main id="main-content" tabIndex={-1} className="mag-gutter">
      <JsonLdScript data={[organizationJsonLd(), magBlogJsonLd(archive.slice(0, 8))]} />

      {/*
        THE MASTHEAD. The page's h1 used to be `sr-only`, so the top of the
        page had no focal point and nothing said whose magazine this was —
        the team's review: «بالای صفحه نقطه تمرکز ندارد». Now the h1 is the
        visible name, with the one-line description the metadata already uses.
      */}
      <header className="mt-8 lg:mt-12">
        <h1 className="text-display font-bold tracking-[-0.4px] text-text-primary">{MAG_NAME}</h1>
        <p className="mt-2 text-[15px] text-text-secondary md:text-[17px]">{MAG_DESCRIPTION}</p>
      </header>

      {featured && (
        <section aria-labelledby="lead-heading" className="mt-6 lg:mt-8">
          <h2 id="lead-heading" className="sr-only">
            مطلب اصلی
          </h2>

          {/*
            Featured | three beside it. 1.45fr | 1fr: the side cards are rows
            (thumbnail + title), so they need width for the title more than
            height, and at this split three of them land at about the lead's
            height. They are flex-1 in their column and centre their contents,
            so any difference becomes space around a thumbnail, never a
            stretched one.
          */}
          <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
            <HeroFeature article={featured} />

            {heroSide.length > 0 && (
              <div className="flex flex-col gap-4 lg:gap-6 [&>*]:lg:flex-1">
                {heroSide.map((article) => (
                  <HeroSideCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* One purpose per section — see lib/landing.ts. Rhythm is 60 / 96. */}
      <div className="mt-[60px] flex flex-col gap-[60px] lg:mt-24 lg:gap-24">
        <FeaturedSection items={picks} source={picksSource} />

        <LatestSection
          id="articles-heading"
          title="تازه‌ترین مقالات"
          href="/category/articles"
          items={articles}
        />
        <LatestSection id="news-heading" title="تازه‌ترین اخبار" href="/news" items={news} />

        {markets.map((block) => (
          <TopicSection key={block.key} topic={block} />
        ))}

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
