'use client';

import { useEffect, useState } from 'react';
import { headingId as tocId } from '../lib/sanitize';

/**
 * Table of contents, built from the article's own H2 headings.
 *
 * Same source as the featured card's «در این مقاله» block — one array, two
 * consumers, so they can never disagree about what the article contains.
 *
 * Fewer than two headings → omitted entirely. A one-item table of contents
 * tells the reader nothing and takes the space of something that would.
 *
 * A client component ONLY for the scroll-spy. The article body and everything
 * indexable stays server-rendered; this costs a little JS for the active
 * highlight, which is what makes a long article feel navigable rather than
 * endless.
 */

/* Re-exported from the sanitizer so the body and this list can never derive
   ids differently. */
export { headingId as tocId } from '../lib/sanitize';

export function TableOfContents({ headings }: { headings: string[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length < 2) return;

    const elements = headings
      .map((text, i) => document.getElementById(tocId(text, i)))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    /*
      rootMargin pulls the detection band to roughly the top third of the
      viewport. Without it a heading only becomes "active" once it hits the
      very top, so the highlight lags a full section behind the reader.
    */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -66% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const links = headings.map((text, i) => {
    const id = tocId(text, i);
    const isActive = id === activeId;

    return (
      <li key={id}>
        <a
          href={`#${id}`}
          aria-current={isActive ? 'true' : undefined}
          className={`block py-1.5 ps-3 text-[14px] leading-[1.8] transition-colors ${
            isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
          }`}
          style={{
            borderInlineStartWidth: 2,
            borderInlineStartStyle: 'solid',
            /* A border marker rather than a filled row — a background fill is
               too heavy for a sidebar and competes with the article. */
            borderInlineStartColor: isActive ? 'var(--accent)' : 'transparent',
          }}
        >
          {text}
        </a>
      </li>
    );
  });

  return (
    <>
      {/* Desktop — sticky in the inline-end column, the LEFT side in RTL. */}
      <nav aria-label="در این مقاله" className="sticky top-8 hidden lg:block">
        <p className="mb-3 text-[13px] font-semibold text-text-muted">در این مقاله</p>
        {/*
          Capped height with internal scroll. Articles here run long — the
          technical-analysis piece is a 41-minute read — and an uncapped list
          would stretch past the viewport and defeat the sticky behaviour it
          exists for.
        */}
        <ul className="max-h-[calc(100vh-8rem)] space-y-0.5 overflow-y-auto pe-1">{links}</ul>
      </nav>

      {/* Mobile — native disclosure, closed by default, no custom JS. */}
      <details className="rounded-card border border-border-subtle bg-surface-raised px-4 py-3 lg:hidden">
        <summary className="cursor-pointer list-none text-[14px] font-semibold text-text-primary">
          در این مقاله
        </summary>
        <ul className="mt-3 max-h-[50vh] space-y-0.5 overflow-y-auto">{links}</ul>
      </details>
    </>
  );
}
