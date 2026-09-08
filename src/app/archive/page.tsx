import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { getCategories } from '@/features/mag/api/v1/mag.service';
import { CONTENT_TYPES } from '@/features/mag/lib/content-types';
import { toMetadata } from '@/features/mag/lib/seo';
import { MAG_NAME } from '@/features/mag/lib/site';
import { ArchiveView } from './_components/ArchiveView';

/**
 * /mag/archive — the complete reverse-chronological listing.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE INDEX.
 *
 * The index is curated: one lead, a short reading list, a topic index. It
 * deliberately does not try to show everything. That left a real gap — the
 * index showed seven articles and pagination started at the tenth, so three
 * were reachable from nowhere.
 *
 * This page is the honest complete list, and it's where the content-type
 * filter belongs: filtering is a browsing action, and browsing happens here
 * rather than on a curated front page.
 */

export const revalidate = 300;

export const metadata: Metadata = toMetadata({
  seo: null,
  path: '/archive',
  fallbackTitle: 'آرشیو',
  fallbackDescription: `همه مطالب ${MAG_NAME}`,
  ogTitle: `آرشیو | ${MAG_NAME}`,
});

/**
 * Page ONE of the archive.
 *
 * `type` is read from the query string and `page` is not — the page number
 * lives in the path, at `/archive/page/<n>`.
 *
 * THIS ROUTE IS STILL DYNAMIC AND `type` IS STILL WHY. Awaiting `searchParams`
 * at all opts a route out of prerendering, so `/archive` cannot be static while
 * it also answers `/archive?type=education`. What changed is what it answers
 * WITH: a `?type=` that has a real category behind it is now a permanent
 * redirect to `/category/<slug>`, which is static and indexable. The dynamic
 * shape survives as a compatibility surface for old links, not as the address
 * of any content.
 *
 * `/archive` itself — no query string — is unaffected and still renders here.
 * It cannot be prerendered while this function reads `searchParams` at all;
 * making it static would mean moving the redirect into middleware, which
 * cannot ask the CMS which categories exist and would therefore have to
 * hardcode the list this whole feature exists to stop hardcoding.
 */
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  if (type) {
    /*
      301/308 to the path route when the category is real.

      Checked against the live taxonomy rather than against CONTENT_TYPES,
      because the two are not the same set and the difference is load-bearing
      in both directions: «مقالات» is a category with no content type, and
      «گزارش» is a content type with no category. Redirecting `?type=report`
      on the strength of it being a known type would send readers to a 404.
    */
    const categories = await getCategories();
    if (categories.some((category) => category.slug === type)) {
      permanentRedirect(`/category/${type}`);
    }
  }

  const contentType = CONTENT_TYPES.find((t) => t.slug === type);

  return <ArchiveView contentType={contentType} page={1} />;
}
