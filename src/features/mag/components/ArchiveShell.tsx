import type { ReactNode } from 'react';
import { breadcrumbJsonLd, JsonLdScript } from '../lib/schema';
import { magUrl } from '../lib/site';
import type { ArticleSummary, Market, Paginated } from '../types/mag.types';
import { ArchiveCard } from './PostCard';
import { ArticleGridEmpty } from './ArticleGrid';
import { CategoryCover } from './CategoryCover';
import { CategoryListCard } from './SidebarCard';
import { NewsletterCta } from './NewsletterCta';
import { Pagination, pagePathHref } from './Pagination';
import type { Crumb } from './Breadcrumbs';

/**
 * The archive layout, once.
 *
 * Masthead card · filter row · one column of horizontal cards · 320px sidebar.
 * Horizontal rows rather than a grid because a long list scans faster down one
 * title column than across a zig-zag.
 *
 * ── Why this was extracted ──────────────────────────────────────────────
 *
 * `/archive` and `/market/<slug>` had grown two copies of it — same grid, same
 * sticky offset, same sidebar, same breadcrumb JSON-LD — differing only in the
 * masthead text, which filter row appears, and where pagination points. Adding
 * `/category/<slug>` as a third copy would have made the layout a convention
 * rather than a thing, and the next spacing fix would have landed in two of the
 * three files.
 *
 * So the three routes now differ in data and in nothing else. That is also what
 * the category-route brief asked for: reuse the archive layout, do not write a
 * new template.
 *
 * The filter row is a slot rather than a prop because the two taxonomies take
 * different components and `decisions.md` keeps them deliberately distinct —
 * see the note in FilterBar. A `taxonomy: 'market' | 'type'` prop here would
 * quietly re-merge the axis this codebase chose to keep separate.
 */
export function ArchiveShell({
  crumbs,
  title,
  description,
  articles,
  filterBar,
  headingId,
  headingText,
  basePath,
  baseQuery,
  emptyMessage,
  emptyAction,
  activeMarketSlug = null,
  markets,
}: {
  crumbs: Crumb[];
  title: string;
  description?: string | null;
  articles: Paginated<ArticleSummary>;
  filterBar: ReactNode;
  /** The visually-hidden section heading — one h2 under the masthead's h1. */
  headingId: string;
  headingText: string;
  /** Where pagination points: '/archive', '/market/tse', '/category/news'. */
  basePath: string;
  baseQuery?: Record<string, string | undefined>;
  emptyMessage: string;
  emptyAction?: { href: string; label: string };
  activeMarketSlug?: string | null;
  markets: Market[];
}) {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-5 lg:px-10">
      <JsonLdScript
        data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: magUrl(c.href) })))}
      />

      <div className="pt-6 lg:pt-8">
        <CategoryCover
          title={title}
          crumbs={crumbs}
          description={description}
          /* articles.total, not a taxonomy `count`: the number in the header
             and the rows below it must be two readings of one array, or they
             drift apart on screen — which is exactly what happened on
             /market/gold-usd, «۱ مطلب» above two cards. */
          count={articles.total}
          /* No taxonomy carries a cover image yet. Wired rather than removed
             because adding one is a mu-plugin change, not a template change. */
          image={null}
        />
      </div>

      <div className="mt-7">{filterBar}</div>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
        <section aria-labelledby={headingId}>
          <h2 id={headingId} className="sr-only">
            {headingText}
          </h2>

          {articles.items.length > 0 ? (
            <>
              <div className="flex flex-col gap-6">
                {articles.items.map((article, index) => (
                  <ArchiveCard key={article.id} article={article} priority={index === 0} />
                ))}
              </div>

              <Pagination
                page={articles.page}
                totalPages={articles.totalPages}
                hrefFor={pagePathHref(basePath, baseQuery)}
              />
            </>
          ) : (
            <ArticleGridEmpty
              message={emptyMessage}
              actionHref={emptyAction?.href}
              actionLabel={emptyAction?.label}
            />
          )}
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[76px]">
          <CategoryListCard markets={markets} activeSlug={activeMarketSlug} />
          <NewsletterCta />
        </aside>
      </div>
    </main>
  );
}
