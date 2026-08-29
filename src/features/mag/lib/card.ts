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
 * The design asks for a `dek` — an editor-written summary. There is no such
 * field and `decisions.md` explains why: the live site's excerpts are
 * auto-truncated mid-sentence, which is the evidence that this team does not
 * write summaries, so a new mandatory field would ship empty.
 *
 * So the dek is DERIVED from the article's own H2 headings — the same source
 * «در این مقاله» already uses. Always accurate, never empty on a structured
 * article, and inherently anti-hype because headings describe rather than
 * promote.
 *
 * Returns null rather than a placeholder when an article has no headings. A
 * card with no dek closes up; a card with filler lies.
 */
export function cardDek(article: ArticleSummary, maxHeadings = 2): string | null {
  const headings = article.outline.slice(0, maxHeadings);
  if (headings.length === 0) return null;

  return headings.join(' · ');
}

/** Initials for the avatar fallback. Gravatar is never used — see decisions.md. */
export function authorInitial(name: string): string {
  return name.trim().charAt(0) || '؟';
}
