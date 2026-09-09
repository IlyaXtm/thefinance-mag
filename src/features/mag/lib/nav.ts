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
 * The header's section links — CONTENT TYPES ONLY.
 *
 * ── What was wrong ─────────────────────────────────────────────────────
 *
 * The row read «طلا و ارز · بورس ایران · کریپتو · آموزش · اخبار». The first
 * three are MARKETS and the last two are CONTENT TYPES: two taxonomies side by
 * side with nothing to tell a reader they are different axes. It is the same
 * defect the review already flagged on the filter chips, where the fix was to
 * NAME the axis rather than blur the two — and `decisions.md` keeps them
 * deliberately separate because taxonomy bloat is this category's documented
 * failure.
 *
 * So the flat links are one axis now, and markets move behind a labelled
 * disclosure that says «بازارها» on it.
 *
 * ── Why these three and not four ───────────────────────────────────────
 *
 * «گزارش» is a content type with no category behind it in the taxonomy, so a
 * nav link would point at an archive that does not exist. It appears the moment
 * the term does. «مقالات» is the reverse — a category with 39 posts and no
 * content type — and it stays out for a different reason: it is a catch-all tag
 * nobody chose as a section, and putting it in the header would promote it for
 * being large. Both are the same rule from the category-route work: a route is
 * not a nav slot.
 *
 * STILL HAND-PICKED. Not derived from what the CMS returns.
 */
export const SECTION_NAV: NavLink[] = [
  { label: 'اخبار', href: '/news' },
  { label: 'آموزش', href: '/category/education' },
  { label: 'تحلیل', href: '/category/analysis' },
];

/**
 * The way out of the magazine.
 *
 * The masthead used to be the only route back to thefinance.ir, which meant the
 * magazine's own logo did not go to the magazine's own front page — a reader
 * three articles deep could reach the main site but not `/mag`. Every
 * publication's masthead links to that publication's home; that is what a
 * masthead is. So the logo now points at `/mag` and the exit lives here.
 *
 * ONE LINK, NOT A PRODUCT MENU. InChart, Academy and Paradigm are in the
 * footer. Repeating them in the header would trade the magazine's own
 * navigation for a product list, which is the thing the header exists not to
 * be.
 */
export const SITE_EXIT: NavLink = { label: 'فایننس', href: SITE_ORIGIN, external: true };

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
