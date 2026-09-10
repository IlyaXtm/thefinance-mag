'use client';

import { useEffect, useState } from 'react';

/**
 * A quiet InChart card in the article rail, after the reader is half way in.
 *
 * ── This is one step from a pattern the brand rules out, so the constraints
 *    are the feature ─────────────────────────────────────────────────────
 *
 * A CTA that appears on scroll is the shape of an interstitial. Four rules
 * separate this from one, and all four are load-bearing rather than polish:
 *
 *   IN PLACE, NOT FLOATING. It is a card at the end of the sidebar column,
 *   in normal flow. Nothing is fixed, nothing overlays, and it cannot cover
 *   a word of the article — the rail is its own grid column.
 *
 *   IT CANNOT SHIFT THE LAYOUT. It is the LAST child of the rail, so
 *   appearing only extends the column downward; nothing already on screen
 *   moves. That is also why it is not given reserved space while hidden — a
 *   held-open gap for something absent is the hole the newsletter card was
 *   just removed to avoid.
 *
 *   FADE ONLY. Opacity, 200ms, no translate, no scale, no slide.
 *   `prefers-reduced-motion` removes even that and it simply appears.
 *
 *   DISMISSED IS DISMISSED. The X writes to localStorage and the card never
 *   returns for that reader, on any article. A CTA that comes back after
 *   being closed is an ad; one that takes no for an answer is a link.
 *
 * The copy carries no urgency, no superlative, no count and no profit claim —
 * see the brand list in CLAUDE.md. InChart is a first-party product already in
 * the header nav and the footer; this is a third placement of an existing
 * link, not a new commercial surface.
 *
 * ── Why a scroll listener and not an observer ───────────────────────────
 *
 * "Half way through the article" is a scroll position, not an element
 * intersection: an IntersectionObserver can say when a box is visible, not
 * when the reader has passed the midpoint of one. The listener is
 * rAF-throttled like the reading-progress one, and REMOVES ITSELF the moment
 * it fires — so the per-frame cost exists only until the threshold is crossed,
 * once per page view.
 */

const DISMISS_KEY = 'tf-mag-inchart-dismissed';

/** Fraction of the article body that must be behind the reader. */
const REVEAL_AT = 0.5;

export function InchartCta() {
  const [state, setState] = useState<'hidden' | 'shown' | 'dismissed'>('hidden');

  useEffect(() => {
    /*
      Reading localStorage THROWS — it does not return null — in a browser set
      to block site data, and this runs before anything else in the effect.
      A reader with storage disabled gets the card, which is the right failure
      direction: the alternative is hiding a link because a preference could
      not be read.
    */
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === '1') {
        setState('dismissed');
        return;
      }
    } catch {
      /* No stored preference is readable. Carry on and show it. */
    }

    const body = document.querySelector('[data-article-body]');
    if (!body) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const { top, height } = body.getBoundingClientRect();
      const readable = height - window.innerHeight;
      /* A body shorter than the viewport has no midpoint to cross; treat the
         reader as past it rather than never showing the card at all. */
      const passed = readable <= 0 ? 1 : -top / readable;

      if (passed >= REVEAL_AT) {
        setState('shown');
        stop();
      }
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    function stop() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    }

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return stop;
  }, []);

  if (state !== 'shown') return null;

  function dismiss() {
    setState('dismissed');
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* Not persisting a dismissal is a worse outcome than crashing here
         would be, but only slightly — it comes back on the next article. */
    }
  }

  return (
    <section
      aria-labelledby="inchart-cta-heading"
      /* `animate-` nothing: a keyframe would need a motion-preference branch of
         its own. A transition from the mounted opacity-0 state is one property
         and `motion-reduce` turns it off completely. */
      className="animate-none rounded-card border border-border-subtle bg-surface-raised p-[22px] opacity-0 [animation:tf-fade-in_200ms_ease-out_forwards] motion-reduce:opacity-100 motion-reduce:[animation:none]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="inchart-cta-heading" className="text-h4 font-bold text-text-primary">
          نمودارها را در اینچارت ببینید
        </h2>

        <button
          type="button"
          onClick={dismiss}
          aria-label="بستن این پیشنهاد"
          /* 44px target, drawn small: the control is secondary to the link
             beside it and must not read as the card's main action. */
          className="-me-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-primary motion-reduce:transition-none"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <p className="mt-2 text-[14px] font-light leading-[1.85] text-text-secondary">
        ابزار نمودار فارسی فایننس، با اندیکاتورها و ابزار ترسیم روی بازارهای
        ایران و جهان.
      </p>

      <a
        href="https://inchart.thefinance.ir"
        rel="noopener noreferrer"
        target="_blank"
        className="mt-4 inline-flex h-11 items-center rounded-full border border-border-interactive px-4 text-[14px] text-text-primary transition-colors hover:border-accent hover:bg-accent-soft motion-reduce:transition-none"
      >
        باز کردن اینچارت
      </a>
    </section>
  );
}
