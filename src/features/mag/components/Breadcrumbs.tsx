import Link from 'next/link';
import { bidiTitle } from '../lib/bidi-title';

export type Crumb = { name: string; href: string };

/**
 * Breadcrumbs.
 *
 * The chevron points LEFT because in RTL that is the forward reading
 * direction. This is the single most common RTL bug — a chevron copied from an
 * LTR design points the wrong way and nobody notices until a Persian reader
 * says the trail feels backwards.
 *
 * The last item is `aria-current="page"` and is not a link: linking to the page
 * you are on is a wasted tab stop.
 *
 * Whatever renders here must match the BreadcrumbList JSON-LD exactly.
 * Structured breadcrumbs that disagree with the visible ones is a mismatch
 * Google flags.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="مسیر" className="text-[13px] text-text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="line-clamp-1 text-text-secondary">
                  {bidiTitle(item.name)}
                </span>
              ) : (
                <Link href={item.href} className="transition-colors hover:text-text-primary">
                  {bidiTitle(item.name)}
                </Link>
              )}

              {!isLast && (
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0 opacity-60"
                >
                  {/* Points left — forward in RTL. */}
                  <path
                    d="M10 3.5 5.5 8l4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
