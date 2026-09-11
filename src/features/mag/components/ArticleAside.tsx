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
 * That is also why the MOBILE progress rule is rendered from here rather than
 * from a component of its own: one measurement, one listener, no chance of the
 * two readouts disagreeing about how far in the reader is.
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

  /*
    PUBLISH THE MEASUREMENT; DO NOT RENDER IT TWICE.

    The mobile progress bar used to be a `fixed top-0` rule rendered from here,
    and its own note explained why it lived in this component: one
    implementation of the number, one scroll listener. That reasoning is
    unchanged — what changed is where the bar belongs. The header is sticky on
    mobile now and hides on scroll, so a separately-fixed bar stayed put while
    the header slid out from under it, and two fixed things at the top of a
    phone screen is one too many.

    So the bar moved to the header's bottom edge and the NUMBER stays here, on
    the document element. A custom property crosses the component boundary
    without a context, a store or a second listener, and it cannot drift the
    way a second measurement would.

    `data-reading` is a separate flag rather than testing the number, because
    0% is a real state — the reader is at the top of an article — and the bar
    has to exist there. It is the presence of an ARTICLE that the header needs
    to know about, and on a listing page the attribute is simply absent.
  */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-reading', '');
    root.style.setProperty('--reading-progress', `${progress}%`);

    return () => {
      root.removeAttribute('data-reading');
      root.style.removeProperty('--reading-progress');
    };
  }, [progress]);
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
          /* `min-h-11` and centred rather than `py-2`: at 13.5px on 1.7 the
             padded box came to 39px — close enough to look right and still
             under the floor, which is the shape of near-miss this pass was
             looking for. */
          className={`flex min-h-11 items-center rounded-lg px-3 text-[13.5px] leading-[1.7] transition-colors ${
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
        {/*
          THE PROGRESS READOUT MOVED UP HERE, AND THE BAR WITH IT.

          It used to sit below the list, behind a `border-t`: a 1px accent line
          under a divider, at the bottom of a panel. The review marked it as
          invisible, and the reason is placement rather than colour — anything
          drawn as a hairline at the foot of a bordered card reads as the card's
          bottom edge, not as data. Nobody looks for a number there.

          Beside the title it is a stat about the document the list describes,
          which is what it is. The bar sits directly under the heading row for
          the same reason: it now separates the header from the list, so its
          horizontal line is doing structural work instead of imitating one.

          NOT A FULL-WIDTH BAR PINNED ACROSS THE TOP OF THE VIEWPORT. That is
          the blog-template default, it competes with the header, and it is
          ruled out explicitly.

          The percentage is text and the bar is `aria-hidden`, so a screen
          reader gets the number once, not twice. Persian digits: it is a
          quantity, so `toPersianDigits` and its grouping are correct here —
          see lib/format.
        */}
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <p className="text-h6 font-semibold text-text-primary">در این مطلب می‌خوانید</p>
          <p className="shrink-0 text-[12px] font-medium tabular-nums text-text-secondary">
            {toPersianDigits(progress)}٪
          </p>
        </div>

        <div
          aria-hidden="true"
          /* 3px, not 1px, and `border-strong` for the track: at 1px on
             `surface-hover` the empty portion was indistinguishable from the
             card and the filled portion read as a rule. */
          className="mb-3.5 h-[3px] overflow-hidden rounded-full bg-border-strong"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/*
          Capped with internal scroll, and load-bearing rather than defensive.
          A sticky box taller than the viewport pins to the WRONG edge — the
          browser holds the top until the bottom is reached — so the last
          entries of a 41-minute read would sit permanently below the fold,
          unreachable for the whole article. The cap keeps the panel shorter
          than the viewport so the top edge is the one that sticks.

          THE BUDGET GREW WHEN «بیشتر در …» JOINED THE RAIL, and this number is
          the whole reason that panel is usable. The rail is now
          `ToC + 24 + onward` and the RAIL is what sticks, so the rail is what
          has to fit. Measured on the built page: the onward panel is 446px, the
          ToC's own chrome is 89, the sticky offset is 76 and the bottom needs
          24. So the list gets `100vh − 659`, which 41rem (656) rounds to.

          41rem, not 16, and the cost is real — measured entries visible before
          this list scrolls:

            viewport   at 16rem   at 41rem
              800        16          4
              900        19          7
             1169        26         15

          It is paid because the alternative is worse. Sticking only this panel
          and letting the onward card scroll past it puts a STATIC element
          behind a POSITIONED one: Tab lands on links hidden under the pinned
          contents — three stops on the 24-heading article, one on a
          seven-heading article, at every viewport height. Two of twelve
          articles. A list that scrolls is a list; a focus ring nobody can see
          is SC 2.4.11.

          The onward panel was cut from four items to three for this budget —
          446px to 366 — because at four an ordinary four-heading ToC started
          scrolling at a 1280×800 window, which is an everyday laptop. The lever
          in the other direction, if the contents are judged too short, is the
          same one: each item is roughly 80px.
        */}
        <ul ref={listRef} className="max-h-[calc(100vh-37rem)] space-y-0.5 overflow-y-auto">
          {links}
        </ul>
      </nav>

      {/* Mobile: native disclosure, closed by default, no custom JS. */}
      <details className="rounded-card border border-border-subtle bg-surface-raised px-4 py-3 xl:hidden">
        {/* `min-h-11`: the disclosure is the ONLY route to the table of
            contents below xl, and it measured 21px — under half the 44px floor
            and the smallest control on the article page. */}
        {/*
          THE CHEVRON IS THE AFFORDANCE, and it was missing.

          Reported from a device: nothing on this row says it opens. It is a
          <details>, so the browser normally draws its own marker — and
          `list-none` removes it, which was correct for the styling and left
          nothing in its place. A heading-looking row in a bordered box that
          silently happens to be a button is the whole of the complaint.

          Drawn from two borders, same as the FAQ block's, so the two
          disclosures on an article page behave identically and neither needs a
          font. `rotate(45deg)` closed points at the inline end — left in RTL,
          which is forward — and `-45deg` open points down. Those two values
          are direction-independent for "down" and direction-correct for
          "forward"; see the note in globals.css, where getting this wrong
          shipped a sideways chevron once already.
        */}
        <summary className="mag-toc-summary flex min-h-11 cursor-pointer list-none items-center gap-3 text-[14px] font-semibold text-text-primary">
          <span className="flex-1">در این مطلب می‌خوانید</span>
        </summary>
        <ul className="mt-3 max-h-[50vh] space-y-0.5 overflow-y-auto">{links}</ul>
      </details>
    </>
  );
}
