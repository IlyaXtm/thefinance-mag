import Link from 'next/link';
import type { Category, ContentType, Market } from '../types/mag.types';

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

/**
 * ONE CONTROL SHAPE, TWO TAXONOMIES — so each row says which it is.
 *
 * The archive's chips filter by content type (همه · اخبار · تحلیل · گزارش ·
 * آموزش). A market archive's chips filter by market (همه · بورس ایران · طلا و
 * دلار · …). Identical styling, identical position, one click apart. A reader
 * learns the row means "type", then it silently means something else.
 *
 * The two-axis model is a deliberate decision — `decisions.md` chose two axes
 * over six because taxonomy bloat is the documented failure of this category —
 * and this row is the one place it surfaces to the reader. So the fix is to
 * NAME the axis rather than to blur the two together: unifying them would undo
 * the decision to keep two, and styling them differently would teach the
 * difference by rote instead of stating it.
 *
 * The label is visible, not just an `aria-label`. A sighted reader has exactly
 * the same problem the screen-reader user has here.
 */
function Bar({
  items,
  activeSlug,
  label,
  showLabel = true,
  trailing,
}: {
  items: FilterItem[];
  activeSlug: string | null;
  label: string;
  /** The visible label; the nav keeps it as its accessible name either way. */
  showLabel?: boolean;
  /** A control after the chips — the news page's search link. */
  trailing?: React.ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className="flex items-center gap-3"
    >
      {showLabel && (
        <span className="hidden shrink-0 text-[13px] text-text-muted sm:inline">{label}</span>
      )}

      <div
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
      </div>
      {trailing}
    </nav>
  );
}

export function ContentTypeFilterBar({
  contentTypes,
  activeSlug = null,
  categories,
}: {
  contentTypes: ContentType[];
  activeSlug?: string | null;
  /**
   * The categories the CMS actually holds, with their counts. A type with a
   * category gets the `/category/<slug>` route; a type with none, or with an
   * empty one, is not offered at all.
   */
  categories: ReadonlyArray<Pick<Category, 'slug' | 'count'>>;
}) {
  /*
    THIS ROW USED TO BE ALL QUERY STRINGS, and the note said one canonical
    archive URL with a filter parameter beat four thin near-duplicate pages.
    That reasoning was about duplication and it was right about duplication. It
    was wrong about indexing, and the second problem is the bigger one:
    `/archive?type=education` CANNOT be indexed by this build at all. Reading
    `searchParams` opts a route out of prerendering, so the filtered archive is
    a dynamic page Google is asked to crawl on demand — 41 articles' worth of
    topical authority sitting behind a URL shape that never becomes static.

    So a filter that has a category behind it now links to the path route, and
    the near-duplicate worry is handled where it belongs: the thin ones are
    `noindex` and out of the sitemap (see lib/taxonomy.ts), rather than the
    substantial ones being unindexable.

    A type is DERIVED from categories (see `resolveContentType`), so a type
    with no category has no articles and is not offered — the `?type=` form
    below only survives for the active type, reached from an old link.
  */
  const counts = new Map(categories.map((c) => [c.slug, c.count]));

  /*
    AN EMPTY TYPE IS NOT OFFERED. «گزارش» had a chip that led to «هنوز مطلبی
    در دسته گزارش منتشر نشده» — a filter whose only result is an apology, which
    is the same failure as rendering an empty section, and the team asked for
    it gone. It comes back by itself the day a report is published, because
    the count comes from the CMS rather than from this file.

    The ACTIVE type is kept even when empty, so a reader who arrives on
    `?type=report` from an old link still sees which filter they are on.
  */
  const offered = contentTypes.filter(
    (c) => (counts.get(c.slug) ?? 0) > 0 || c.slug === activeSlug,
  );

  const items: FilterItem[] = [
    { slug: 'all', name: 'همه', href: '/archive' },
    ...offered.map((c) => ({
      slug: c.slug,
      name: c.name,
      href: counts.has(c.slug) ? `/category/${c.slug}` : `/archive?type=${c.slug}`,
    })),
  ];

  return <Bar items={items} activeSlug={activeSlug ?? 'all'} label="نوع مطلب" />;
}

export function MarketFilterBar({
  markets,
  activeSlug = null,
  hrefFor = (slug) => `/market/${slug}`,
  allHref = '/',
  label = 'دسته‌بندی مطالب',
  showLabel = true,
  trailing,
}: {
  markets: Market[];
  activeSlug?: string | null;
  /**
   * Where a chip goes. Market archives by default; the news page points them
   * at `/news/<market>` so the chips filter NEWS, not the whole archive.
   */
  hrefFor?: (slug: string) => string;
  /** Where «همه» goes. */
  allHref?: string;
  label?: string;
  showLabel?: boolean;
  trailing?: React.ReactNode;
}) {
  /*
    Only markets with published articles appear.
    `housing` currently has zero — linking to it would send readers to an empty
    archive, which is the same failure as rendering an empty section.
  */
  const items: FilterItem[] = [
    { slug: 'all', name: 'همه', href: allHref },
    ...markets
      .filter((m) => (m.count ?? 0) > 0)
      .map((m) => ({ slug: m.slug, name: m.name, href: hrefFor(m.slug) })),
  ];

  /* «دسته‌بندی مطالب», not «بازار» — the team's word, circled in review
     2026-10-05. The row's links and data are unchanged. */
  return (
    <Bar
      items={items}
      activeSlug={activeSlug ?? 'all'}
      label={label}
      showLabel={showLabel}
      trailing={trailing}
    />
  );
}
