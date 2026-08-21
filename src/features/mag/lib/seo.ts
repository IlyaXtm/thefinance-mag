import type { Metadata } from 'next';
import type { MagSeo } from '../types/mag-seo.types';
import { MAG_NAME, magUrl } from './site';

/**
 * Maps Rank Math's SEO payload onto Next.js Metadata.
 *
 * The canonical is the important part. Rank Math returns whatever WordPress
 * `siteurl` says, and if that ever moves to wp.thefinance.ir the CMS host
 * starts appearing in canonicals — the same 32 articles indexed from two
 * hosts, which dilutes the ranking of the real one. It fails silently: the
 * page renders perfectly the whole time.
 *
 * So the canonical is always rebuilt from the known public origin and the
 * slug, never passed through from the API.
 */

/**
 * Rank Math emits directives as a flat list: ["index","follow","max-snippet:-1"].
 * Next.js wants them structured. Unknown directives are ignored rather than
 * guessed at.
 */
function parseRobots(directives: string[]): Metadata['robots'] {
  const has = (d: string) => directives.includes(d);
  const valueOf = (prefix: string): number | undefined => {
    const found = directives.find((d) => d.startsWith(`${prefix}:`));
    if (!found) return undefined;
    const n = Number(found.split(':')[1]);
    return Number.isFinite(n) ? n : undefined;
  };

  const imagePreview = directives
    .find((d) => d.startsWith('max-image-preview:'))
    ?.split(':')[1];

  return {
    index: !has('noindex'),
    follow: !has('nofollow'),
    googleBot: {
      index: !has('noindex'),
      follow: !has('nofollow'),
      'max-snippet': valueOf('max-snippet'),
      'max-video-preview': valueOf('max-video-preview'),
      'max-image-preview':
        imagePreview === 'none' || imagePreview === 'standard' || imagePreview === 'large'
          ? imagePreview
          : undefined,
    },
  };
}

export function toMetadata({
  seo,
  path,
  fallbackTitle,
  fallbackDescription,
  ogTitle,
  imageUrl,
  publishedAt,
  modifiedAt,
  authorName,
}: {
  seo: MagSeo | null;
  /** Path within /mag, e.g. `/notcoin-explore`. */
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
  /**
   * Title for the share card only.
   *
   * `<title>` gets the layout's `%s | مجله فایننس` template appended; og:title
   * does not, so a listing page whose title is «آرشیو» would share as the bare
   * word with no publication attached. Pages that need the fuller form pass it
   * here.
   */
  ogTitle?: string;
  imageUrl?: string | null;
  publishedAt?: string;
  modifiedAt?: string | null;
  authorName?: string;
}): Metadata {
  const canonical = magUrl(path);
  const title = seo?.title ?? fallbackTitle;
  const description = seo?.description ?? fallbackDescription;
  const ogImage = seo?.openGraph?.imageUrl ?? imageUrl ?? undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: seo ? parseRobots(seo.robots) : undefined,
    openGraph: {
      type: publishedAt ? 'article' : 'website',
      title: seo?.openGraph?.title ?? ogTitle ?? title,
      description: seo?.openGraph?.description ?? description,
      url: canonical,
      siteName: MAG_NAME,
      locale: 'fa_IR',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      ...(publishedAt
        ? {
            publishedTime: publishedAt,
            ...(modifiedAt ? { modifiedTime: modifiedAt } : {}),
            ...(authorName ? { authors: [authorName] } : {}),
          }
        : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: seo?.openGraph?.title ?? ogTitle ?? title,
      description: seo?.openGraph?.description ?? description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
