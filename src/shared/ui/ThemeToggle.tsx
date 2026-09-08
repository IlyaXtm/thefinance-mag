'use client';

import { THEME_DARK, THEME_LIGHT, THEME_STORAGE_KEY } from '@/features/mag/lib/theme';

/**
 * Light/dark switch for the header.
 *
 * ── Why both states are in the DOM ──────────────────────────────────────
 *
 * The server cannot know which theme the reader picked — this route is
 * statically rendered and there is no cookie — so it always renders the dark
 * default. If the button chose its icon from React state, every reader on
 * light would get a hydration mismatch, or a mount-time flip from sun to moon.
 *
 * So BOTH the sun and the moon are rendered, and CSS in tokens.css shows the
 * one that matches the live `data-theme`. The markup is identical on the
 * server and the client, the correct icon is painted with the first frame, and
 * there is no `useEffect` in the component at all.
 *
 * The same trick carries the accessible name. Each state owns an `sr-only`
 * label, and the hidden one is `display:none`, so it is out of the
 * accessibility tree — the button's name is always the action it will perform,
 * never a stale one. That is why there is no `aria-label` here: an attribute
 * would have to be recomputed, which is the problem being avoided.
 *
 * ── Why it is not `aria-pressed` ────────────────────────────────────────
 *
 * A toggle button announces one label and a pressed state. This announces the
 * destination instead — «نمایش با زمینه‌ی روشن» — which is what a reader
 * actually wants to know, and it does not require the state to survive
 * hydration.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;

    root.setAttribute('data-theme', next);

    /* Throws, rather than failing quietly, when the browser blocks site data.
       A remembered theme is a convenience; losing it must not break the
       button that just worked. */
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* The choice holds for this page load and is simply not remembered. */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      /* h-11 w-11: a control, so it gets the 44px target rather than the
         ~18px the icon alone would give. The focus ring comes from the global
         :focus-visible rule and is offset clear of the rounded edge. */
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary motion-reduce:transition-none"
    >
      {/* Shown while a dark theme is active — the action is "go light". */}
      <span data-theme-when="dark">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 1.6v2.2M10 16.2v2.2M18.4 10h-2.2M3.8 10H1.6M15.94 4.06l-1.56 1.56M5.62 14.38l-1.56 1.56M15.94 15.94l-1.56-1.56M5.62 5.62L4.06 4.06"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="sr-only">نمایش با زمینه‌ی روشن</span>
      </span>

      {/* Shown while the light theme is active — the action is "go dark". */}
      <span data-theme-when="light">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M16.9 12.7A7.2 7.2 0 017.3 3.1a7.2 7.2 0 109.6 9.6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">نمایش با زمینه‌ی تیره</span>
      </span>
    </button>
  );
}
