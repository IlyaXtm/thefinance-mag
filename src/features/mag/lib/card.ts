import type { ArticleSummary } from '../types/mag.types';

/**
 * The one visible category label on a card.
 *
 * The v4 design draws a single flat category axis (طلا و ارز · بورس ایران ·
 * تحلیل تکنیکال · کریپتو · اخبار). The data model keeps two, deliberately —
 * `market` (which market) and `contentType` (what kind of piece) — because
 * `decisions.md` chose "two axes, not six" and taxonomy bloat is the
 * documented failure of this content category.
 *
 * Both are satisfied by resolving to one label at render: the market when the
 * article has one, otherwise the content type. That is what the design's nav
 * actually mixes anyway, and it needs no WordPress migration and no new URLs.
 *
 * Roughly 60% of the archive has no market, so the contentType branch is the
 * common one, not the fallback.
 */
export function cardCategory(article: ArticleSummary): { name: string; href: string } {
  if (article.market) {
    return { name: article.market.name, href: `/market/${article.market.slug}` };
  }

  return {
    name: article.contentType.name,
    href:
      article.contentType.slug === 'news' ? '/news' : `/archive?type=${article.contentType.slug}`,
  };
}

/**
 * The card's standfirst.
 *
 * TWO SOURCES, IN ORDER OF HONESTY.
 *
 * 1. `excerpt` — what an editor actually wrote. Fetched as `format: RAW`, so
 *    it is the manual field only: WordPress's auto-generated summary, which
 *    truncates mid-sentence and is the reason `decisions.md` rejected excerpts
 *    as a dek source in the first place, is never what arrives here.
 *
 * 2. The article's own H2 headings, the same source «در این مقاله» uses.
 *    Always accurate, never empty on a structured article, and inherently
 *    anti-hype because headings describe rather than promote.
 *
 * An editor's sentence beats a list of headings whenever one exists, which is
 * why the order is this way round and not the reverse.
 *
 * ── The reason both are here ──────────────────────────────────────────
 *
 * `outlineHeadings` comes from the mu-plugin, and GraphQL rejects an unknown
 * field outright rather than returning null — so the listing query fails
 * against a CMS that does not have that plugin version. `excerpt` is standard
 * WPGraphQL and cannot fail. If the archive turns out to carry hand-written
 * excerpts broadly, the heading path becomes redundant and `outlineHeadings`
 * can come out of SUMMARY_FIELDS, which removes the deploy-order hazard
 * entirely. That is a measurement, not a guess — see the PR.
 *
 * Returns null rather than a placeholder when there is neither. A card with no
 * dek closes up; a card with filler lies.
 */
export function cardDek(article: ArticleSummary, maxHeadings = 2): string | null {
  if (article.excerpt) return article.excerpt;

  const headings = article.outline.slice(0, maxHeadings);
  if (headings.length === 0) return null;

  return headings.join(' · ');
}

/** Initials for the avatar fallback. Gravatar is never used — see decisions.md. */
export function authorInitial(name: string): string {
  return name.trim().charAt(0) || '؟';
}
