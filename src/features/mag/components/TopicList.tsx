import Link from 'next/link';
import type { Market } from '../types/mag.types';
import { toPersianDigits } from '../lib/format';

/**
 * Markets as a plain list of links with counts.
 *
 * NOT a filter bar. The figure behind that was 18 of 32 articles carrying no
 * market at all — measured before the 2026-09-06 migration took the archive to
 * 53 posts, and NOT re-measured since. See backlog B4: if the ratio moved, this
 * decision is open again. With that ratio holding, and
 * housing at zero, a row of filter chips advertises how empty the taxonomy is.
 * A quiet list with honest counts says the same thing without the emptiness
 * being the visual point — and it reads as a magazine's subject index rather
 * than an app control.
 *
 * Markets with no articles are omitted entirely: linking to an empty archive
 * is the same failure as rendering an empty section.
 */
export function TopicList({ markets }: { markets: Market[] }) {
  const populated = markets
    .filter((m) => (m.count ?? 0) > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  if (populated.length === 0) return null;

  return (
    <nav aria-label="موضوع‌ها">
      <ul className="flex flex-col">
        {populated.map((market) => (
          <li key={market.slug} className="border-b border-border-subtle last:border-b-0">
            <Link
              href={`/market/${market.slug}`}
              className="group flex items-baseline justify-between gap-4 py-3"
            >
              <span className="text-[15px] text-text-secondary transition-colors group-hover:text-text-primary">
                {market.name}
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-text-muted">
                {toPersianDigits(market.count ?? 0)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
