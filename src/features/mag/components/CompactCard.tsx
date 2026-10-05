import Link from 'next/link';
import { CardImage } from './CardImage';
import { CardDate } from './CardMeta';
import { CategoryChip } from './CategoryChip';
import { cardCategory, cardDek } from '../lib/card';
import { formatReadingTime } from '../lib/format';
import { bidiTitle } from '../lib/bidi-title';
import type { ArticleSummary } from '../types/mag.types';

/**
 * Image on top, title under it — the card the landing's image-led sections
 * are built from (asked for 2026-10-05: «تعداد مقالاتی که با عکسشون نشون داده
 * میشن بیشتر بشه»).
 *
 * THE TITLE IS NEVER ON THE IMAGE. The reference the team sent (Zoomit) sets
 * it over the photo, and this archive cannot: most featured images carry the
 * headline baked into the artwork, which is exactly the collision they
 * reported on the old hero the same day.
 *
 * The image box is a fixed aspect ratio, so a wrong-aspect upload crops rather
 * than reflowing the row. 16:10 sits between the archive's two shapes (1.79
 * and 1.50), cropping each by under 12%.
 *
 * `lg` is the editor's-pick size: larger title and a dek. `sm` is title and
 * meta only — at four across there is no width for a readable dek.
 *
 * Hover is the border colour and nothing else: no lift, no shadow, no scale.
 */
export function CompactCard({
  article,
  size = 'sm',
  sizes,
}: {
  article: ArticleSummary;
  size?: 'sm' | 'lg';
  /** The `sizes` hint for this placement — it differs per grid. */
  sizes: string;
}) {
  const category = cardCategory(article);
  const dek = size === 'lg' ? cardDek(article, 1) : null;

  return (
    <article className="group relative flex flex-col rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none">
      <div className="aspect-[16/10]">
        <CardImage image={article.featuredImage} sizes={sizes} rounded="rounded-t-card" />
      </div>

      <div className={`flex flex-1 flex-col gap-2 ${size === 'lg' ? 'p-5' : 'p-4'}`}>
        <div className="flex items-center gap-2.5 text-[12px]">
          <CategoryChip name={category.name} />
          <CardDate iso={article.publishedAt} />
        </div>

        <h3
          className={`font-semibold text-text-primary [text-wrap:pretty] ${
            size === 'lg' ? 'text-h3 leading-[1.6]' : 'text-[15px] leading-[1.7]'
          }`}
        >
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h3>

        {dek && (
          <p className="text-[14.5px] font-light leading-[1.85] text-text-secondary [text-wrap:pretty]">
            {dek}
          </p>
        )}

        <span className="mt-auto pt-1 text-[12.5px] text-text-muted">
          {formatReadingTime(article.readingTime)} مطالعه
        </span>
      </div>
    </article>
  );
}

/**
 * The lead card of a topic section: image beside the text from `md`, stacked
 * below it. The «1 big + 2 small» shape of the Zoomit reference, kept
 * horizontal so four such sections do not each open with a 450px-tall image.
 */
export function WideCard({ article }: { article: ArticleSummary }) {
  const category = cardCategory(article);
  const dek = cardDek(article, 2);

  return (
    <article className="group relative grid rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none md:grid-cols-[1.15fr_1fr] md:items-center">
      {/* 16:10 at every width — never stretched to the text column's height.
          A stretched box crops the artwork's sides, and the baked-in headline
          is usually what sits at the sides. */}
      <div className="aspect-[16/10] md:m-3">
        <CardImage
          image={article.featuredImage}
          sizes="(max-width: 767px) 100vw, 420px"
          rounded="rounded-t-card md:rounded-lg"
        />
      </div>

      <div className="flex flex-col gap-3 p-5 md:p-6">
        <div className="flex items-center gap-2.5 text-[12px]">
          <CategoryChip name={category.name} />
          <CardDate iso={article.publishedAt} />
        </div>

        <h3 className="text-h3 font-semibold leading-[1.6] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h3>

        {dek && (
          <p className="text-[14.5px] font-light leading-[1.85] text-text-secondary [text-wrap:pretty]">
            {dek}
          </p>
        )}

        <span className="mt-auto pt-1 text-[12.5px] text-text-muted">
          {article.author.name} · {formatReadingTime(article.readingTime)} مطالعه
        </span>
      </div>
    </article>
  );
}
