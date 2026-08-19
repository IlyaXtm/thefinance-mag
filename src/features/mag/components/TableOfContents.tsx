/**
 * Table of contents, built from the article's own H2 headings.
 *
 * Same source as the featured card's «در این مقاله» block — one array, two
 * consumers, so they can never disagree about what the article contains.
 *
 * Fewer than two headings → the whole thing is omitted. A one-item table of
 * contents tells the reader nothing and takes up the space of something that
 * would.
 *
 * Desktop is sticky in the inline-END column, which is the LEFT side in RTL.
 * Mobile is a native <details>, closed by default: no custom JavaScript, no
 * hydration cost, and it works before React loads.
 *
 * scroll-behavior is deliberately not set to smooth. Anchor jumps use the
 * browser default, which respects the user's motion preference without any
 * extra handling.
 */

function slugifyHeading(text: string, index: number): string {
  return `s${index + 1}-${text.trim().slice(0, 24).replace(/\s+/g, '-')}`;
}

export function tocId(text: string, index: number): string {
  return slugifyHeading(text, index);
}

export function TableOfContents({ headings }: { headings: string[] }) {
  if (headings.length < 2) return null;

  const links = headings.map((text, i) => (
    <li key={i}>
      <a
        href={`#${tocId(text, i)}`}
        className="block border-inline-start border-transparent py-1.5 ps-3 text-[14px] text-text-secondary transition-colors hover:text-text-primary"
        style={{ borderInlineStartWidth: 2 }}
      >
        {text}
      </a>
    </li>
  ));

  return (
    <>
      {/* Desktop — sticky sidebar */}
      <nav
        aria-label="در این مقاله"
        className="sticky top-8 hidden lg:block"
      >
        <p className="mb-3 text-[13px] font-semibold text-text-muted">در این مقاله</p>
        <ul className="space-y-0.5">{links}</ul>
      </nav>

      {/* Mobile — native disclosure, closed by default */}
      <details className="rounded-card border border-border-subtle bg-surface-raised px-4 py-3 lg:hidden">
        <summary className="cursor-pointer list-none text-[14px] font-semibold text-text-primary">
          در این مقاله
        </summary>
        <ul className="mt-3 space-y-0.5">{links}</ul>
      </details>
    </>
  );
}
