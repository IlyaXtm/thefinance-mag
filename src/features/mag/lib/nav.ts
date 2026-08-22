import { ORGANIZATION, SITE_ORIGIN } from './site';

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

export const SOCIAL_LINKS: NavLink[] = ORGANIZATION.sameAs.map((href) => ({
  label: 'اینستاگرام',
  href,
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
