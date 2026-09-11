import type { Metadata } from 'next';
import { NotFoundContent } from '@/features/mag/components/NotFoundContent';

/**
 * 404.
 *
 * WHAT WAS HERE BEFORE: nothing. Next's built-in fallback — «404 This page
 * could not be found.» — in English, left to right, with no header, no footer
 * and no way onward, on a Persian right-to-left magazine.
 *
 * That is not a cosmetic gap, and the reason is the cutover. 89% of `/mag`
 * organic clicks land on URLs WordPress no longer has a post for. The redirect
 * map covers the nine that were measured; anything it misses — a URL nobody
 * checked, a slug changed after the export, a link from an old newsletter —
 * arrives here. This is the page that decides whether a reader from Google
 * bounces or stays.
 *
 * So its only real job is to route the reader onward, and the design follows
 * from that rather than from decorating the number 404.
 *
 * ── THE BODY LIVES IN `NotFoundContent`, AND THIS RENDERS NOTHING ELSE ──
 *
 * Because it has a second caller now. `notFound()` thrown at REQUEST time —
 * which is every unknown article, author and market slug — never renders this
 * boundary into the initial HTML in Next 15.5: the document arrives as
 * `<body><div hidden></div></body>`, 58 bytes, and the page appears only after
 * hydration. Middleware rewrites those to `/not-found`, which renders the same
 * component. See `docs/decisions.md`.
 *
 * ── No JSON-LD, and noindex ─────────────────────────────────────────────
 *
 * A 404 must not describe itself as an Article or a Blog. The status code is
 * the primary signal and Next sends a real 404 here; `robots: noindex` is the
 * belt to that braces, for the case where a crawler renders the body anyway.
 * `follow` stays on so the links out are still crawled — the point of the page.
 */

export const metadata: Metadata = {
  title: 'صفحه پیدا نشد',
  /*
    No canonical. A canonical on a 404 asks Google to consolidate a URL that
    should simply be dropped, and a self-referencing one on an infinite space
    of wrong URLs is worse than none.
  */
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundContent />;
}
