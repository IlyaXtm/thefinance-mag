import Link from 'next/link';
import type { Market } from '../types/mag.types';
import { bidiTitle } from '../lib/bidi-title';
import { SUBCATEGORY_PARENTS, subcategoriesOf, subcategoryHref } from '../lib/subcategories';

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
      <Heading className="mb-4 text-h5 font-semibold text-text-primary">{title}</Heading>
      {children}
    </section>
  );
}

/**
 * «دسته‌بندی مطالب» — the sections, each with its sub-categories under it.
 *
 *   اخبار
 *     اقتصاد جهانی · فارکس · کریپتو …
 *   آموزش
 *     بازار ایران · کریپتو …
 *
 * Until 2026-10-07 this listed the markets on their own, linking to market
 * archives. The team asked for markets to be sub-categories of the categories
 * instead (lib/subcategories.ts), and this card is where that tree is drawn.
 * A sub-category is listed under a section only if that section has posts in
 * it — `/news/housing` would be an empty page.
 *
 * Names only — no post counts (team, 2026-10-06: «عددا پاک بشه»).
 *
 * `activeHref` marks the page the reader is on, section or sub-category.
 */
export function CategoryListCard({
  markets,
  activeHref = null,
}: {
  markets: Market[];
  activeHref?: string | null;
}) {
  return (
    <SidebarCard title="دسته‌بندی مطالب">
      <ul className="flex flex-col">
        {SUBCATEGORY_PARENTS.map((parent) => {
          const children = subcategoriesOf(markets, parent.key);
          return (
            <li key={parent.key} className="border-b border-border-subtle last:border-b-0">
              <TreeLink
                href={parent.href}
                active={activeHref === parent.href}
                className="text-[14.5px] font-semibold"
              >
                {parent.name}
              </TreeLink>
              {children.length > 0 && (
                <ul className="mb-2 flex flex-col border-s border-border-subtle ps-4">
                  {children.map((market) => {
                    const href = subcategoryHref(parent.key, market.slug);
                    return (
                      <li key={market.slug}>
                        <TreeLink
                          href={href}
                          active={activeHref === href}
                          className="text-[14px]"
                        >
                          {market.name}
                        </TreeLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </SidebarCard>
  );
}

function TreeLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-11 items-center transition-colors hover:text-accent ${
        active ? 'text-accent' : 'text-text-secondary'
      } ${className}`}
    >
      {children}
    </Link>
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
  footer,
}: {
  title: string;
  items: Array<{ slug: string; title: string; meta?: string }>;
  /** A closing row under the list — the article rail's Telegram link. */
  footer?: React.ReactNode;
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
      {footer && <div className="mt-3 border-t border-border-subtle pt-2">{footer}</div>}
    </SidebarCard>
  );
}
