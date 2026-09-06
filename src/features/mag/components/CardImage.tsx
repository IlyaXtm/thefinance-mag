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
 * artwork gets a flat panel, which reads as "no image" rather than "failed to
 * load".
 *
 * IT USED TO BE `--surface-raised` — THE SAME COLOUR AS THE CARD IT SITS ON.
 * The box was still reserved and the grid still could not reflow, and a
 * measurement said exactly that: a no-image archive row is 984×208 with a
 * 270×170 image box, identical to every image row beside it. But nothing was
 * visible in that 270px, so the row READ as though the image box had been
 * dropped and the text had spread to full width — which is how it was reported
 * in review, and the report was right about what a reader sees even though the
 * layout was doing the right thing.
 *
 * A reserved space nobody can see is not reserved as far as the reader is
 * concerned. `--surface-hover` is the next step up the same neutral ramp, so
 * the slot reads as deliberately empty on either theme without introducing a
 * colour, and the inset border gives it an edge on surfaces where the two
 * steps are close.
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
        className={`block h-full w-full bg-surface-hover shadow-[inset_0_0_0_1px_var(--border-subtle)] ${rounded} ${className}`}
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
