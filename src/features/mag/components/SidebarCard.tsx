import Link from 'next/link';
import { toPersianDigits } from '../lib/format';
import type { Market } from '../types/mag.types';
import { bidiTitle } from '../lib/bidi-title';

/**
 * The sidebar panel shell — one border, one background, one title.
 *
 * The heading level is a prop because the sidebar sits at different depths on
 * different templates and the document outline has to stay ordered. It is
 * never skipped to get a size: size is a class.
 */
export function SidebarCard({
  title,
  children,
  headingLevel: Heading = 'h2',
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-border-subtle bg-surface-raised p-[22px] ${className}`}
    >
      <Heading className="mb-4 text-[15px] font-semibold text-text-primary">{title}</Heading>
      {children}
    </section>
  );
}

/**
 * دسته‌بندی‌ها — name and count, hairline-separated.
 *
 * Only populated terms are listed. Linking to an empty archive is the same
 * failure as rendering an empty section, and `housing` currently has zero.
 *
 * The count is `dir="ltr"` and tabular: a Persian numeral run next to a
 * Persian label otherwise reorders around the label, and tabular figures stop
 * the column jittering between rows.
 */
export function CategoryListCard({
  markets,
  activeSlug = null,
}: {
  markets: Market[];
  activeSlug?: string | null;
}) {
  const populated = markets.filter((market) => (market.count ?? 0) > 0);
  if (populated.length === 0) return null;

  return (
    <SidebarCard title="دسته‌بندی‌ها">
      <ul className="flex flex-col">
        {populated.map((market) => {
          const isActive = market.slug === activeSlug;

          return (
            <li key={market.slug}>
              <Link
                href={`/market/${market.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-11 items-center justify-between gap-3 border-b border-border-subtle py-3 text-[14.5px] transition-colors hover:text-accent ${
                  isActive ? 'text-accent' : 'text-text-secondary'
                }`}
              >
                <span>{market.name}</span>
                <span
                  dir="ltr"
                  className="text-[12px] tabular-nums text-text-muted"
                  style={{ unicodeBidi: 'isolate' }}
                >
                  {toPersianDigits(market.count ?? 0)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </SidebarCard>
  );
}

/**
 * A plain list of onward links — «ادامه‌ی مسیر» on the post page, «پرونده‌های
 * مرتبط» on news.
 *
 * This is what occupies the slot the design gave «پرخواننده‌های این ماه».
 * A most-read ranking is a popular section, which `CLAUDE.md` lists under
 * Never build and which the design's own Compliance section rules out two
 * paragraphs later ("no trending badges"). Editorially chosen or
 * recency-ordered links do the same navigational job without ranking readers'
 * attention back at them.
 */
export function LinkListCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ slug: string; title: string; meta?: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <SidebarCard title={title}>
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/${item.slug}`}
              className="group flex min-h-11 flex-col justify-center gap-1.5 py-1 text-text-primary transition-colors hover:text-accent"
            >
              <span className="text-[14.5px] font-medium leading-[1.6] [text-wrap:pretty]">
                {bidiTitle(item.title)}
              </span>
              {item.meta && <span className="text-[12px] text-text-muted">{item.meta}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}
