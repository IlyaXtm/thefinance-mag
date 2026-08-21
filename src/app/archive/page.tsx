import type { Metadata } from 'next';
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
 * `type` is read from the query string and `page` is not — the page number now
 * lives in the path, at `/archive/page/<n>`.
 *
 * NOTE: this route is still dynamic, and `type` is why. Awaiting `searchParams`
 * at all opts a route out of prerendering, so `/archive` cannot be static while
 * it also serves `/archive?type=education` — one route cannot be both. Moving
 * the page number out was still worth doing on its own: it is what makes the
 * market and author archives static, and it stops `/archive/page/2` from being
 * a second dynamic shape. Making `/archive` itself static needs the type filter
 * to leave the query string too, which is a product decision, not a technical
 * one.
 */
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const contentType = CONTENT_TYPES.find((t) => t.slug === type);

  return <ArchiveView contentType={contentType} page={1} />;
}
