import type { Metadata } from 'next';
import { getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { magBlogJsonLd, organizationJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import {
  ArticleGrid,
  ArticleGridEmpty,
  ContentTypeFilterBar,
  PageHeader,
  Section,
  SectionInner,
} from '@/features/mag/components';

/**
 * thefinance.ir/mag — the listing.
 *
 * A SERVER COMPONENT reading the service directly, not an SWR hook.
 *
 * That is deliberate, and it is the one place the feature-layer convention
 * bends. SWR renders an empty shell first and fills it on the client, which is
 * exactly what a crawler sees: nothing. SEO is this product's first priority,
 * so indexable content is server-rendered and SWR is reserved for
 * client-interactive views like search-as-you-type.
 *
 * The service is still the only source-switch point, so NEXT_PUBLIC_USE_MOCK
 * works here as everywhere else.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'مجله فایننس',
  description: 'تحلیل، گزارش و آموزش برای بازارهای مالی',
  alternates: { canonical: '/mag' },
};

export default async function MagListingPage() {
  /*
    Fetched in parallel. Sequential awaits would add a round trip for no
    reason, and this runs on every ISR regeneration.
  */
  const [articles, markets] = await Promise.all([
    getArticles({ page: 1, perPage: 9 }),
    getMarkets(),
  ]);

  const hasArticles = articles.items.length > 0;

  return (
    <main>
      {/* Blog schema with the latest posts — helps Google understand the
          section as a publication rather than a loose set of pages. */}
      <JsonLdScript data={[organizationJsonLd(), magBlogJsonLd(articles.items)]} />

      <Section className="!pb-0">
        <PageHeader title="مجله فایننس" subtitle="تحلیل، گزارش و آموزش برای بازارهای مالی" />
      </Section>

      <SectionInner className="pt-10">
        <ContentTypeFilterBar contentTypes={CONTENT_TYPES} />
      </SectionInner>

      <Section>
        {/*
          Visually hidden heading. The grid is the only content here, so a
          visible «تازه‌ترین‌ها» would add nothing — but removing the heading
          entirely would skip h1 -> h3 and break the outline.
        */}
        <h2 className="sr-only">تازه‌ترین مطالب</h2>

        {hasArticles ? <ArticleGrid articles={articles.items} /> : <ArticleGridEmpty />}

        {/*
          Markets are fetched but not surfaced as a filter yet: 18 of 32
          articles have no market, so the bar would be mostly empty. The data
          is here for the archive pages and for when tagged content exists.
        */}
        <p className="sr-only">{markets.length} بازار</p>
      </Section>
    </main>
  );
}
