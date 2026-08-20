/**
 * Section wrapper.
 *
 * Owns the global spacing baseline so no component has to know it:
 *   horizontal padding  20px mobile / 100px desktop
 *   vertical spacing    60px mobile / 96px desktop
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
    <section className={`px-5 py-[60px] lg:px-[100px] lg:py-24 ${className}`}>
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
    <div className={`px-5 lg:px-[100px] ${className}`}>
      <div className={WIDTHS[width]}>{children}</div>
    </div>
  );
}
