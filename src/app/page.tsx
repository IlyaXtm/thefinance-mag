import type { Metadata } from 'next';
import { getArticles, getMarkets } from '@/features/mag/api/v1/mag.service';
import { magBlogJsonLd, organizationJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { magPath, MAG_DESCRIPTION, MAG_NAME } from '@/features/mag/lib/site';
import {
  ArticleRow,
  FeaturedArticle,
  NewsletterCta,
  SectionHeading,
  Section,
  TopicList,
} from '@/features/mag/components';

/**
 * thefinance.ir/mag — the index.
 *
 * A SERVER COMPONENT reading the service directly rather than through an SWR
 * hook. SWR renders an empty shell and fills it client-side, which is exactly
 * what a crawler sees: nothing. SEO is this product's first priority, so
 * indexable content is server-rendered.
 *
 * THE SHAPE OF THIS PAGE IS DICTATED BY THE ARCHIVE, NOT BY A TEMPLATE.
 *
 * 32 published articles. 18 carry no market. Housing has zero. No reports
 * exist. The original design — a 1+3 lead block, a six-way market filter, a
 * nine-card grid and a reports band — consumed twelve articles immediately,
 * showed several of them twice, and advertised three empty buckets.
 *
 * So: one image, everything else text, and every section drawn from a
 * non-overlapping pool.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: MAG_NAME,
  description: MAG_DESCRIPTION,
  alternates: { canonical: '/mag' },
};

export default async function MagIndexPage() {
  const [latest, education, markets] = await Promise.all([
    getArticles({ page: 1, perPage: 7 }),
    getArticles({ page: 1, perPage: 6, contentType: 'education' }),
    getMarkets(),
  ]);

  const [featured, ...rest] = latest.items;

  /*
    De-duplication.

    Anything shown in the hero or the latest list is excluded from the
    educational section. Without this the same article appears twice on one
    screen, which is what makes a small archive look both sparse AND
    repetitive — the single most avoidable error at this size.
  */
  const shown = new Set(latest.items.map((a) => a.slug));
  const learning = education.items.filter((a) => !shown.has(a.slug)).slice(0, 5);

  return (
    <main>
      <JsonLdScript data={[organizationJsonLd(), magBlogJsonLd(latest.items)]} />

      {/*
        Masthead. Deliberately quiet: no hero image, no gradient, no
        decorative rule. The lead article is the page's focal point, and a
        second competing one would flatten it.
      */}
      <Section className="!pb-0">
        <div className="flex flex-col gap-3 border-b border-border-strong pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[30px] font-bold leading-[1.4] text-text-primary md:text-[38px]">
              {MAG_NAME}
            </h1>
            <p className="mt-2 text-text-secondary">{MAG_DESCRIPTION}</p>
          </div>

          {/* Native form action — basePath is NOT applied automatically, so it
              goes through magPath. Without it the search box posts to
              thefinance.ir/search and leaves the magazine. */}
          <form action={magPath('/search')} method="get" className="shrink-0">
            <label htmlFor="mag-search" className="sr-only">
              جستجو در مجله
            </label>
            <input
              id="mag-search"
              name="q"
              type="search"
              placeholder="جستجو در مجله"
              className="min-h-11 w-full rounded-full border border-border-interactive bg-transparent px-4 text-[14px] text-text-primary placeholder:text-text-muted md:w-56"
            />
          </form>
        </div>
      </Section>

      {featured && (
        <Section className="!pb-0 !pt-10">
          <FeaturedArticle article={featured} />
        </Section>
      )}

      {/*
        Two columns on desktop: the reading list carries the weight, topics sit
        alongside as a quiet index. On mobile they stack, latest first —
        somebody on a phone came to read, not to browse taxonomy.
      */}
      <Section className="!pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-12">
            <section>
              <SectionHeading title="تازه‌ترین‌ها" href="/archive" linkLabel="آرشیو" />
              <div>
                {rest.map((article) => (
                  <ArticleRow key={article.id} article={article} />
                ))}
              </div>
            </section>

            {learning.length > 0 && (
              <section>
                {/*
                  Not numbered.

                  A numbered path implies a teaching order this data doesn't
                  carry yet — WordPress sorts by publication date, which has no
                  relationship to what a beginner should read first. Numbering
                  it anyway would be decoration pretending to be structure.

                  When the `series_order` field lands (backlog B2), pass `index`
                  to ArticleRow and this becomes the real learning path.
                */}
                <SectionHeading
                  title="آموزش"
                  href="/archive?type=education"
                  linkLabel="همه آموزش‌ها"
                />
                <div>
                  {learning.map((article) => (
                    <ArticleRow key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="flex flex-col gap-12">
            <section>
              <SectionHeading title="موضوع‌ها" />
              <TopicList markets={markets} />
            </section>

            <NewsletterCta />
          </aside>
        </div>
      </Section>
    </main>
  );
}
