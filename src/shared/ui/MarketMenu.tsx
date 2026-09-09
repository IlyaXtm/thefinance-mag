'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { toPersianDigits } from '@/features/mag/lib/format';
import type { Market } from '@/features/mag/types/mag.types';

/**
 * The markets disclosure in the header.
 *
 * ── Why markets are behind a menu and content types are not ────────────
 *
 * The header used to read «طلا و ارز · بورس ایران · کریپتو · آموزش · اخبار» —
 * three markets and two content types in one row, two taxonomies with nothing
 * to tell a reader they are different axes. `decisions.md` keeps the two
 * deliberately separate, and the fix the review already accepted on the filter
 * chips was to NAME the axis rather than blur them. This is the same fix in the
 * header: content types stay flat links, markets go behind a label that says
 * what they are.
 *
 * ── THE COUNTS ARE THE POINT, NOT DECORATION ───────────────────────────
 *
 * The distribution is lopsided: کریپتو ۵ · فارکس ۳ · اقتصاد جهانی ۳ · بورس
 * ایران ۲ · طلا و دلار ۱ · مسکن ۰. Four of six hold fewer than three articles.
 * A menu where half the entries lead to a one-article page teaches a reader
 * that the menu is not worth using.
 *
 * So every market shows its count. «کریپتو ۵» sets an honest expectation before
 * the click, and a reader who picks «طلا و دلار ۱» knows what they are getting.
 *
 * HIDING THE THIN ONES WAS THE OTHER OPTION AND IS WORSE: the menu would change
 * shape as articles are tagged, so a reader who found فارکس last week finds it
 * missing this week with nothing to explain why. A stable menu with honest
 * numbers beats a shifting one with flattering ones.
 *
 * EMPTY IS DIFFERENT and is suppressed. «مسکن ۰» is not a thin promise, it is a
 * promise of nothing — a link to a page that renders its own empty state. It
 * appears on its own the moment it has an article, because the counts come from
 * the same live query the sitemap floor uses.
 *
 * ── A real disclosure, and hover ON POINTER DEVICES ONLY ───────────────
 *
 * The first version had no hover at all, and the reasoning was right about
 * touch: a hover-only menu is unreachable on a phone, and this is the primary
 * navigation on a site most readers arrive at from one. It was wrong about
 * desktop. A reviewer's first instinct was to hover, nothing happened, and it
 * read as broken — because hover IS the convention for a desktop nav menu.
 *
 * So both, gated on the capability rather than on a width:
 * `(hover: hover) and (pointer: fine)` is true for a mouse or trackpad and
 * false for touch, which is the actual distinction. A width breakpoint would
 * get a touchscreen laptop wrong in both directions.
 *
 * HOVER IS NEVER THE ONLY WAY IN. Click still opens on every device, and the
 * keyboard path is unchanged and authoritative: Enter opens, Escape closes and
 * returns focus to the trigger, so a keyboard reader is never left with focus
 * inside a panel that is gone. `aria-expanded` and `aria-controls` announce the
 * state rather than only drawing it.
 *
 * THE TWO DETAILS THAT MAKE HOVER MENUS FEEL BROKEN when they are missed, and
 * both are cheap:
 *
 *   A CLOSE DELAY. The panel sits 8px below the trigger, and a pointer moving
 *   between them crosses that gap. Closing on `mouseleave` immediately means
 *   the menu vanishes mid-reach — the single most common reason hover menus
 *   have a reputation for being fiddly.
 *
 *   THE PANEL KEEPS IT OPEN. Entering the panel cancels the pending close, so
 *   moving down the list does not race the timer. Without this the delay only
 *   moves the failure later instead of removing it.
 *
 * The timer is cleared on unmount and whenever a new intent arrives, so a fast
 * pointer cannot leave a close queued behind an open.
 *
 * NOT USED BELOW lg. At 390px the sections live in a horizontal scrolling
 * strip, and a dropdown anchored inside a scroller either clips at the
 * container's edge or scrolls away from its trigger. The strip lists the
 * markets as a labelled group instead — see MagHeader.
 */
/** Long enough to cross the gap, short enough not to feel stuck. */
const CLOSE_DELAY_MS = 180;

export function MarketMenu({ markets }: { markets: Market[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* See the click handler: this is what stops hover-then-click closing it. */
  const openedByHover = useRef(false);
  const panelId = useId();

  const populated = markets.filter((market) => (market.count ?? 0) > 0);

  const cancelClose = useCallback(() => {
    if (closeTimer.current === null) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  /* Capability, not width: a touchscreen laptop is wide AND coarse, and a
     width breakpoint gets it wrong in both directions. Read at event time
     rather than cached, so a device that changes input mode — a tablet with a
     keyboard attached — is answered as it is now. */
  const pointerHover = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const onPointerEnter = () => {
    if (!pointerHover()) return;
    cancelClose();
    openedByHover.current = true;
    setOpen(true);
  };

  const onPointerLeave = () => {
    if (!pointerHover()) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  /* A queued close must not outlive the component. */
  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      /* Focus goes back to the trigger, never nowhere. Without this the
         keyboard reader who pressed Escape is left with focus on a detached
         node and the next Tab starts from the top of the document. */
      triggerRef.current?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    /* `pointerdown`, not `click`: a click on a link inside the panel would
       otherwise close the panel before the navigation is dispatched in some
       browsers. pointerdown fires before focus moves and the containment check
       still holds. */
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (populated.length === 0) return null;

  return (
    /* The hover region covers the trigger AND the panel, so the 8px between
       them is inside the element the pointer never leaves. */
    <div className="relative" onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          cancelClose();

          /*
            HOVER-THEN-CLICK MUST NOT CLOSE IT, and a plain toggle does exactly
            that. On a mouse, reaching the trigger fires `pointerenter` and
            opens the panel BEFORE the click lands — so the click sees an open
            menu and shuts it. Measured: `click open` reported open=false,
            `click close` reported open=true, the whole interaction inverted.

            So the first click after a hover-open is absorbed: the menu is
            already showing what the reader was reaching for, and closing it is
            the one thing they cannot have meant. A second click closes it, as
            does Escape, a click outside, or the pointer leaving.
          */
          if (openedByHover.current && open) {
            openedByHover.current = false;
            return;
          }

          openedByHover.current = false;
          setOpen((value) => !value);
        }}
        className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-[15px] text-text-secondary transition-colors hover:text-text-primary motion-reduce:transition-none"
      >
        بازارها
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          /* Rotates, never flips: a chevron pointing DOWN means "opens
             downward" in both directions, so this is one of the few glyphs the
             RTL flip rule does not apply to. */
          className={`transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          /*
            THE SURFACE IS THE SIDEBAR CARD'S, which is the reference for every
            raised panel in this design: `rounded-card`, `border-border-subtle`,
            `bg-surface-raised`. The first version had the same three and still
            read as a stray box, for two reasons the reviewer's screenshot shows
            — it opened flush to the trigger with a 4px offset, so it looked
            like part of the header rather than something belonging to the item
            above it, and it had no elevation to lift it off the page.

            `mt-2` gives it a real offset. The shadow is a soft, large-radius
            one rather than `shadow-lg`'s tighter default: on the v1 navy and
            v2 dark themes a tight dark shadow is invisible against a dark page,
            so this leans on spread and a low alpha, which reads on all three.

            `end-0`, a logical property: the panel hangs from the trigger's
            inline-end — the left in RTL, the right in LTR — without the
            component knowing which.

            `min-w-[240px]`: «اقتصاد جهانی» is the longest label and needs the
            room, and a menu whose width changes with its contents reads as
            unstable. Measured at 1024, where the header row is tightest, the
            panel stays inside the viewport.
          */
          className="absolute end-0 top-full z-20 mt-2 min-w-[240px] rounded-card border border-border-subtle bg-surface-raised p-2"
          /* Inline, from a token. A Tailwind arbitrary `shadow-[…]` compiled to
             `rgba(0,0,0,0) 0px 0px 0px` here — no shadow at all — and it looked
             correct in the class list, which is why this was measured rather
             than eyeballed. The token also carries a value per theme, which an
             arbitrary literal could not. */
          style={{ boxShadow: 'var(--shadow-panel)' }}
        >
          <ul>
            {populated.map((market) => (
              <li key={market.slug}>
                <Link
                  href={`/market/${market.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-between gap-4 rounded-lg px-3.5 text-[14.5px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary motion-reduce:transition-none"
                >
                  <span>{market.name}</span>
                  {/*
                    The count is SECONDARY and now looks it: `text-muted` at
                    12px against the name's 14.5px `text-secondary`, so the name
                    does the work and the number qualifies it. It also sits
                    inside the row's padding rather than against the panel edge
                    — the reviewer's screenshot showed it hard up against the
                    border, which reads as a table column rather than an aside.

                    Isolated: a Latin-shaped numeral at the end of a Persian
                    label reorders around the label's punctuation without it.
                  */}
                  <span
                    dir="ltr"
                    style={{ unicodeBidi: 'isolate' }}
                    className="shrink-0 text-[12px] tabular-nums text-text-muted"
                  >
                    {toPersianDigits(market.count ?? 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
