'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTION_NAV, SITE_EXIT } from '@/features/mag/lib/nav';
import { toPersianDigits } from '@/features/mag/lib/format';
import type { Market } from '@/features/mag/types/mag.types';

/**
 * Mobile navigation — a disclosure, replacing the horizontal strip.
 *
 * ── Why the strip lost its argument ─────────────────────────────────────
 *
 * The strip was chosen over a drawer deliberately, and the reasoning was
 * sound at the time: "with two links, a drawer costs a tap, a JS bundle, a
 * focus trap and a motion-preference case, all to hide two words." Every one
 * of those is a cost of HIDING things, and a scrollable row hid nothing.
 *
 * It hides things now. Sections, the markets group with its counts and the
 * exit to the main site all live in that row, and at 390px it is cut off
 * mid-item — the reviewer's screenshot shows it clipped mid-word. A menu that
 * is cut off communicates LESS than one that is honestly closed: the reader
 * cannot see what is there, cannot tell how much more there is, and the only
 * affordance is a sideways drag that phones make easy to miss.
 *
 * So the four costs get paid, in full, below. That is the trade — not the
 * strip's argument being wrong, but its premise expiring.
 *
 * ── One source of truth ─────────────────────────────────────────────────
 *
 * `SECTION_NAV`, the same `markets` prop the desktop row receives, and
 * `SITE_EXIT`. The panel does not carry its own list. A forked mobile nav is
 * how a section gets added in one place and not the other, and nobody notices
 * because nobody browses their own site on a phone.
 *
 * ── Touch, not hover ────────────────────────────────────────────────────
 *
 * Opens on click. `MarketMenu`'s `(hover: hover) and (pointer: fine)` gate
 * keeps hover behaviour for pointer devices, and this component is below `lg`
 * where that gate is false anyway. Nothing here opens on anything but a
 * deliberate press.
 */
export function MobileNav({ markets }: { markets: Market[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  /* Empty markets are suppressed everywhere they appear — «مسکن ۰» is a
     promise of nothing. Same filter as the desktop row, applied to the same
     data, so the two cannot disagree. */
  const populated = markets.filter((market) => (market.count ?? 0) > 0);

  /*
    A navigation that stays open after navigating is a navigation that has
    covered the page the reader just asked for. App Router keeps this
    component mounted across a client-side transition, so nothing closes it
    on its own.
  */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    /*
      SCROLL LOCK. Without it the page scrolls behind the panel under a
      touch-drag, so closing the menu drops the reader somewhere else in the
      article. The previous value is restored rather than assumed to be '' —
      something else may have set it.
    */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () =>
      [
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);

    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        /* Focus returns to the trigger, not to the document. Escaping a
           dialog and landing at the top of the page is how a keyboard reader
           loses their place. */
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab') return;

      /*
        FOCUS TRAP. The panel covers the page, so Tab must not reach the
        article behind it — a reader tabbing into content they cannot see is
        the standard failure of a hand-rolled overlay.
      */
      const items = focusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        /* A stable hook. The accessible name deliberately changes with state —
           the control says what pressing it does — which makes it useless as a
           selector for the checks. */
        data-mobile-nav=""
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'بستن منو' : 'منوی مجله'}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary motion-reduce:transition-none"
      >
        {/*
          Two bars, not three. The mark reads as a menu at any count and two
          keeps it from crowding a 44px target next to the search icon and the
          theme toggle. It swaps to a close cross when open, so the control
          always says what pressing it does.
        */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          {open ? (
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M3 6.5h14M3 13.5h14"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {/*
        THE PANEL IS ALWAYS IN THE DOM, hidden with `invisible` rather than
        unmounted. A panel that mounts on open cannot transition in — there is
        no previous frame to transition from — and mounting it also means the
        focus-trap effect races the first paint.

        `invisible` and not `hidden`: `display: none` removes it from the
        accessibility tree, which is what we want, and `visibility: hidden`
        does the same while still allowing a transition. The `pointer-events`
        and `invisible` pair means a closed panel cannot be tabbed into or
        clicked through.
      */}
      <div
        id={panelId}
        ref={panelRef}
        /*
          A LIGHT ANIMATION: 180ms, one curve, opacity and a short slide from
          the top. Nothing bouncing, nothing staggered, no per-item delay —
          the panel is navigation, and a reader who opened it wants to read it,
          not watch it arrive.

          `prefers-reduced-motion` is handled by the global rule in tokens.css,
          which sets `transition: none` on everything. That is the correct
          reduced-motion answer for a reveal: NO motion, not a faster version
          of the same motion. The panel simply is there.
        */
        className={[
          'fixed inset-x-0 top-[var(--mag-header-h)] z-50 max-h-[calc(100dvh-var(--mag-header-h))] overflow-y-auto',
          'border-b border-border-subtle bg-surface px-5 pb-6 pt-2',
          'transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none',
          open
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-2 opacity-0',
        ].join(' ')}
        style={{ boxShadow: 'var(--shadow-panel)' }}
      >
        <nav aria-label="بخش‌های مجله">
          <ul className="flex flex-col">
            {SECTION_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center py-1 text-h3 text-text-primary transition-colors hover:text-accent motion-reduce:transition-none"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {populated.length > 0 && (
          <nav aria-label="بازارها" className="mt-5 border-t border-border-subtle pt-4">
            {/*
              The axis is NAMED, exactly as the desktop row names it with the
              «بازارها» disclosure. `aria-hidden` on the caption because the
              nav's own label already says it and reading it twice is noise.
              One control, one taxonomy — merging the two axes into a single
              list is the defect this menu is not allowed to reintroduce.
            */}
            <span aria-hidden="true" className="text-meta text-text-muted">
              بازارها
            </span>
            <ul className="mt-1 flex flex-col">
              {populated.map((market) => (
                <li key={market.slug}>
                  <Link
                    href={`/market/${market.slug}`}
                    className="flex min-h-11 items-center gap-2 py-1 text-[15px] text-text-secondary transition-colors hover:text-text-primary motion-reduce:transition-none"
                  >
                    {market.name}
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
          </nav>
        )}

        {/* The exit, last and quietest — it leaves the magazine rather than
            moving within it, so it keeps the treatment the desktop row gives
            it rather than becoming a third section. */}
        <div className="mt-5 border-t border-border-subtle pt-4">
          <a
            href={SITE_EXIT.href}
            className="inline-flex min-h-11 items-center gap-1.5 text-[14px] text-text-muted"
          >
            {SITE_EXIT.label}
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
              className="scale-x-[-1]"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
