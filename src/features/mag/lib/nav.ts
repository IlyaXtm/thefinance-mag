import { ORGANIZATION, SITE_ORIGIN, SOCIAL_CHANNELS } from './site';

/**
 * Navigation targets.
 *
 * Links leaving the magazine are ABSOLUTE — the app runs under basePath '/mag',
 * so a relative href would resolve inside the magazine and break.
 */

export interface NavLink {
  label: string;
  href: string;
  /** True when the link leaves the magazine app. */
  external?: boolean;
}

/**
 * Header links.
 *
 * Deliberately short. Three considerations decided this:
 *
 *   - InChart and Academy are the two products a reader of technical-analysis
 *     education would actually want next. They continue the reader's intent
 *     rather than interrupting it.
 *
 *   - Paradigm is NOT here. It is the paid VIP channel, and leading an
 *     editorial page with a paid subscription is precisely what the
 *     competitive category does and what the brand book rules out. It belongs
 *     in the footer, where it reads as "this exists" rather than "buy this".
 *
 *   - «درباره ما» is in the footer too. It is a trust link people look for
 *     deliberately, not something to spend header space on.
 */
export const HEADER_LINKS: NavLink[] = [
  { label: 'اینچارت', href: 'https://inchart.thefinance.ir', external: true },
  { label: 'آکادمی', href: `${SITE_ORIGIN}/academy`, external: true },
];

/**
 * Footer.
 *
 * Carries more than the header on purpose. With roughly thirty pages, the
 * footer is how a crawler reaches market archives and author pages that are
 * otherwise two or three clicks deep — and internal linking is the main lever
 * for topical authority on a site this small.
 */
/**
 * The header's category nav — the v4 design's five links.
 *
 * The design draws one flat category axis. This codebase keeps two taxonomies
 * (`market` and `contentType`) because `decisions.md` chose "two axes, not
 * six", so each label here resolves to whichever axis actually holds that
 * content. No new taxonomy, no migration, no new URLs to redirect.
 *
 * THE LIST IS HAND-PICKED AND STAYS THAT WAY. `/mag/category/<slug>` is now
 * generated from the live taxonomy, so every category the CMS holds has a
 * route — but a route is not a nav slot. Rendering the CMS's category list
 * here would put «مقالات» (39 posts, a catch-all tag nobody chose as a
 * section) in the header for being large, and would let an editorial decision
 * about the top of every page be made by whoever adds a term. Five links,
 * chosen; new categories are reachable, indexed where they earn it, and not
 * automatically promoted.
 *
 * ONE SUBSTITUTION, stated rather than fudged: the design's fifth link is
 * «تحلیل تکنیکال», and there is no such term. Roughly 60% of the archive IS
 * technical-analysis material, but it is filed as آموزش — so that is the label
 * used, pointing where the content really is. Inventing a term to match a
 * label would put a nav link in front of an archive nobody tagged.
 */
export const CATEGORY_NAV: NavLink[] = [
  { label: 'طلا و ارز', href: '/market/gold-usd' },
  { label: 'بورس ایران', href: '/market/tse' },
  { label: 'کریپتو', href: '/market/crypto' },
  /* The path route, not `?type=education`. The query-string shape cannot be
     prerendered or indexed — see src/app/category/[slug]/page.tsx — and this
     is the nav slot pointing at the largest category on the site (41 of 53). */
  { label: 'آموزش', href: '/category/education' },
  { label: 'اخبار', href: '/news' },
];

export const FOOTER_PRODUCT_LINKS: NavLink[] = [
  { label: 'اینچارت', href: 'https://inchart.thefinance.ir', external: true },
  { label: 'آکادمی', href: `${SITE_ORIGIN}/academy`, external: true },
  { label: 'پارادایم', href: 'https://paradigm.thefinance.ir', external: true },
  { label: 'درباره ما', href: ORGANIZATION.aboutPage, external: true },
];

export const FOOTER_MAG_LINKS: NavLink[] = [
  { label: 'تازه‌ترین مطالب', href: '/' },
  { label: 'نویسندگان', href: '/authors' },
  { label: 'جستجو', href: '/search' },
];

/**
 * Social channels, labelled per platform.
 *
 * It used to map `ORGANIZATION.sameAs` and label EVERY entry «اینستاگرام»,
 * which was correct only because there was exactly one. Adding a second would
 * have produced two chips both saying Instagram — and because the label is the
 * link's accessible name, a screen reader would have announced two identical
 * destinations.
 *
 * Channels with no confirmed URL are filtered out here rather than omitted
 * from the list, so the ones still being chased stay visible in the source.
 */
export const SOCIAL_LINKS: NavLink[] = SOCIAL_CHANNELS.filter((c) => c.url).map((c) => ({
  label: c.label,
  href: c.url,
  external: true,
}));

/**
 * Is this a paginated page that ran off the end of the list?
 *
 * A page number past the last page is a URL that does not exist, and it has to
 * 404 rather than render. Two reasons, and the second is the one that bites:
 *
 *   - `/mag/archive?page=999` answering 200 with an empty body is a thin page
 *     in the index, and SEO is this product's first priority.
 *   - The empty state on the market and author archives reads "no articles
 *     published yet", which is a lie when the market has forty and the reader
 *     merely asked for page nine.
 *
 * Page 1 empty is different and genuinely means "nothing here" — that keeps
 * the empty state, which is why this is not just `items.length === 0`.
 */
export function isPageBeyondEnd(page: number, itemCount: number): boolean {
  return page > 1 && itemCount === 0;
}
