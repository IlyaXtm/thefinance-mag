import type { MagImage } from '../types/mag.types';

/**
 * The aspect ratio the article hero is drawn at, per image.
 *
 * ── What was wrong ──────────────────────────────────────────────────────
 *
 * The hero was a fixed box: `h-[220px] md:h-[420px]`, full width. At a 1440
 * viewport that is 1360×420 — a ratio of 3.24 — and `object-cover` inside it.
 * Nothing in the archive is anywhere near that shape. Measured across the 53
 * published articles the featured images cluster at three ratios:
 *
 *     1200×630  ≈ 1.90   the standard OG size, the great majority
 *     1200×800  ≈ 1.50
 *      680×272  ≈ 2.50   three images are under 800px wide
 *
 * So the box was cropping 41% of the height off a typical image, 54% off the
 * tallest, and 23% off the widest — every single time. That is what "very wide
 * and short" looks like from the reader's side: a band cut out of the middle of
 * artwork that was composed as a rectangle.
 *
 * ── Why per-image and not a taller fixed box ────────────────────────────
 *
 * A fixed box at 1.9 would be free for the majority and would still crop 21%
 * off a 1.5 image — and worse, it would crop the SIDES off the 2.5 panoramas,
 * which are the chart images where the edges carry the axis labels. One fixed
 * shape cannot be right for a corpus with three shapes in it.
 *
 * `object-fit: contain` was the other option in the brief and is rejected: the
 * box would keep its own shape and letterbox everything inside it, so a
 * 1.9 image in a 3.24 frame gets bars down both sides. Blog v4 is deliberately
 * image-led and a framed, bar-padded hero reads as a broken upload.
 *
 * ── Why this cannot cause layout shift ──────────────────────────────────
 *
 * The variable height is the real risk the brief names, and it is answered by
 * where the number comes from: `mediaDetails` is fetched server-side and the
 * ratio is written into the markup as an inline `aspect-ratio`, so the box has
 * its final height before a single image byte arrives. Nothing reflows when the
 * image loads. This is the same guarantee `CardImage` gives with a fixed box,
 * reached with a computed one. CLS stays 0.
 *
 * `mapImage` defaults to 1200×675 when `mediaDetails` is absent, so the ratio
 * is never derived from a missing value — but the guard below is kept anyway,
 * because a 0 height would produce `aspect-ratio: Infinity` and a zero-height
 * hero, and that is worth one branch.
 *
 * ── The clamp, and why there are two of them ───────────────────────────
 *
 * Bounded to [1.9, 2.8] on desktop and [1.5, 2.8] on mobile.
 *
 * The ceiling is shared and stops a future panorama from becoming a letterbox
 * slot; 2.8 leaves today's 2.5 images untouched.
 *
 * THE FLOOR IS A DESKTOP COST CONTROL AND NOTHING ELSE. The hero is full-bleed
 * at 1360px there, so an unclamped 1.5 image would stand 907px tall, push the
 * first paragraph off the screen, and — since the hero is the LCP element —
 * put those pixels on the critical path. 1.9 caps it at 716px and is the ratio
 * most of the archive already is, so the clamp costs the common case nothing;
 * only a 1.5 upload is cropped, by 21% instead of 54%.
 *
 * At 350px wide that reasoning does not apply: an unclamped 1.5 image is 233px
 * tall, which is nothing. Applying the desktop floor there anyway was the one
 * REGRESSION in the measured before/after — a 1.5 image went from 6% cropped to
 * 21%, because the old fixed mobile box (350×220, ratio 1.59) happened to sit
 * near 1.5 by accident. A floor that exists to bound height should not bind
 * where height is not a problem, so mobile keeps its own.
 *
 * The two values are emitted as custom properties and selected by a media
 * query in the class list, not by an inline style: an inline `aspect-ratio`
 * beats every class, so it cannot be overridden at a breakpoint.
 */

const MAX_RATIO = 2.8;
const MIN_RATIO_DESKTOP = 1.9;
const MIN_RATIO_MOBILE = 1.5;

export interface HeroRatios {
  mobile: number;
  desktop: number;
}

export function heroAspectRatios(image: Pick<MagImage, 'width' | 'height'>): HeroRatios {
  const raw = image.width && image.height ? image.width / image.height : 0;

  /* `mapImage` defaults to 1200×675 when `mediaDetails` is absent, so this
     should never fire — but a 0 height would give `aspect-ratio: Infinity` and
     a zero-height hero, which is worth one branch. */
  const ratio = Number.isFinite(raw) && raw > 0 ? raw : MIN_RATIO_DESKTOP;

  const clamp = (min: number) => Math.min(MAX_RATIO, Math.max(min, ratio));

  return { mobile: clamp(MIN_RATIO_MOBILE), desktop: clamp(MIN_RATIO_DESKTOP) };
}
