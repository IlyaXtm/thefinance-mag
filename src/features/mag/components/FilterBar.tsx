import Link from 'next/link';
import type { ContentType, Market } from '../types/mag.types';

/**
 * Filter bar.
 *
 * A `<nav>` of real `<a>` links, never buttons with click handlers. Three
 * reasons, and all three matter for this product:
 *   - filtering is navigation, so it must work without JavaScript
 *   - crawlers follow links, not onClick handlers, and SEO is priority one
 *   - the browser back button then does what the reader expects
 *
 * WHY CONTENT TYPE AND NOT MARKET.
 * The design treats market as the primary axis, but Phase 0 measured the
 * archive: 18 of 32 articles have no market at all — general technical-analysis
 * education belongs to none. A market bar would be mostly empty and two of the
 * six terms would have a single article. Content type is the axis every
 * article actually has, so it leads until market-tagged content exists.
 *
 * The market variant is built and ready; it simply isn't the default yet.
 */

type FilterItem = { slug: string; name: string; href: string };

function Chip({ item, isActive }: { item: FilterItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive || undefined}
      className={[
        /* 36px is the drawn height; min-h-11 keeps the 44px touch target the
           accessibility floor requires, so the chip is padded rather than
           shrunk on a phone. */
        'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 text-[13.5px] whitespace-nowrap transition-colors md:min-h-9',
        isActive
          ? 'border-accent bg-accent font-medium text-accent-contrast'
          : 'border-border-interactive bg-transparent text-text-secondary hover:border-accent hover:bg-accent-soft hover:text-text-primary',
      ].join(' ')}
    >
      {item.name}
    </Link>
  );
}

function Bar({ items, activeSlug }: { items: FilterItem[]; activeSlug: string | null }) {
  return (
    <nav
      aria-label="فیلتر مطالب"
      /*
        Horizontal scroll with snap on mobile, wrapping row on desktop.
        The mask-image edge fade is theme-agnostic — a coloured gradient would
        need a value per theme and would be wrong in at least one of them.
      */
      className="flex snap-x gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(to_left,transparent_0,black_28px,black_calc(100%-28px),transparent_100%)] md:flex-wrap md:overflow-visible md:[mask-image:none]"
    >
      {items.map((item) => (
        <Chip key={item.slug} item={item} isActive={item.slug === activeSlug} />
      ))}
    </nav>
  );
}

export function ContentTypeFilterBar({
  contentTypes,
  activeSlug = null,
}: {
  contentTypes: ContentType[];
  activeSlug?: string | null;
}) {
  /* Query-string filtering on the archive, not separate routes. One canonical
     archive URL with a filter parameter beats four thin near-duplicate pages. */
  const items: FilterItem[] = [
    { slug: 'all', name: 'همه', href: '/archive' },
    ...contentTypes.map((c) => ({
      slug: c.slug,
      name: c.name,
      href: `/archive?type=${c.slug}`,
    })),
  ];

  return <Bar items={items} activeSlug={activeSlug ?? 'all'} />;
}

export function MarketFilterBar({
  markets,
  activeSlug = null,
}: {
  markets: Market[];
  activeSlug?: string | null;
}) {
  /*
    Only markets with published articles appear.
    `housing` currently has zero — linking to it would send readers to an empty
    archive, which is the same failure as rendering an empty section.
  */
  const items: FilterItem[] = [
    { slug: 'all', name: 'همه', href: '/' },
    ...markets
      .filter((m) => (m.count ?? 0) > 0)
      .map((m) => ({ slug: m.slug, name: m.name, href: `/market/${m.slug}` })),
  ];

  return <Bar items={items} activeSlug={activeSlug ?? 'all'} />;
}
