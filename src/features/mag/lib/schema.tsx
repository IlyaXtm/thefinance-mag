import type { Article, ArticleSummary } from '../types/mag.types';
import { hasVisibleRevision } from './format';
import { MAG_DESCRIPTION, MAG_NAME, MAG_URL, ORGANIZATION, magUrl } from './site';

/**
 * JSON-LD builders.
 *
 * Everything here is derived from data that already exists. Structured data
 * that claims something the page doesn't show is a spam signal, so these
 * functions never invent a rating, a price, or a metric.
 *
 * `Article`, not `NewsArticle`.
 * NewsArticle is for time-bound reporting. Most of this archive is evergreen
 * educational content — "what is the Ichimoku indicator" is as true next year
 * as today. Labelling it NewsArticle would send Google the wrong freshness
 * signal and invite the staleness penalty we already avoided by using revision
 * dates instead of relative ones. If `اخبار` ever enters Mag, that content
 * type gets NewsArticle and nothing else does.
 */

type JsonLd = Record<string, unknown>;

const publisher: JsonLd = {
  '@type': 'Organization',
  name: ORGANIZATION.name,
  alternateName: ORGANIZATION.legalName,
  url: ORGANIZATION.url,
  logo: {
    '@type': 'ImageObject',
    url: ORGANIZATION.logo,
    width: 512,
    height: 512,
  },
  ...(ORGANIZATION.sameAs.length > 0 ? { sameAs: ORGANIZATION.sameAs } : {}),
};

/**
 * Organization entity, emitted once on the listing.
 *
 * Repeating the full Organization block on every article would be noise —
 * articles reference it through `publisher` instead.
 */
export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    ...publisher,
  };
}

/** Article page. */
export function articleJsonLd(article: Article): JsonLd {
  const url = magUrl(`/${article.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    /*
      inLanguage matters for a Persian site: it tells Google the content is
      Persian regardless of the Latin fragments in titles like «(Notcoin)».
    */
    inLanguage: 'fa-IR',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: article.publishedAt,
    /*
      dateModified is emitted only when a real revision exists. Emitting it
      equal to datePublished on every article is a common mistake that
      devalues the signal — if everything is "updated", nothing is.
    */
    ...(hasVisibleRevision(article.publishedAt, article.modifiedAt)
      ? { dateModified: article.modifiedAt }
      : {}),
    author: {
      '@type': 'Person',
      name: article.author.name,
      url: magUrl(`/author/${article.author.slug}`),
      ...(article.author.role ? { jobTitle: article.author.role } : {}),
    },
    publisher,
    ...(article.featuredImage
      ? {
          image: {
            '@type': 'ImageObject',
            url: article.featuredImage.url,
            width: article.featuredImage.width,
            height: article.featuredImage.height,
          },
        }
      : {}),
    ...(article.seo.description ? { description: article.seo.description } : {}),
    /*
      articleSection carries the editorial classification. Market is included
      only when the article has one — most of the archive doesn't, and an empty
      or invented value is worse than omitting the property.
    */
    articleSection: article.market
      ? [article.contentType.name, article.market.name]
      : [article.contentType.name],
    timeRequired: `PT${article.readingTime}M`,
    /*
      isAccessibleForFree removes ambiguity about paywalling. Mag is open, and
      saying so explicitly avoids Google guessing.
    */
    isAccessibleForFree: true,
  };
}

/**
 * Breadcrumbs.
 *
 * The trail must match what the page visibly renders. Structured breadcrumbs
 * that disagree with the visible ones is a mismatch Google penalises.
 */
export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** The magazine itself, emitted on the listing page. */
export function magBlogJsonLd(articles: ArticleSummary[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: MAG_NAME,
    description: MAG_DESCRIPTION,
    url: MAG_URL,
    inLanguage: 'fa-IR',
    publisher,
    blogPost: articles.slice(0, 10).map((a) => ({
      '@type': 'BlogPosting',
      headline: a.title,
      url: magUrl(`/${a.slug}`),
      datePublished: a.publishedAt,
      ...(hasVisibleRevision(a.publishedAt, a.modifiedAt)
        ? { dateModified: a.modifiedAt }
        : {}),
      author: { '@type': 'Person', name: a.author.name },
    })),
  };
}

/**
 * Renders a JSON-LD script tag.
 *
 * `JSON.stringify` escapes nothing dangerous by itself, so `<` is escaped to
 * prevent a `</script>` inside any string field from breaking out of the tag.
 * That string could come from an article title, which editors control.
 */
export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
