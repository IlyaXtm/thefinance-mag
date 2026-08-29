import Image from 'next/image';
import { imageSrc } from '../lib/site';
import type { MagImage } from '../types/mag.types';

/**
 * Every featured image on a card, in one place.
 *
 * WHAT THIS EXISTS TO GUARANTEE:
 *
 *  - A fixed box with `fill` + `object-cover`, so a wrong-aspect upload crops
 *    instead of resizing the card. Filter selection must never reflow the grid
 *    (CLS target ≤0.1, and the measured figure is currently 0).
 *  - `sizes` on every instance. Without it `fill` requests the largest
 *    candidate on every breakpoint, which on a card grid is several megabytes
 *    of image nobody sees.
 *  - Exactly one `priority` image per page — the design says the post hero is
 *    the only eager one. Everything else is lazy by default.
 *  - A real Persian `alt`, or an empty one when the image is decorative beside
 *    a title that already says the same thing.
 *
 * `imageSrc` normalises the basePath — see the note on it; a local src
 * without `/mag` 400s at the optimizer while the page still renders.
 *
 * The placeholder is not a broken-image box: an article genuinely without
 * artwork gets a flat `--surface-raised` panel, which reads as "no image"
 * rather than "failed to load".
 */
export function CardImage({
  image,
  sizes,
  priority = false,
  className = '',
  rounded = 'rounded-lg',
}: {
  image: MagImage | null;
  /** Required — see above. */
  sizes: string;
  priority?: boolean;
  className?: string;
  rounded?: string;
}) {
  if (!image) {
    return (
      <span
        aria-hidden="true"
        className={`block h-full w-full bg-surface-raised ${rounded} ${className}`}
      />
    );
  }

  return (
    <span className={`relative block h-full w-full overflow-hidden ${rounded} ${className}`}>
      <Image
        src={imageSrc(image.url)}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </span>
  );
}
