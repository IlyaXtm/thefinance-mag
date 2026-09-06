import { magPath } from '../lib/site';
import { bidiTitle } from '../lib/bidi-title';

/**
 * Page header for the listing.
 *
 * No background image, no gradient, no decorative rule. The brand is calm and
 * explanatory; a hero treatment here would cost LCP and say nothing.
 *
 * Search is a real form so it works without JavaScript. The label is visually
 * hidden rather than absent — a placeholder is not an accessible name.
 */
export function PageHeader({
  title,
  subtitle,
  showSearch = true,
}: {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-[28px] font-bold leading-[1.5] text-text-primary md:text-[34px]">
          {bidiTitle(title)}
        </h1>
        {subtitle && <p className="mt-2 text-text-secondary">{subtitle}</p>}
      </div>

      {showSearch && (
        <form action={magPath('/search')} method="get" className="shrink-0">
          <label htmlFor="mag-search" className="sr-only">
            جستجو در مجله
          </label>
          <div className="flex items-center gap-2">
            <input
              id="mag-search"
              name="q"
              type="search"
              placeholder="جستجو در مجله"
              className="min-h-11 w-full rounded-full border border-border-interactive bg-transparent px-4 text-sm text-text-primary placeholder:text-text-muted md:w-64"
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-full border border-border-interactive px-4 text-sm text-text-primary transition-colors hover:bg-surface-hover"
            >
              جستجو
            </button>
          </div>
        </form>
      )}
    </header>
  );
}
