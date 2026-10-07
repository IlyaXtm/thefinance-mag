import { CardImage } from './CardImage';
import { CardBody } from './CardMeta';
import { cardAspect, imageFit } from '../lib/card';
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
 * The image box is a fixed aspect ratio, so nothing reflows. It was 16:10 —
 * "between the archive's two shapes, cropping each by under 12%" — and 12% of
 * a news image is its baked-in headline (team screenshot, 2026-10-07). It is
 * now the artwork's own shape per content type (cardAspect), and an odd-shaped
 * upload is shown whole (imageFit).
 *
 * The text half is CardBody — the team's badge → title → summary → meta
 * order, shared with PostCard so the two cannot drift. `lg` sets the title at
 * heading size for the featured row; `sm` at 16px for four-across.
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
  return (
    <article className="group relative flex flex-col rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none">
      <div style={{ aspectRatio: cardAspect(article) }}>
        <CardImage
          image={article.featuredImage}
          sizes={sizes}
          rounded="rounded-t-card"
          fit={imageFit(article.featuredImage, cardAspect(article))}
        />
      </div>

      <CardBody article={article} size={size === 'lg' ? 'lg' : 'sm'} />
    </article>
  );
}
