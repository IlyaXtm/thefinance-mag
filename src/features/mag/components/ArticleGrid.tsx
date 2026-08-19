import Link from 'next/link';
import type { ArticleSummary } from '../types/mag.types';
import { ArticleCard, ArticleCardSkeleton } from './ArticleCard';

/**
 * Responsive article grid.
 *
 * 1 / 2 / 3 columns at the documented breakpoints, with the gap coming from
 * the token scale rather than a literal value.
 *
 * `items-stretch` plus `h-full` on the card is what makes equal heights work —
 * without it the grid sizes each cell to its content and rows go ragged.
 *
 * The grid owns no page padding. That belongs to the section wrapper, so the
 * same grid can sit inside the listing, an archive, an author page or search
 * results without assuming its container.
 */
export function ArticleGrid({ articles }: { articles: ArticleSummary[] }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          /* Only the first card is above the fold on mobile — it is the LCP element. */
          priority={index === 0}
        />
      ))}
    </div>
  );
}

/**
 * Loading state.
 *
 * Same grid, same card geometry. Never a centred spinner: a spinner occupies
 * different space than the content it precedes, which guarantees the layout
 * shift skeletons exist to prevent.
 */
export function ArticleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Empty state.
 *
 * Always offers a route onward. An empty screen with no exit is where readers
 * leave — which is why the filtered case links back to everything.
 */
export function ArticleGridEmpty({
  message = 'هنوز مطلبی منتشر نشده.',
  actionHref = '/',
  actionLabel = 'همه مطالب',
}: {
  message?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-border-strong px-6 py-14">
      <p className="text-text-secondary">{message}</p>
      <Link
        href={actionHref}
        className="rounded-full border border-border-interactive px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

/**
 * Error state.
 *
 * States what happened and offers the fix. No apology — an apology adds words
 * without adding a way forward.
 *
 * The retry is a client interaction, so the caller passes the handler; this
 * component stays a server component when it isn't given one.
 */
export function ArticleGridError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-card border border-dashed border-border-strong px-6 py-14"
    >
      <p className="text-text-secondary">بارگذاری مطالب انجام نشد.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-full border border-border-interactive px-4 text-sm text-text-primary transition-colors hover:bg-surface-hover"
        >
          تلاش دوباره
        </button>
      )}
    </div>
  );
}
