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
 * Normalise an image src for `next/image`.
 *
 * THE TRAP, which has now cost two separate rounds: with `basePath` set, the
 * image optimizer resolves a root-relative `src` against the SERVER root, not
 * the app. `/mock/covers/x.jpg` therefore 400s with "The requested resource
 * isn't a valid image" while `/mag/mock/covers/x.jpg` returns 200 — and the
 * page still renders, just with every image missing.
 *
 * The first real deployment hit the remote-pattern half of this (the CMS
 * uploads path was allow-listed without `/mag`, so every optimised image
 * 400'd). This is the local half.
 *
 * Absolute URLs pass through untouched — WordPress already returns
 * `https://thefinance.ir/mag/wp-content/uploads/…`. Idempotent, so a src that
 * already carries the prefix is not given a second one.
 */
export function imageSrc(url: string): string {
  if (!url.startsWith('/')) return url;
  if (url === MAG_PATH || url.startsWith(`${MAG_PATH}/`)) return url;
  return `${MAG_PATH}${url}`;
}

/** Absolute URL for a Mag path. Canonicals must never point at the CMS host. */
export function magUrl(path = ''): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${MAG_URL}${clean === '/' ? '' : clean}`;
}
