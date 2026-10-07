import { CardImage } from './CardImage';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import type { MagImage } from '../types/mag.types';
import { bidiTitle } from '../lib/bidi-title';

/**
 * The category masthead: breadcrumb, h1 and the one-line description, as ONE
 * compact block on every archive (team, 2026-10-05: «ارتفاع کم شود؛ همین
 * الگو برای همه دسته‌ها»). The description used to sit in a second,
 * hairline-separated row beside a post count; the count is gone («عددا پاک
 * بشه») and the row with it. With a cover image the description stays under
 * the image, since it cannot sit on the scrim legibly at any length.
 *
 * The image is OPTIONAL and the block is designed for its absence. `market`
 * descriptions are a taxonomy field that may be empty and most terms have no
 * cover art, so without a graceful no-image state this would be a 210px grey
 * band on most category pages. With no image it collapses to the text row and
 * reads as a heading, not a broken banner.
 *
 * Not `priority`: on an archive the LCP element is the first card in the list,
 * not the masthead, and the design allows exactly one eager image per page.
 */
export function CategoryCover({
  title,
  crumbs,
  description,
  image = null,
}: {
  title: string;
  crumbs: Crumb[];
  description?: string | null;
  image?: MagImage | null;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-border-subtle bg-surface-raised">
      {image ? (
        <div className="relative h-[210px]">
          <CardImage image={image} sizes="100vw" rounded="" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, var(--scrim-cover-from), var(--scrim-cover-to))',
            }}
          />
          <div className="absolute inset-x-5 bottom-6 lg:inset-x-8" data-on-media>
            <Breadcrumbs items={crumbs} />
            <h1 className="mt-2.5 text-h1 font-bold tracking-[-0.4px] text-on-media">
              {bidiTitle(title)}
            </h1>
          </div>
        </div>
      ) : (
        <div className="px-5 py-5 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-2 text-h1 font-bold tracking-[-0.4px] text-text-primary">
            {bidiTitle(title)}
          </h1>
          {description && (
            <p className="mt-2 max-w-[70ch] text-[15px] font-light leading-[1.85] text-text-secondary">
              {description}
            </p>
          )}
        </div>
      )}

      {image && description && (
        <p className="max-w-[70ch] px-5 py-4 text-[15px] font-light leading-[1.85] text-text-secondary lg:px-8">
          {description}
        </p>
      )}
    </section>
  );
}
