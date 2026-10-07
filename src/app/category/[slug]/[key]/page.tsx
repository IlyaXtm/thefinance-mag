import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllSummaries, getMarkets } from '@/features/mag/api/v1/mag.service';
import { EDUCATION_DESCRIPTION, educationChips, educationFor } from '@/features/mag/lib/education';
import { toMetadata } from '@/features/mag/lib/seo';
import { isThinArchive } from '@/features/mag/lib/taxonomy';
import { emptyLessonsFallback } from '@/features/mag/lib/subcategories';
import { MAG_NAME } from '@/features/mag/lib/site';
import { ArchiveShell, ChipFilterBar } from '@/features/mag/components';

/**
 * /mag/category/education/<topic> — where the chips under «می‌خواهی چه چیزی یاد
 * بگیری؟» lead: one market's lessons, or one tagged topic's («شروع از صفر»,
 * «آپشن»).
 *
 * Only `education` has topics; any other category here is a 404, and so is a
 * topic with no lessons — a chip is only drawn for a topic that has some.
 *
 * A MARKET's page here is indexable (2026-10-07). It is the sub-category
 * «آموزش › <market>», and since the market archives were retired it is where
 * `/market/<slug>` 301s — the page that inherits their search equity. It
 * follows the same floor the market archives did (`isThinArchive`, also the
 * sitemap's), and its description is the market's own when WordPress has one.
 *
 * A TAG topic («شروع از صفر», «آپشن») stays NOINDEX, FOLLOW: its lessons are
 * also on آموزش and on their market's page, and a third list would compete
 * with both. Readers get a real prerendered page; crawlers follow it.
 */

export const revalidate = 300;
/*
  dynamicParams stays ON, and the reason is the content team, not the code.
  A topic chip appears the moment an editor tags a post (docs/content-team-
  tags.md promises no deploy is needed). With params frozen at build time,
  that chip would link to a 404 until the next release. On demand, an unknown
  key renders once, is cached like any ISR page, and a key with no lessons
  still 404s through `resolve()`.
*/

export async function generateStaticParams(): Promise<Array<{ slug: string; key: string }>> {
  const [archive, markets] = await Promise.all([getAllSummaries(), getMarkets()]);
  return educationChips(archive, markets).map((chip) => ({ slug: 'education', key: chip.key }));
}

async function resolve(slug: string, rawKey: string) {
  if (slug !== 'education') return null;
  const key = safeDecode(rawKey);
  const [archive, markets] = await Promise.all([getAllSummaries(), getMarkets()]);
  const chips = educationChips(archive, markets);
  const chip = chips.find((c) => c.key === key);
  if (!chip) return null;
  const market = markets.find((m) => m.slug === key) ?? null;
  return { chip, chips, markets, market, lessons: educationFor(archive, key) };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; key: string }>;
}): Promise<Metadata> {
  const { slug, key } = await params;
  const found = await resolve(slug, key);
  if (!found) return { title: 'صفحه پیدا نشد' };

  return toMetadata({
    seo: null,
    path: `/category/education/${found.chip.key}`,
    fallbackTitle: `آموزش ${found.chip.name}`,
    fallbackDescription: found.market?.description || EDUCATION_DESCRIPTION,
    noindex: !found.market || isThinArchive(found.lessons.length),
  });
}

export default async function EducationTopicPage({
  params,
}: {
  params: Promise<{ slug: string; key: string }>;
}) {
  const { slug, key } = await params;
  const found = await resolve(slug, key);
  if (!found) {
    /* A market with no lessons is still a URL people have: `/market/<slug>`
       301s here. Send it on rather than 404 — see emptyLessonsFallback. */
    if (slug === 'education') {
      const fallback = emptyLessonsFallback(await getMarkets(), safeDecode(key));
      if (fallback) permanentRedirect(fallback);
    }
    notFound();
  }

  const { chip, chips, markets, market, lessons } = found;

  return (
    <ArchiveShell
      crumbs={[
        { name: MAG_NAME, href: '/' },
        { name: 'آموزش', href: '/category/education' },
        { name: chip.name, href: `/category/education/${chip.key}` },
      ]}
      title={`آموزش ${chip.name}`}
      description={market?.description || EDUCATION_DESCRIPTION}
      /* One page: a topic holds tens of lessons at most, and the archive
         fetch already has every one of them. */
      articles={{
        items: lessons,
        page: 1,
        perPage: Math.max(lessons.length, 1),
        total: lessons.length,
        totalPages: 1,
      }}
      filterBar={
        <ChipFilterBar
          items={chips.map((c) => ({
            key: c.key,
            name: c.name,
            href: `/category/education/${c.key}`,
          }))}
          activeKey={chip.key}
          allHref="/category/education"
          label="موضوع آموزش"
          showLabel={false}
        />
      }
      headingId="education-topic-heading"
      headingText={`آموزش ${chip.name}`}
      basePath={`/category/education/${chip.key}`}
      emptyMessage="هنوز آموزشی در این موضوع منتشر نشده."
      emptyAction={{ href: '/category/education', label: 'همه‌ی آموزش‌ها' }}
      markets={markets}
      activeHref={`/category/education/${chip.key}`}
    />
  );
}
