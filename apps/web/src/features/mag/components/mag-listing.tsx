import Image from "next/image";
import Link from "next/link";

import type { MagArticle, MagTaxonomyTerm } from "../types";

const persianDate = new Intl.DateTimeFormat("fa-IR", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Tehran",
});

function articleHref(article: MagArticle) {
  return `/${article.slug}/`;
}

function ArticleImage({ article, priority = false, sizes }: Readonly<{
  article: MagArticle;
  priority?: boolean;
  sizes: string;
}>) {
  if (!article.featuredImage) {
    return <span className="image-placeholder" aria-hidden="true" />;
  }

  return (
    <Image
      alt={article.featuredImage.alt}
      fill
      priority={priority}
      sizes={sizes}
      src={article.featuredImage.src}
    />
  );
}

function ArticleTaxonomy({ article }: Readonly<{ article: MagArticle }>) {
  return (
    <span className="taxonomy-row">
      <span className="market-chip">{article.market.name}</span>
      <span className="content-type">{article.contentType.name}</span>
    </span>
  );
}

function ArticleMeta({ article }: Readonly<{ article: MagArticle }>) {
  return (
    <span className="article-meta">
      <span>{article.readingTime.toLocaleString("fa-IR")} دقیقه مطالعه</span>
      <span aria-hidden="true">·</span>
      <time dateTime={article.publishedAt}>{persianDate.format(new Date(article.publishedAt))}</time>
    </span>
  );
}

export function MagPageHeader({ query, selectedMarket }: Readonly<{
  query?: string;
  selectedMarket?: string;
}>) {
  return (
    <section className="page-heading" aria-labelledby="mag-title">
      <div>
        <p className="eyebrow">روایت روشن بازارها</p>
        <h1 id="mag-title">مگ فایننس</h1>
        <p className="page-subtitle">تحلیل، گزارش و آموزش برای بازارهای مالی</p>
      </div>
      <form className="mag-search" action="/mag/" role="search">
        {selectedMarket ? <input type="hidden" name="market" value={selectedMarket} /> : null}
        <label className="sr-only" htmlFor="mag-search-input">جستجو در مگ</label>
        <input id="mag-search-input" defaultValue={query} name="q" placeholder="جستجو در مگ" type="search" />
        <button type="submit" aria-label="جستجو">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
          <span>جستجو</span>
        </button>
      </form>
    </section>
  );
}

function FeaturedArticleCard({ article }: Readonly<{ article: MagArticle }>) {
  return (
    <article className="featured-card">
      <Link href={articleHref(article)} aria-label={article.title}>
        <span className="featured-image">
          <ArticleImage article={article} priority sizes="(min-width: 1280px) 54vw, 100vw" />
        </span>
        <span className="featured-content">
          <ArticleTaxonomy article={article} />
          <h2>{article.title}</h2>
          {article.whyItMatters ? <span className="why-it-matters"><strong>چرا مهم است:</strong> {article.whyItMatters}</span> : null}
          <ArticleMeta article={article} />
        </span>
      </Link>
    </article>
  );
}

function SecondaryArticleCard({ article }: Readonly<{ article: MagArticle }>) {
  return (
    <article className="secondary-card">
      <Link href={articleHref(article)} aria-label={article.title}>
        <span className="secondary-image">
          <ArticleImage article={article} sizes="(min-width: 1280px) 14vw, 112px" />
        </span>
        <span className="secondary-content">
          <ArticleTaxonomy article={article} />
          <h3>{article.title}</h3>
          <ArticleMeta article={article} />
        </span>
      </Link>
    </article>
  );
}

export function LeadStories({ articles }: Readonly<{ articles: readonly MagArticle[] }>) {
  const [featured, ...secondary] = articles;
  if (!featured) return null;

  return (
    <section className="lead-stories" aria-label="مطالب منتخب">
      <FeaturedArticleCard article={featured} />
      {secondary.length > 0 ? (
        <div className="secondary-list">
          {secondary.map((article) => <SecondaryArticleCard article={article} key={article.id} />)}
        </div>
      ) : null}
    </section>
  );
}

export function MarketFilterBar({ markets, selectedMarket }: Readonly<{
  markets: readonly MagTaxonomyTerm[];
  selectedMarket?: string;
}>) {
  return (
    <nav className="market-filter" aria-label="فیلتر بازار">
      <Link href="/" aria-current={!selectedMarket ? "page" : undefined}>همه</Link>
      {markets.map((market) => (
        <Link href={`/?market=${encodeURIComponent(market.slug)}`} aria-current={selectedMarket === market.slug ? "page" : undefined} key={market.slug}>
          {market.name}
        </Link>
      ))}
    </nav>
  );
}

function ArticleCard({ article }: Readonly<{ article: MagArticle }>) {
  return (
    <article className="article-card">
      <Link href={articleHref(article)} aria-label={article.title}>
        <span className="article-image">
          <ArticleImage article={article} sizes="(min-width: 1280px) 29vw, (min-width: 768px) 44vw, 100vw" />
        </span>
        <span className="article-content">
          <ArticleTaxonomy article={article} />
          <h3>{article.title}</h3>
          <ArticleMeta article={article} />
        </span>
      </Link>
    </article>
  );
}

export function ArticleGrid({ articles, isFiltered, query }: Readonly<{
  articles: readonly MagArticle[];
  isFiltered: boolean;
  query?: string;
}>) {
  return (
    <section className="latest-section" aria-labelledby="latest-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">بدون هیاهو، با زمینه</p>
          <h2 id="latest-title">{query ? `نتایج جستجو برای «${query}»` : isFiltered ? "مطالب این بازار" : "تازه‌ترین‌ها"}</h2>
        </div>
        <span>{articles.length.toLocaleString("fa-IR")} مطلب</span>
      </div>
      {articles.length > 0 ? (
        <div className="article-grid">
          {articles.map((article) => <ArticleCard article={article} key={article.id} />)}
        </div>
      ) : (
        <div className="empty-state">
          <p>هنوز مطلبی با این انتخاب پیدا نشد.</p>
          <Link href="/">همه مطالب</Link>
        </div>
      )}
    </section>
  );
}
