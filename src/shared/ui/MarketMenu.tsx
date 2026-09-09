'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
 * ── A real disclosure ──────────────────────────────────────────────────
 *
 * Click or Enter to open, NOT hover — a hover menu is unreachable on touch, and
 * this row is the primary navigation on a site where most readers arrive from a
 * phone. Escape closes it and returns focus to the trigger, so a keyboard
 * reader is never left with focus inside a panel that is gone. A click outside
 * closes it. `aria-expanded` and `aria-controls` on the trigger, so the state is
 * announced rather than only drawn.
 *
 * NOT USED BELOW lg. At 390px the sections live in a horizontal scrolling
 * strip, and a dropdown anchored inside a scroller either clips at the
 * container's edge or scrolls away from its trigger. The strip lists the
 * markets as a labelled group instead — see MagHeader.
 */
export function MarketMenu({ markets }: { markets: Market[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const populated = markets.filter((market) => (market.count ?? 0) > 0);

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
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
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
          /* `end-0`, a logical property: the panel hangs from the trigger's
             inline-end, which is the left in RTL and the right in LTR without
             the component knowing which. */
          className="absolute end-0 top-full z-20 mt-1 min-w-[220px] rounded-card border border-border-subtle bg-surface-raised p-1.5 shadow-lg"
        >
          <ul>
            {populated.map((market) => (
              <li key={market.slug}>
                <Link
                  href={`/market/${market.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-between gap-4 rounded-lg px-3 text-[14.5px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary motion-reduce:transition-none"
                >
                  <span>{market.name}</span>
                  {/* Isolated: a Latin-shaped numeral at the end of a Persian
                      label reorders around the label's punctuation without it. */}
                  <span
                    dir="ltr"
                    style={{ unicodeBidi: 'isolate' }}
                    className="text-[12px] tabular-nums text-text-muted"
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
