import type { Metadata } from 'next';
import { searchArticles } from '@/features/mag/api/v1/mag.service';
import { getMarkets } from '@/features/mag/api/v1/mag.service';
import { magPath, magUrl } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import {
  ArticleGrid,
  MarketFilterBar,
  PageHeader,
  Pagination,
  pageQueryHref,
  Section,
} from '@/features/mag/components';
import Link from 'next/link';

/**
 * /mag/search?q=
 *
 * The page with the most states and the least prior design, so it gets the
 * most attention.
 *
 * noindex: search result pages are thin, infinitely variable, and duplicate
 * content that already exists elsewhere. Google's own guidance is to keep them
 * out of the index. The page still works and still links onward — it just
 * isn't a landing page.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'نتایج جستجو',
  robots: { index: false, follow: true },
  alternates: { canonical: magUrl('/search') },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const query = (q ?? '').trim();
  const currentPage = Number(page) || 1;

  const [results, markets] = await Promise.all([
    query ? searchArticles({ query, page: currentPage, perPage: 9 }) : null,
    getMarkets(),
  ]);

  return (
    <main>
      <Section className="!pb-0">
        <PageHeader title="نتایج جستجو" showSearch={false} />

        <form action={magPath('/search')} method="get" className="mt-6 max-w-prose">
          <label htmlFor="search-input" className="sr-only">
            جستجو در مجله
          </label>
          <div className="flex items-center gap-2">
            <input
              id="search-input"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="جستجو در مجله"
              className="min-h-11 flex-1 rounded-full border border-border-interactive bg-transparent px-4 text-[15px] text-text-primary placeholder:text-text-muted"
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-full bg-accent px-5 text-[15px] font-semibold text-accent-contrast"
            >
              جستجو
            </button>
          </div>
        </form>
      </Section>

      <Section className="!pt-10">
        {!query ? (
          /* Landed on /search with no q. Not an error — just a prompt. */
          <p className="text-text-secondary">عبارتی برای جستجو وارد کنید.</p>
        ) : results && results.items.length > 0 ? (
          <>
            <p className="mb-6 text-text-secondary">
              {toPersianDigits(results.total)} نتیجه برای{' '}
              {/*
                The query renders through LTR isolation: people search for P/E,
                Bitcoin, S&P 500, and an unisolated Latin fragment scrambles the
                surrounding Persian sentence.
              */}
              «<span className="ltr">{query}</span>»
            </p>

            <ArticleGrid articles={results.items} />
            {/* Query string, not a path segment: /search/page/2 is not a
                route and would drop `q` even if it were. */}
            <Pagination
              page={results.page}
              totalPages={results.totalPages}
              hrefFor={pageQueryHref('/search', { q: query })}
            />
          </>
        ) : (
          <div className="space-y-6">
            <p className="text-text-secondary">
              نتیجه‌ای برای «<span className="ltr">{query}</span>» پیدا نشد.
            </p>

            {/*
              An empty search must offer routes onward — a dead end here loses
              the reader. Deliberately NO "did you mean" suggestion: that would
              imply a spell-correction capability the backend doesn't have.
            */}
            <div>
              <p className="mb-3 text-[14px] text-text-muted">جستجو در بازارها:</p>
              <MarketFilterBar markets={markets} />
            </div>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-full border border-border-interactive px-4 text-sm text-text-primary transition-colors hover:bg-surface-hover"
            >
              تازه‌ترین مطالب
            </Link>
          </div>
        )}
      </Section>
    </main>
  );
}
