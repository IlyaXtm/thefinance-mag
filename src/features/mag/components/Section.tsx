/**
 * Section wrapper.
 *
 * Owns the global spacing baseline so no component has to know it:
 *   horizontal padding  20px mobile / 100px desktop
 *   vertical spacing    60px mobile / 96px desktop
 *
 * These are not per-page choices. Sections are separated by whitespace, never
 * by full-bleed background blocks.
 */
export function Section({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-5 py-[60px] lg:px-[100px] lg:py-24 ${className}`}>{children}</section>
  );
}

/** Same padding, no vertical spacing — for stacking sections that share a rhythm. */
export function SectionInner({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-5 lg:px-[100px] ${className}`}>{children}</div>;
}
