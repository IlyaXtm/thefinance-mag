import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { magBlogJsonLd, organizationJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_DESCRIPTION, MAG_NAME } from '@/features/mag/lib/site';
import type { ContentTypeSlug } from '@/features/mag/types/mag.types';
import {
  CategoryListCard,
  HeroFeature,
  HeroSideCard,
  NewsletterCta,
  PostCard,
} from '@/features/mag/components';

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

/**
 * The lead slot never carries news.
 *
 * An RSS automation files roughly two «اخبار» a day, so leading with the
 * newest article meant the hero was almost always a three-minute translated
 * headline — a publication whose identity is analysis and education would
 * never show either in the largest editorial statement on its front page.
 */
const LEAD_TYPES: ReadonlyArray<ContentTypeSlug> = ['analysis', 'education', 'report'];

/** Wide enough to outrun the automation — about ten days of it. */
const LEAD_WINDOW = 20;

export default async function MagIndexPage() {
  const [pool, markets] = await Promise.all([
    getArticles({ page: 1, perPage: LEAD_WINDOW }),
    getMarkets(),
  ]);

  const featured = pool.items.find((a) => LEAD_TYPES.includes(a.contentType.slug));
  const rest = pool.items.filter((a) => a.slug !== featured?.slug);

  /* Two beside the hero, six in the grid below, nothing repeated. */
  const heroSide = rest.slice(0, 2);
  const grid = rest.slice(2, 8);

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-24">
      <JsonLdScript data={[organizationJsonLd(), magBlogJsonLd(pool.items.slice(0, 8))]} />

      <h1 className="sr-only">{MAG_NAME}</h1>

      {/* Hero: 1.55fr | 1fr, stacking below lg. */}
      {featured && (
        <section aria-labelledby="lead-heading" className="mt-6 lg:mt-8">
          <h2 id="lead-heading" className="sr-only">
            مطلب اصلی
          </h2>

          <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
            <HeroFeature article={featured} />

            {heroSide.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
                {heroSide.map((article) => (
                  <HeroSideCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Body: 1fr | 320px, 56px gap. */}
      <div className="mt-14 grid items-start gap-10 lg:mt-16 lg:grid-cols-[1fr_320px] lg:gap-14">
        <section aria-labelledby="latest-heading">
          <div className="mb-6 flex items-center gap-4">
            <h2
              id="latest-heading"
              className="text-[22px] font-bold tracking-[-0.2px] text-text-primary md:text-[24px]"
            >
              تازه‌ترین مطالب
            </h2>
            <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
            <Link
              href="/archive"
              className="inline-flex min-h-11 shrink-0 items-center text-[14px] text-accent transition-colors hover:text-text-primary"
            >
              همه‌ی مطالب ←
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:gap-7">
            {grid.map((article) => (
              <PostCard key={article.id} article={article} />
            ))}
          </div>

          <div className="mt-9 flex justify-center">
            <Link
              href="/archive"
              className="inline-flex h-[46px] items-center rounded-full border border-border-interactive px-6 text-[15px] text-text-primary transition-colors hover:border-accent hover:bg-accent-soft"
            >
              مطالب بیشتر
            </Link>
          </div>
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[76px]">
          <CategoryListCard markets={markets} />
          <NewsletterCta />
        </aside>
      </div>
    </main>
  );
}
