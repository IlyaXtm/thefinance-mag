import Link from 'next/link';
import { CompactCard, PostCard, WideCard } from '@/features/mag/components';
import type { TopicBlock } from '@/features/mag/lib/landing';
import type { ArticleSummary } from '@/features/mag/types/mag.types';

/**
 * The home page's section heading: h2, a hairline, and an onward link.
 *
 * It was written inline once, for «تازه‌ترین مطالب». The landing now has up to
 * eight sections, and eight copies of one row is eight places for the touch
 * target or the chevron direction to drift.
 *
 * The link is `min-h-11` — 44px — because it is a control, not a label. The
 * chevron points left: forward, in RTL.
 */
export function LandingSectionHeader({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <h2 id={id} className="text-h2 font-bold tracking-[-0.2px] text-text-primary">
        {title}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center text-[14px] text-accent transition-colors hover:text-text-primary"
        >
          {linkLabel}
          {/* Hidden from the accessible name: the label is the destination, the
              arrow only says "forward" — and in RTL forward points left. */}
          <span aria-hidden="true" className="ms-1">
            ←
          </span>
        </Link>
      )}
    </div>
  );
}

/**
 * «پیشنهاد سردبیر» — two large, then up to four small.
 *
 * The slot the team asked to fill with «پربازدیدترین مطالب». A popularity
 * ranking is on CLAUDE.md's never-build list and WordPress records no view
 * counts to rank by, so the team chose an editor's selection instead: the
 * posts with WordPress's «چسباندن به بالای وبلاگ» ticked. Same layout as the
 * reference, no counts anywhere on it.
 *
 * Four across at `xl`, against the system's three-column card grid, to match
 * the 2 + 4 shape the team sent: this row runs the full 1224px container, so
 * the small cards are still ~290px — wider than a three-up card inside the
 * 1fr | 320px body below it.
 */
export function EditorsPicks({ items }: { items: ArticleSummary[] }) {
  const [large, small] = [items.slice(0, 2), items.slice(2)];

  return (
    <section aria-labelledby="picks-heading" className="mt-[60px] lg:mt-24">
      <LandingSectionHeader id="picks-heading" title="پیشنهاد سردبیر" />

      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        {large.map((article) => (
          <CompactCard
            key={article.id}
            article={article}
            size="lg"
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        ))}
      </div>

      {small.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:mt-6 lg:gap-6 xl:grid-cols-4">
          {small.map((article) => (
            <CompactCard
              key={article.id}
              article={article}
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 25vw"
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** A «تازه‌ترین …» block: four cards, two across, and a link to the rest. */
export function LatestSection({
  id,
  title,
  href,
  linkLabel,
  items,
}: {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  items: ArticleSummary[];
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={id}>
      <LandingSectionHeader id={id} title={title} href={href} linkLabel={linkLabel} />
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        {items.map((article) => (
          <PostCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

/**
 * One topic: a wide lead card, then two compact ones. The «1 big + 2 small»
 * shape of the Zoomit reference, with the titles off the images — see
 * CompactCard for why that part of the reference could not be followed.
 */
export function TopicSection({ topic }: { topic: TopicBlock }) {
  const [lead, ...rest] = topic.items;
  const id = `topic-${topic.key}-heading`;

  return (
    <section aria-labelledby={id}>
      <LandingSectionHeader
        id={id}
        title={topic.title}
        href={topic.href}
        linkLabel={`همه‌ی ${topic.title}`}
      />

      <WideCard article={lead} />

      {rest.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:mt-6 lg:gap-6">
          {rest.map((article) => (
            <CompactCard
              key={article.id}
              article={article}
              sizes="(max-width: 639px) 100vw, 360px"
            />
          ))}
        </div>
      )}
    </section>
  );
}
