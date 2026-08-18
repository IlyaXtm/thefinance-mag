export type MagTaxonomyTerm = Readonly<{
  name: string;
  slug: string;
}>;

export type MagImage = Readonly<{
  alt: string;
  height: number;
  src: string;
  width: number;
}>;

export type MagArticle = Readonly<{
  contentType: MagTaxonomyTerm;
  excerpt: string;
  featuredImage: MagImage | null;
  id: string;
  market: MagTaxonomyTerm;
  publishedAt: string;
  readingTime: number;
  slug: string;
  title: string;
  whyItMatters: string | null;
}>;

export type MagListing = Readonly<{
  articles: readonly MagArticle[];
  markets: readonly MagTaxonomyTerm[];
}>;
