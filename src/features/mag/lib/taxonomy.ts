/**
 * When a taxonomy archive is worth putting in front of Google.
 *
 * ── The rule ────────────────────────────────────────────────────────────
 *
 * An archive listing a handful of articles is a thin page. Submitting it in
 * the sitemap spends crawl budget on a page that will not rank and dilutes the
 * signal of the archives that will, so below the floor an archive stays out of
 * the sitemap AND carries `noindex`. Both, not one: keeping a URL out of the
 * sitemap does not stop Google finding it through the links on every page, and
 * `noindex` alone still invites the crawl.
 *
 * The route itself is NOT removed. `/mag/category/analysis` renders, resolves
 * and is linked — a reader who clicks «تحلیل» gets the archive. Only the
 * indexing claim is withdrawn.
 *
 * ── Where 8 comes from ──────────────────────────────────────────────────
 *
 * It is a judgement, not a measurement, and it is set where it separates this
 * archive's real sections from its accidents. Today:
 *
 *   education 41 · articles 39 · news 10   →  indexed
 *   analysis   2 · inchart   2             →  not indexed
 *
 * Eight is roughly two rows of the twelve-per-page listing — below that the
 * archive does not fill its own first page. Anything from 3 to 9 would sort
 * today's categories identically, so the exact number is not load-bearing; the
 * gap between 10 and 2 is.
 *
 * ── It applies to markets too, and there the result is uncomfortable ─────
 *
 * Every market archive is below the floor: crypto 5, forex 3, global 3, tse 2,
 * gold-usd 1, housing 0. So the floor de-indexes all six, including the three
 * the header nav links to.
 *
 * That is the correct answer to the question actually being asked. A market
 * archive with two articles IS thin; indexing it does not make it less thin.
 * The number is small because 39 of 53 articles carry no market at all, which
 * is a tagging backlog, not something a template can fix — see `backlog.md`
 * B17. When the tagging is done the archives cross the floor on their own and
 * nothing here changes.
 */

/** Minimum published articles for a taxonomy archive to be indexable. */
export const SITEMAP_MIN_ARTICLES = 8;

/** True when an archive is too thin to index — see above. */
export function isThinArchive(count: number | null | undefined): boolean {
  return (count ?? 0) < SITEMAP_MIN_ARTICLES;
}

/**
 * Categories that must never get a route, a sitemap entry or a nav slot.
 *
 * «دسته‌بندی نشده» is WordPress's default term. It is being emptied and deleted
 * CMS-side, but a category route reads the live taxonomy, so until the delete
 * lands the term would produce a real URL for "the posts nobody filed". Listed
 * by both the English default slug and the Persian one because the site has
 * been through a rename and either may be what the API returns.
 */
export const EXCLUDED_CATEGORY_SLUGS: readonly string[] = [
  'uncategorized',
  'دسته-بندی-نشده',
  'دسته‌بندی-نشده',
];

export function isExcludedCategory(slug: string): boolean {
  return EXCLUDED_CATEGORY_SLUGS.includes(decodeURIComponent(slug));
}
