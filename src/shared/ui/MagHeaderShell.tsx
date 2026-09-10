'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * The header's mobile behaviour: sticky and ALWAYS VISIBLE, condensing once
 * the reader is past the top — with the reading-progress hairline riding its
 * bottom edge.
 *
 * ── It used to hide on scroll down, and that was wrong on a real phone ──
 *
 * Hide-on-scroll-down was asked for and built, and the mechanism was correct:
 * verified under iPhone emulation, sticky resolves with no blocking ancestor,
 * the header leaves at -65 going down and returns to 0 going up. It was
 * reported from an actual device as "nav not sticky", and that report is
 * right about the thing that matters — a reader scrolling an article sees no
 * navigation, and "it comes back if you scroll the other way" is a rule they
 * have to learn rather than a header they can reach.
 *
 * So the header stays. The objection it was answering — 64px of permanent
 * cost on a 41-minute article — is real and is paid down a different way:
 * past the fold the bar CONDENSES to 52px, dropping 12px and shrinking the
 * lockup, while keeping every control reachable. Always-there and slightly
 * smaller beats sometimes-there and full size.
 *
 * ── Why only mobile ─────────────────────────────────────────────────────
 *
 * The header's original note said NOT STICKY on two grounds. The first — a
 * fixed bar costs vertical space — is what the condensed state answers. The
 * second still stands and is why this is mobile-only: the sticky ToC rail is
 * `xl:sticky` and the right rail `lg:sticky`, both measured against
 * `top-[76px]` with a STATIC header. Desktop is untouched.
 *
 * ── The progress bar moved here ─────────────────────────────────────────
 *
 * It used to be a `fixed top-0` element rendered from ArticleAside. Two
 * fixed things at the top of a phone screen is one too many, and the bar
 * stayed put while the header slid away underneath it.
 *
 * ONE MEASUREMENT, TWO CONSUMERS. ArticleAside still owns the number — it is
 * the component that knows where the article body is — and publishes it as
 * `--reading-progress` on the document element, plus a `data-reading` flag so
 * this bar knows whether there is an article at all. This component reads the
 * custom property in CSS and never measures anything. Two implementations of
 * one number drift; a custom property cannot.
 */
export function MagHeaderShell({ children }: { children: ReactNode }) {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    /*
      One threshold, one direction, no history — which is the whole reason
      this is simpler than what it replaces.

      Hide-on-scroll-down needed the last scroll position, a direction, and an
      8px dead zone to stop iOS momentum toggling it several times a second.
      A state that depends only on "am I past 64px" needs none of that: it
      cannot flicker, because there is no direction to disagree about, and a
      reader who stops mid-page finds it in the same state they left it.
    */
    const CONDENSE_BELOW = 64;

    let frame = 0;
    const measure = () => {
      frame = 0;
      setCondensed(window.scrollY > CONDENSE_BELOW);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      /*
        `sticky`, not `fixed`. Sticky keeps the header in flow, so the page
        below it needs no compensating padding and nothing has to know the
        header's height — a `fixed` header would have meant every page gaining
        a top offset that has to stay in sync with it.

        `lg:static` and `lg:translate-y-0` put desktop back exactly where it
        was, including when this component's state says hidden: a wide window
        that is scrolled and then narrowed must not open with its header
        already slid away.
      */
      /*
        `data-condensed` rather than a height class: the row inside is
        MagHeader's markup, and the two would have to agree on a number if this
        component set the height itself. The attribute lets the row own its own
        collapse — see the `[data-condensed]` rules in globals.css — so there
        is one place that knows what 64 and 52 mean.
      */
      data-condensed={condensed ? '' : undefined}
      className={[
        'sticky top-0 z-40 border-b border-border-subtle bg-surface',
        'transition-shadow duration-150 motion-reduce:transition-none',
        /* A shadow only once it is over content. At the top of the page the
           header is part of the page; past the fold it is above it, and the
           edge is what says so on a surface this dark. */
        condensed ? 'shadow-[0_1px_0_0_var(--border-strong)]' : '',
        'lg:static lg:shadow-none',
      ].join(' ')}
    >
      {children}

      {/*
        The reading-progress hairline, on the header's bottom edge.

        Rendered only when something has published a measurement — the flag is
        an attribute on <html>, so on a listing page this element is not in the
        layout at all rather than being a zero-width bar.

        3px and `bg-accent`, matching the track it replaces. It is
        `aria-hidden` because progress through an article is not information a
        screen reader needs announced on every scroll frame; the ToC panel
        carries the same figure as text for anyone who wants it.
      */}
      <div aria-hidden="true" className="mag-reading-progress">
        <span />
      </div>
    </header>
  );
}
