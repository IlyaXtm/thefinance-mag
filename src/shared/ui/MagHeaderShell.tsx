'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The header's mobile behaviour: sticky, hiding on scroll down, returning on
 * scroll up — with the reading-progress hairline riding its bottom edge.
 *
 * ── Why only mobile ─────────────────────────────────────────────────────
 *
 * The header's own note said NOT STICKY, on two grounds: a fixed bar costs
 * vertical space on mobile, and it would compete with the article page's
 * sticky table of contents. The first is what hide-on-scroll-down answers —
 * the header costs its height once, on the way in, and again only when the
 * reader asks for it by scrolling up. On a 41-minute article that is the
 * difference between paying 64px once and paying it permanently.
 *
 * The second ground still stands and is why this is mobile-only. The sticky
 * ToC rail is `xl:sticky` and the right rail `lg:sticky`, both measured
 * against `top-[76px]` with a STATIC header. Desktop is untouched: no
 * transform, no sticky, and those offsets keep meaning what they meant.
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
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    /*
      The header's own height. Nothing hides until the reader is past it —
      otherwise a short flick at the top of the page pulls the masthead away
      before it has been read once.
    */
    const REVEAL_ABOVE = 64;

    /*
      A direction change under this many pixels is a wobble, not an intent.
      Without it, momentum scrolling on iOS toggles the header several times a
      second and the page appears to flicker.
    */
    const THRESHOLD = 8;

    let frame = 0;
    lastY.current = window.scrollY;

    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY.current;

      if (Math.abs(delta) < THRESHOLD) return;
      lastY.current = y;

      /* Above the fold the header is always present. So is the top of the
         page after a browser's overscroll bounce, where scrollY goes
         negative. */
      if (y <= REVEAL_ABOVE) {
        setHidden(false);
        return;
      }

      setHidden(delta > 0);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

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
      className={[
        'sticky top-0 z-40 border-b border-border-subtle bg-surface',
        'transition-transform duration-[180ms] ease-out motion-reduce:transition-none',
        hidden ? '-translate-y-full' : 'translate-y-0',
        'lg:static lg:translate-y-0',
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
