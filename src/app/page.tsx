import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllSummaries, getMarkets } from '@/features/mag/api/v1/mag.service';
import { magBlogJsonLd, organizationJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_DESCRIPTION, MAG_NAME } from '@/features/mag/lib/site';
import { buildLanding, mastheadMarkets } from '@/features/mag/lib/landing';
import { subcategoryHref } from '@/features/mag/lib/subcategories';
import { NEWSLETTER_ENABLED } from '@/features/mag/lib/newsletter';
import {
  HeroFeature,
  HeroQuadCard,
  InchartPricesCard,
  NewsletterCta,
  SocialChannelsCard,
} from '@/features/mag/components';
import {
  FeaturedSection,
  LatestSection,
  MarketColumnsSection,
  NewsListSection,
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
  const [archive, allMarkets] = await Promise.all([getAllSummaries(), getMarkets()]);
  const { featured, heroSide, picks, picksSource, articles, news, markets } =
    buildLanding(archive);
  const mastheadLinks = mastheadMarkets(allMarkets);

  return (
    <main id="main-content" tabIndex={-1} className="mag-gutter">
      <JsonLdScript data={[organizationJsonLd(), magBlogJsonLd(archive.slice(0, 8))]} />

      {/*
        THE MASTHEAD. The page's h1 used to be `sr-only`, so the top of the
        page had no focal point and nothing said whose magazine this was —
        the team's review: «بالای صفحه نقطه تمرکز ندارد». Now the h1 is the
        visible name, with the one-line description the metadata already uses.
      */}
      {/* Home v2 (2026-10-08): the market links sit beside the name — markets
          only, never sections (team comment on the handoff). 44px pills: the
          handoff's 40px is under this project's floor for a control. */}
      <header className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:mt-12">
        <div>
          <h1 className="text-display font-bold tracking-[-0.4px] text-text-primary">{MAG_NAME}</h1>
          <p className="mt-2 text-[15px] text-text-secondary md:text-[17px]">{MAG_DESCRIPTION}</p>
        </div>

        {mastheadLinks.length > 0 && (
          <nav aria-labelledby="markets-label" className="flex flex-wrap items-center gap-2">
            <span id="markets-label" className="me-1 text-[13px] font-semibold text-text-muted">
              بازارها:
            </span>
            {mastheadLinks.map((market) => (
              <Link
                key={market.slug}
                href={subcategoryHref('education', market.slug)}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-border-interactive bg-surface-raised px-4 text-[14px] text-text-secondary transition-colors duration-150 hover:border-accent hover:text-accent motion-reduce:transition-none"
              >
                {market.name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {featured && (
        <section aria-labelledby="lead-heading" className="mt-6 lg:mt-8">
          <h2 id="lead-heading" className="sr-only">
            مطلب اصلی
          </h2>

          {/*
            Lead | 2×2 — home v2 (handoff 2026-10-08), the team's faraz.io/blog
            structure. 1.25fr | 1fr; `auto-rows-fr` gives the four cards one
            row height, and every card carries badge, title and meta so a
            stretched card has no empty band.
          */}
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <HeroFeature article={featured} />

            {heroSide.length > 0 && (
              <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
                {heroSide.map((article) => (
                  <HeroQuadCard key={article.id} article={article} />
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
          /* /archive, not «مقالات»: the block is every non-news post, and
             some (inchart, uncategorised) are not filed under «مقالات», so
             only the full archive is sure to contain all six. */
          href="/archive"
          items={articles}
        />
        <NewsListSection items={news} />

        <MarketColumnsSection blocks={markets} />

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
