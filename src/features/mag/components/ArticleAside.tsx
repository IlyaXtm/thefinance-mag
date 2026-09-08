'use client';

import { useEffect, useRef, useState } from 'react';
import { headingId as tocId } from '../lib/sanitize';
import { toPersianDigits } from '../lib/format';

/**
 * The left rail on the post page: table of contents plus reading progress.
 *
 * ONE COMPONENT, not two, because they answer the same question from opposite
 * ends — "what is in this?" and "how much is left?" — and both derive from the
 * same scroll position, so splitting them would mean two scroll listeners.
 *
 * A client component only for that. The article body and everything indexable
 * stays server-rendered.
 *
 * The sticky rail is an xl-and-up thing. Between 1024 and 1279 the post page
 * is two columns and this becomes the `<details>` disclosure above the
 * article — a 260px rail there would leave the article ~299px wide. Below lg
 * it is the same disclosure, full width. Neither is sticky: a pinned panel at
 * 390px eats a third of the viewport to show a closed accordion.
 *
 * THE STICKY CLASS IS NOT IN THIS FILE. It is on the grid item in
 * app/[slug]/page.tsx, because that is the box with travel in it — see the
 * note there. Putting it back on the <nav> below would be a no-op that looks
 * like a fix, which is exactly what shipped before.
 *
 * Ids come from `headingId()` in lib/sanitize, the same function that stamps
 * them onto the body. If the two ever derive ids differently the anchors go
 * nowhere and the highlight never fires — and nothing errors, which is why
 * they share the function rather than agreeing by convention.
 */
export function ArticleAside({ headings }: { headings: string[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const elements = headings
      .map((text, i) => document.getElementById(tocId(text, i)))
      .filter((el): el is HTMLElement => el !== null);

    /*
      THE ACTIVE HEADING IS COMPUTED FROM POSITION, NOT FROM THE ENTRY BATCH.

      It used to be `entries.filter(isIntersecting).sort(by top)[0]`, and that
      is wrong in two ways that compound. An IntersectionObserver callback
      receives only the elements whose intersection CHANGED, so the topmost of
      that batch is the topmost of what changed — not the heading the reader is
      under. And with a detection band about 220px tall and headings ~600px
      apart, most scroll positions have NO heading in the band at all, so the
      highlight simply held whatever last crossed it.

      Measured on the 24-heading article at 1440×900, before this change:

        scrolled to 25%  highlighted «خطوط روند»          reader was at «حمایت و مقاومت»
        scrolled to 40%  highlighted «خطوط روند»          reader was at «شاخص قدرت نسبی»
        scrolled to 70%  highlighted «فیبوناچی اصلاحی»    reader was at «خطاهای رایج»

      Five and six sections behind. It was NOT caused by the panel becoming
      sticky — verified by overriding the wrapper back to `position: static` at
      1440 with everything else identical, which reproduced the same four wrong
      answers exactly. The bug predates the sticky fix; the sticky fix is what
      makes it matter, because a highlight that was off-screen for most of the
      read is now pinned in front of the reader for forty minutes.

      So: the observer stays, as the cheap thing that wakes this up without a
      scroll listener of its own, but the callback asks the DOM which heading
      the reader is actually under. `pick()` walks headings in document order
      and keeps the last one above the band's lower edge — the standard
      scroll-spy — and stops at the first one below it, so early in an article
      it reads one or two rects, not all 24.
    */
    const BAND_FRACTION = 0.34; // matches the -66% bottom rootMargin below

    const pick = () => {
      const line = window.innerHeight * BAND_FRACTION;
      let current: HTMLElement | null = null;

      for (const el of elements) {
        if (el.getBoundingClientRect().top > line) break;
        current = el;
      }

      /* Null before the first heading crosses the line — the reader is in the
         standfirst, and highlighting section one there would be a claim about
         where they are rather than a report of it. */
      setActiveId(current ? current.id : null);
    };

    const observer = new IntersectionObserver(pick, {
      rootMargin: '-80px 0px -66% 0px',
      threshold: 0,
    });

    elements.forEach((el) => observer.observe(el));

    /*
      Progress is measured against the ARTICLE BODY, not the document: the
      footer and the related grid are not part of the read, and counting them
      makes the bar stall at ~70% exactly when the reader finishes.

      `[data-article-body]` rather than `article` — cards are `<article>`
      elements, so the bare selector matched a related-post card and the bar
      tracked that card's geometry. It rendered perfectly and was simply
      wrong, which is why this is measured rather than eyeballed.

      rAF-throttled — a raw scroll handler runs far more often than a frame can
      paint, and this is the one piece of per-scroll work on the page.
    */
    const article = document.querySelector('[data-article-body]');
    let frame = 0;

    const measure = () => {
      frame = 0;
      /* Also re-picked here, not only in the observer: a jump — an anchor
         click, a Home/End press, a fast flick — can carry the viewport past
         several headings between two observer callbacks, and the band they
         never entered leaves the highlight behind. This runs on the frame the
         scroll settles on regardless. */
      pick();
      if (!article) return;

      const { top, height } = article.getBoundingClientRect();
      const scrolled = -top;
      const readable = height - window.innerHeight;

      if (readable <= 0) {
        setProgress(scrolled >= 0 ? 100 : 0);
        return;
      }

      setProgress(Math.min(100, Math.max(0, Math.round((scrolled / readable) * 100))));
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings]);

  /*
    KEEP THE HIGHLIGHTED ENTRY INSIDE THE SCROLLED LIST.

    The panel is capped and scrolls internally, so on the 24-heading article
    only about 16 entries are in view at once. Without this the panel sticks
    and travels correctly while the highlight moves to an entry the reader
    cannot see — the ToC follows the reader, the reader's place in the ToC does
    not. Half the fix looks like the whole fix.

    Scrolls the CONTAINER, not the element. `scrollIntoView` is the API
    CLAUDE.md prescribes and it is the right one for a page-level scroll, but
    here the target sits in a nested scroller that is itself inside a sticky
    panel: `block: 'nearest'` still walks up and can move the window, which
    would yank the article out from under someone who is reading it. Setting
    `scrollTop` on the <ul> cannot move anything but the <ul>.

    `scrollTop` and not `scrollLeft`, so the RTL warning in CLAUDE.md does not
    apply — vertical offsets have one meaning in every browser and every
    direction. This must never become horizontal arithmetic.

    Nothing happens while the entry is already visible, so a reader scrolling
    through the middle of a section sees no movement at all.
  */
  useEffect(() => {
    const list = listRef.current;
    if (!list || !activeId) return;

    /* Zero when the rail is `display:none` — below xl the ToC is the
       <details> and this list is not laid out at all. Every rect would be 0
       and the arithmetic below would scroll it to the top for nothing. */
    if (list.clientHeight === 0) return;

    const item = list.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`);
    if (!item) return;

    /*
      Rects, not `offsetTop`. `offsetTop` is measured from `offsetParent`, and
      the nearest positioned ancestor here is the STICKY GRID ITEM, not this
      list — so it silently included the panel's padding and title, a constant
      error of about 60px that under-scrolled every jump and left the last
      entry of a long article just below the fold of its own list. Rect deltas
      have no such ambiguity: both are viewport-relative, so the difference is
      exactly the distance to move.
    */
    const itemRect = item.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();

    const above = itemRect.top - listRect.top;
    const below = itemRect.bottom - listRect.bottom;

    if (above < 0) list.scrollTop += above;
    else if (below > 0) list.scrollTop += below;
  }, [activeId]);

  /* Fewer than two headings tells the reader nothing and takes the space of
     something that would. */
  if (headings.length < 2) return null;

  const links = headings.map((text, i) => {
    const id = tocId(text, i);
    const isActive = id === activeId;

    return (
      <li key={id}>
        <a
          href={`#${id}`}
          aria-current={isActive ? 'true' : undefined}
          className={`block rounded-lg px-3 py-2 text-[13.5px] leading-[1.7] transition-colors ${
            isActive
              ? 'bg-surface-hover text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {text}
        </a>
      </li>
    );
  });

  return (
    <>
      {/*
        Desktop rail. NO `sticky` HERE. It used to be on this element and it never worked:
        the containing block is the grid item wrapping this component, and
        under the grid's `items-start` that box is exactly as tall as this
        panel, so there was nothing to travel through. The class now sits on
        the grid item in app/[slug]/page.tsx, where it resolves against the
        grid area and therefore against the length of the article.
      */}
      <nav
        aria-label="در این مطلب می‌خوانید"
        className="hidden rounded-card border border-border-subtle bg-surface-raised p-5 xl:block"
      >
        <p className="mb-3.5 text-[14px] font-semibold text-text-primary">
          در این مطلب می‌خوانید
        </p>

        {/*
          Capped with internal scroll, and now that the panel actually sticks
          this is load-bearing rather than defensive. A sticky box taller than
          the viewport pins to the WRONG edge — the browser has to choose, and
          it holds the top until the bottom is reached — so the last entries of
          a 41-minute read would sit permanently below the fold, unreachable
          for the whole article. The cap is what keeps the panel shorter than
          the viewport so the top edge is the one that sticks.

          16rem is the chrome around this list: the 76px offset below the
          header, the panel's own padding and title, the progress block, and
          breathing room at the bottom. Measured at 1440×900 — the tallest
          the panel gets is the viewport height minus this.
        */}
        <ul ref={listRef} className="max-h-[calc(100vh-16rem)] space-y-0.5 overflow-y-auto">
          {links}
        </ul>

        <div className="mt-4 border-t border-border-subtle pt-4">
          <p className="text-[12.5px] leading-[1.7] text-text-muted">
            پیشرفت مطالعه {toPersianDigits(progress)}٪
          </p>
          <div
            aria-hidden="true"
            className="mt-2 h-1 overflow-hidden rounded-full bg-surface-hover"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </nav>

      {/* Mobile: native disclosure, closed by default, no custom JS. */}
      <details className="rounded-card border border-border-subtle bg-surface-raised px-4 py-3 xl:hidden">
        <summary className="cursor-pointer list-none text-[14px] font-semibold text-text-primary">
          در این مطلب می‌خوانید
        </summary>
        <ul className="mt-3 max-h-[50vh] space-y-0.5 overflow-y-auto">{links}</ul>
      </details>
    </>
  );
}
