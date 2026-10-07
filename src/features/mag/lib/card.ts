import type { ArticleSummary } from '../types/mag.types';
import { parentOf, subcategoryHref } from './subcategories';

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
 *
 * The market label links into the article's own section (2026-10-07): a
 * lesson's «کریپتو» opens آموزش › کریپتو, a news item's opens اخبار › کریپتو.
 * There is no market page any more — see lib/subcategories.ts.
 */
export function cardCategory(article: ArticleSummary): { name: string; href: string } {
  if (article.market) {
    return {
      name: article.market.name,
      href: subcategoryHref(parentOf(article.contentType.slug), article.market.slug),
    };
  }

  return {
    name: article.contentType.name,
    href:
      article.contentType.slug === 'news' ? '/news' : `/archive?type=${article.contentType.slug}`,
  };
}

/**
 * The article header's kicker — one chip or two, never a placeholder.
 *
 * ── Why it is two and not the design's three ────────────────────────────
 *
 * The rich-article design draws «آموزش · تحلیل تکنیکال · راهنمای ابزار». The
 * third segment matches no taxonomy that exists, and `roadmap.md` lists it
 * under "still needs a decision" in as many words. Inventing a taxonomy to
 * fill a chip is how a content model acquires a sixth axis nobody asked for —
 * the documented failure of this category, and the reason `decisions.md`
 * settled on two axes in the first place. So the third segment is left out
 * rather than approximated, and the design's own export renders two.
 *
 * ── Where the two come from ─────────────────────────────────────────────
 *
 * They are the two axes the model already has and the card already collapses.
 * `cardCategory` picks ONE label because a card has room for one; the article
 * header has room for both, so it shows both — the section, then the market
 * as its sub-category (it was market first until 2026-10-07).
 *
 * Roughly 60% of the archive has no market, so ONE chip is the common case,
 * not the degraded one. Nothing is reserved for the missing chip and nothing
 * shifts when it is absent: the row is a flex list of what exists.
 *
 * ── The href, and the redirect it avoids ────────────────────────────────
 *
 * `cardCategory` still points a content type at `/archive?type=<slug>`, which
 * now 301s to `/category/<slug>`. That is fine on a card, where the link is
 * one of many; in the header it is the article's primary navigational claim
 * and should not spend a hop. So this resolves the routed form directly, the
 * same way FilterBar does, from the category list the CMS actually returns.
 */
export function articleKicker(
  article: ArticleSummary,
  routedSlugs: readonly string[],
): Array<{ name: string; href: string }> {
  const routed = new Set(routedSlugs);

  /* Section first, then its sub-category — آموزش › کریپتو — since 2026-10-07,
     when the market stopped being an axis of its own on the page. */
  const chips: Array<{ name: string; href: string }> = [
    { name: article.contentType.name, href: contentTypeHref(article.contentType.slug, routed) },
  ];

  if (article.market) {
    chips.push({
      name: article.market.name,
      href: subcategoryHref(parentOf(article.contentType.slug), article.market.slug),
    });
  }

  return chips;
}

/**
 * News has its own route by decision, not by category count — see
 * `app/news/page.tsx`. Everything else prefers the category archive when the
 * CMS actually has that term, and falls back to the query form when it does
 * not, exactly as the filter row does.
 */
function contentTypeHref(slug: string, routed: Set<string>): string {
  if (slug === 'news') return '/news';
  return routed.has(slug) ? `/category/${slug}` : `/archive?type=${slug}`;
}

/**
 * A card's one-line summary: the editor's excerpt, else Rank Math's meta
 * description, else nothing.
 *
 * ── THE HEADINGS FALLBACK IS GONE (2026-10-05) ─────────────────────────────
 *
 * Cards used to fall back to the article's first H2s joined with « · » —
 * «عیار طلا چیست؟ · طلای خالص چند عیار است؟». The team read it exactly right:
 * that is a table of contents, not a description. What they asked for instead
 * — «با مفهوم عیار طلا، تفاوت ۱۸ و ۲۴ عیار و اعداد ۷۵۰ و ۹۹۹ آشنا شوید» — was
 * already written, as the Rank Math description, on every one of the 56
 * education posts. It is human, it is written to earn the click, and it is
 * maintained by the SEO team anyway.
 *
 * Null when there is neither. A card with no summary closes up; a card with
 * filler lies.
 */
export function cardDek(article: ArticleSummary): string | null {
  return article.excerpt ?? article.seoDescription ?? null;
}

/** Initials for the avatar fallback. Gravatar is never used — see decisions.md. */
export function authorInitial(name: string): string {
  return name.trim().charAt(0) || '؟';
}
