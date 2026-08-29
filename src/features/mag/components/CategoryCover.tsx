import { CardImage } from './CardImage';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { toPersianDigits } from '../lib/format';
import type { MagImage } from '../types/mag.types';

/**
 * The category masthead: cover image, breadcrumb and h1 over a scrim, then a
 * hairline-separated row carrying the description and the article count.
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
  count,
  image = null,
}: {
  title: string;
  crumbs: Crumb[];
  description?: string | null;
  count?: number | null;
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
                'linear-gradient(to top, rgba(7,19,49,.96), rgba(7,19,49,.35))',
            }}
          />
          <div className="absolute inset-x-5 bottom-6 lg:inset-x-8">
            <Breadcrumbs items={crumbs} />
            <h1 className="mt-2.5 text-[26px] font-bold tracking-[-0.4px] text-text-primary md:text-[34px]">
              {title}
            </h1>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5 pt-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-2.5 text-[26px] font-bold tracking-[-0.4px] text-text-primary md:text-[34px]">
            {title}
          </h1>
        </div>
      )}

      {(description || count !== null) && (
        <div className="flex flex-col gap-3 border-t border-border-subtle px-5 py-5 sm:flex-row sm:items-center sm:gap-7 lg:px-8">
          {description && (
            <p className="max-w-[70ch] flex-1 text-[15px] font-light leading-[1.85] text-text-secondary">
              {description}
            </p>
          )}
          {count !== null && count !== undefined && (
            <span className="shrink-0 text-[13px] text-text-muted">
              {toPersianDigits(count)} مطلب
            </span>
          )}
        </div>
      )}
    </section>
  );
}
