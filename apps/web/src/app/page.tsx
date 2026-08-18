import { ArticleGrid, LeadStories, MagPageHeader, MarketFilterBar } from "@/features/mag/components/mag-listing";
import { getMagListing } from "@/features/mag/api/v1/mag.service";

type MagPageProps = Readonly<{
  searchParams: Promise<{ market?: string; q?: string }>;
}>;

export default async function MagPage({ searchParams }: MagPageProps) {
  const parameters = await searchParams;
  const selectedMarket = parameters.market?.trim() || undefined;
  const query = parameters.q?.trim() || undefined;
  const listing = await getMagListing(selectedMarket, query);
  const isFiltered = Boolean(selectedMarket || query);
  const leadArticles = isFiltered ? [] : listing.articles.slice(0, 4);
  const latestArticles = isFiltered ? listing.articles : listing.articles.slice(4);

  return (
    <main className="mag-shell">
      <MagPageHeader query={query} selectedMarket={selectedMarket} />
      {leadArticles.length > 0 ? <LeadStories articles={leadArticles} /> : null}
      <MarketFilterBar markets={listing.markets} selectedMarket={selectedMarket} />
      <ArticleGrid articles={latestArticles} isFiltered={isFiltered} query={query} />
    </main>
  );
}
