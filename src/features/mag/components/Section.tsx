/**
 * Section wrapper.
 *
 * Owns the global VERTICAL spacing baseline — 60px mobile / 96px desktop — and
 * takes the horizontal gutter from `.mag-gutter`, which is now the single
 * definition of 20/100 and of the 1440px cap. Section used to carry the
 * horizontal numbers itself AND no max-width, which is how it ended up
 * disagreeing with the four <main> shells in two directions at once: 100
 * against their 40 at every width, and unbounded against their 1440 above it.
 *
 * These are not per-page choices. Sections are separated by whitespace, never
 * by full-bleed background blocks.
 *
 * `maxWidth` centres the content instead of letting it stretch edge to edge.
 * Without it, an article's 700px text column pins to the reading-start side
 * and leaves two thirds of a wide screen empty — which is what the RTL layout
 * did before this existed.
 */

const WIDTHS = {
  /* Listing grids and archives — uses the full padded width. */
  full: '',
  /* Article pages: text column + table of contents, centred. */
  article: 'mx-auto w-full max-w-[1080px]',
} as const;

type Width = keyof typeof WIDTHS;

export function Section({
  children,
  width = 'full',
  className = '',
}: {
  children: React.ReactNode;
  width?: Width;
  className?: string;
}) {
  return (
    <section className={`mag-gutter py-[60px] lg:py-24 ${className}`}>
      <div className={WIDTHS[width]}>{children}</div>
    </section>
  );
}

/** Same padding, no vertical spacing — for stacking sections that share a rhythm. */
export function SectionInner({
  children,
  width = 'full',
  className = '',
}: {
  children: React.ReactNode;
  width?: Width;
  className?: string;
}) {
  return (
    <div className={`mag-gutter ${className}`}>
      <div className={WIDTHS[width]}>{children}</div>
    </div>
  );
}
