import { MAG_LISTING_QUERY } from "./mag.graphql";
import { mockArticles, mockMarkets } from "./mag.mock";
import type { MagArticle, MagListing, MagTaxonomyTerm } from "../../types";

type GraphqlImage = Readonly<{
  altText: string | null;
  mediaDetails: { height: number | null; width: number | null } | null;
  sourceUrl: string;
}>;

type GraphqlPost = Readonly<{
  databaseId: number;
  date: string;
  excerpt: string | null;
  featuredImage: { node: GraphqlImage } | null;
  magContentTypes: { nodes: MagTaxonomyTerm[] };
  markets: { nodes: MagTaxonomyTerm[] };
  readingTime: number;
  slug: string;
  title: string;
  whyItMatters: string | null;
}>;

type MagListingResponse = Readonly<{
  data?: {
    markets: { nodes: MagTaxonomyTerm[] };
    posts: { nodes: GraphqlPost[] };
  };
  errors?: readonly { message: string }[];
}>;

function mapPost(post: GraphqlPost): MagArticle | null {
  const market = post.markets.nodes[0];
  const contentType = post.magContentTypes.nodes[0];
  if (!market || !contentType) return null;

  const image = post.featuredImage?.node;
  return {
    id: String(post.databaseId),
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? "",
    publishedAt: post.date,
    readingTime: post.readingTime,
    whyItMatters: post.whyItMatters,
    market,
    contentType,
    featuredImage: image
      ? {
          src: image.sourceUrl,
          alt: image.altText || post.title,
          width: image.mediaDetails?.width || 1200,
          height: image.mediaDetails?.height || 800,
        }
      : null,
  };
}

function filterListing(listing: MagListing, marketSlug?: string, query?: string): MagListing {
  const normalizedQuery = query?.trim().toLocaleLowerCase("fa");
  return {
    ...listing,
    articles: listing.articles.filter((article) => {
      const matchesMarket = !marketSlug || article.market.slug === marketSlug;
      const searchableText = `${article.title} ${article.excerpt}`.toLocaleLowerCase("fa");
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      return matchesMarket && matchesQuery;
    }),
  };
}

export async function getMagListing(marketSlug?: string, query?: string): Promise<MagListing> {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "false") {
    return filterListing({ articles: mockArticles, markets: mockMarkets }, marketSlug, query);
  }

  const endpoint = process.env.WORDPRESS_GRAPHQL_URL;
  if (!endpoint) throw new Error("WORDPRESS_GRAPHQL_URL is not configured");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: MAG_LISTING_QUERY, variables: { first: 40 } }),
    next: { revalidate: 300, tags: ["mag-listing"] },
  });
  if (!response.ok) throw new Error(`WordPress GraphQL returned ${response.status}`);

  const payload = (await response.json()) as MagListingResponse;
  if (payload.errors?.length || !payload.data) {
    throw new Error(payload.errors?.map((error) => error.message).join("; ") || "Invalid GraphQL response");
  }

  const listing: MagListing = {
    articles: payload.data.posts.nodes.map(mapPost).filter((post): post is MagArticle => post !== null),
    markets: payload.data.markets.nodes,
  };
  return filterListing(listing, marketSlug, query);
}
