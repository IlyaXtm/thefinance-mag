/**
 * Site-level constants used by metadata and structured data.
 *
 * These values appear in JSON-LD, which Google uses for entity resolution —
 * they must stay identical across every page and must not drift from what the
 * site says elsewhere. That is why they live in one file rather than being
 * typed inline per page.
 */

/*
 * Server-only name first, `NEXT_PUBLIC_` kept as a fallback so an existing
 * deployment keeps working. Nothing that reads this ships to the browser —
 * the header, footer and metadata builders are all server components — so the
 * public prefix buys nothing and only invites the value into a client bundle
 * later.
 *
 * Note this value is the SAME in staging and production on purpose: canonicals
 * must always point at the production origin, never at the environment serving
 * them. See CLAUDE.md.
 */
export const SITE_ORIGIN =
  process.env.SITE_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://thefinance.ir';

/** The magazine section, not the whole platform. */
export const MAG_NAME = 'مجله فایننس';
export const MAG_PATH = '/mag';
export const MAG_URL = `${SITE_ORIGIN}${MAG_PATH}`;
export const MAG_DESCRIPTION = 'تحلیل، گزارش و آموزش برای بازارهای مالی';

/**
 * The publishing organisation.
 *
 * These exact strings appear in JSON-LD on every page. Google uses them for
 * entity resolution — deciding that "فایننس" the publisher is one consistent
 * thing across the web — so they must not drift between pages or from what the
 * site says elsewhere.
 *
 * `logo` is the mark alone (no wordmark), 512×512 with transparency. Google
 * asks for at least 112px in each dimension for the publisher logo.
 *
 * `sameAs` is how Google links this publisher to its known profiles. Each
 * entry strengthens the entity signal; add new official profiles here rather
 * than anywhere else.
 */
export const ORGANIZATION = {
  name: 'فایننس',
  legalName: 'TheFinance',
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/logo.png`,
  aboutPage: `${SITE_ORIGIN}/about-us`,
  sameAs: [
    'https://www.instagram.com/thefinance.ir/',
  ] as string[],
} as const;

/**
 * Href for a plain HTML form `action` or a raw `<a>`.
 *
 * next/link and the router prefix basePath automatically; a native form
 * action does NOT. `<form action="/search">` therefore posts to
 * thefinance.ir/search — the main site — instead of the magazine, and the
 * search box silently leaves the app. Every native action goes through here.
 */
export function magPath(path = ''): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${MAG_PATH}${clean === '/' ? '' : clean}`;
}

/**
 * The feed alternate, for `Metadata.alternates.types`.
 *
 * It has to be repeated on every page that sets `alternates` at all, because
 * Next REPLACES the whole `alternates` object from a page rather than merging
 * its sub-fields — so a page declaring only `canonical` silently drops the
 * layout's feed link. Exported from here so there is one string to change.
 */
export function feedAlternate(): Record<string, Array<{ url: string; title: string }>> {
  /* A fresh object each call — Next's Metadata type wants a mutable array, and
     a shared literal would be one object handed to every page. */
  return {
    'application/rss+xml': [{ url: `${MAG_URL}/feed`, title: `${MAG_NAME} — RSS` }],
  };
}

/**
 * The CMS host, as the image optimizer must address it.
 *
 * This is NOT `SITE_ORIGIN` and the difference is not cosmetic. `next/image`
 * optimises server-side: the fetch is made by Node inside the container, not
 * by the reader's browser. nginx on the frontend box listens on `:80` only —
 * TLS terminates at the CDN — so a fetch of `https://thefinance.ir/...` from
 * inside that container leaves the machine, reaches the CDN and hairpins back
 * to the same box. It times out, and every image on the site 502s.
 *
 * `wp.thefinance.ir` is a different host and resolves normally, so media that
 * the optimizer has to fetch is addressed there directly.
 *
 * Hardcoded rather than read from the environment on purpose: it has to agree
 * exactly with the `remotePatterns` entry in next.config.ts, which cannot be
 * environment-driven either, and `imageSrc` is called from components that may
 * render on the client, where a non-`NEXT_PUBLIC_` variable is undefined and
 * would produce a different src on each side of hydration.
 */
export const CMS_ORIGIN = 'https://wp.thefinance.ir';

/** Everything from this segment on is identical on both hosts. */
const UPLOADS_PATH = '/wp-content/uploads/';

/**
 * Address an uploads URL at the CMS host, for the optimizer only.
 *
 * WHY THE PATH IS REBUILT AND NOT JUST THE HOST SWAPPED. WordPress derives
 * media URLs from `siteurl`, which is `https://thefinance.ir/mag`, so they
 * come back as `https://thefinance.ir/mag/wp-content/uploads/...`. On the CMS
 * host the uploads live at the ROOT - the `/mag` in `/mag/graphql` and
 * `/mag/wp-admin` is nginx there stripping a prefix, not a subdirectory
 * install. Measured on 2026-09-06:
 *
 *     https://wp.thefinance.ir/wp-content/uploads/X.jpg      200
 *     https://wp.thefinance.ir/mag/wp-content/uploads/X.jpg  404
 *
 * A host-only swap would therefore turn every image into a 404 instead of a
 * 502 - the same failure one hop upstream, which is the exact mistake the
 * nginx media block made twice. So the URL is rebuilt from `/wp-content/...`.
 *
 * Anything that is not an uploads URL is returned untouched.
 */
export function toCmsMediaUrl(url: string): string {
  const at = url.indexOf(UPLOADS_PATH);
  if (at === -1) return url;
  return `${CMS_ORIGIN}${url.slice(at)}`;
}

/**
 * Normalise an image src for `next/image`.
 *
 * THE TRAP, which has now cost two separate rounds: with `basePath` set, the
 * image optimizer resolves a root-relative `src` against the SERVER root, not
 * the app. `/mock/covers/x.jpg` therefore 400s with "The requested resource
 * isn't a valid image" while `/mag/mock/covers/x.jpg` returns 200 - and the
 * page still renders, just with every image missing.
 *
 * The first real deployment hit the remote-pattern half of this (the CMS
 * uploads path was allow-listed without `/mag`, so every optimised image
 * 400'd). This is the local half.
 *
 * -- And why absolute URLs no longer pass through untouched ---------------
 *
 * They used to, because `mapImage` had already rewritten them to
 * `https://thefinance.ir/mag/wp-content/uploads/...`. That is the right host
 * for a reader and the wrong one for the optimizer - see `toCmsMediaUrl`. The
 * rewrite happens HERE rather than in the mapper because the two consumers of
 * `featuredImage.url` need different hosts and the mapper cannot know which is
 * asking:
 *
 *   `next/image` src  -> optimizer fetch, server-side  -> CMS host
 *   JSON-LD `image`   -> what Google is told about     -> public origin
 *   `og:image`        -> what a social crawler fetches -> public origin
 *
 * Moving it into the mapper would put the de-indexed CMS host into structured
 * data and Open Graph, which is what PR #2 introduced `toPublicUrl` to
 * prevent. Leaving it out of both is what made every image 502 after cutover.
 * `imageSrc` is the boundary where "this URL is about to be fetched by the
 * optimizer" is actually known, so the split lives here and `MagImage.url`
 * stays the public URL it has always been.
 */
export function imageSrc(url: string): string {
  if (!url.startsWith('/')) return toCmsMediaUrl(url);
  if (url === MAG_PATH || url.startsWith(`${MAG_PATH}/`)) return url;
  return `${MAG_PATH}${url}`;
}

/** Absolute URL for a Mag path. Canonicals must never point at the CMS host. */
export function magUrl(path = ''): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${MAG_URL}${clean === '/' ? '' : clean}`;
}
