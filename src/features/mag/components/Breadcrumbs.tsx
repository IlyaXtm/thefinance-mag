import Link from 'next/link';
import { bidiTitle } from '../lib/bidi-title';

export type Crumb = { name: string; href: string };

/**
 * Breadcrumbs.
 *
 * The chevron points LEFT because in RTL that is the forward reading
 * direction. This is the single most common RTL bug — a chevron copied from an
 * LTR design points the wrong way and nobody notices until a Persian reader
 * says the trail feels backwards.
 *
 * The last item is `aria-current="page"` and is not a link: linking to the page
 * you are on is a wasted tab stop.
 *
 * Whatever renders here must match the BreadcrumbList JSON-LD exactly.
 * Structured breadcrumbs that disagree with the visible ones is a mismatch
 * Google flags.
 *
 * ── One line on mobile, scrolling ───────────────────────────────────────
 *
 * It used to wrap: «مجله فایننس ‹ اخبار ‹ [full article title]» took two lines
 * on a phone, so two lines of navigation sat above the headline on the screen
 * where vertical space is scarcest.
 *
 * THE TRAIL IS NOT SHORTENED TO ACHIEVE THAT. No level is dropped and nothing
 * is replaced with an ellipsis — a breadcrumb is the reader's only sense of
 * where they are, and a trail with a hole in it answers a different question
 * than the one they asked. It goes on one line and scrolls.
 *
 * Which means it needs the same treatment `eba3f20` gave wide content: its own
 * `overflow-x`, so the BREADCRUMB scrolls and the page does not. A scrolling
 * element beside a page that must not scroll is exactly the case that produced
 * the last overflow bug, so `check-invariants.mjs` asserts this one by
 * structure.
 *
 * The overflowing edge is FADED rather than cut, so it reads as scrollable
 * rather than as broken. Two rules, one per direction: a mask gradient has no
 * logical form, and a symmetric fade would dim the first crumb at rest even
 * when nothing overflows.
 *
 * Desktop keeps the wrapping trail. There is room for it there, and the fade
 * plus a scroll region would be chrome for a problem that does not exist.
 *
 * ── The target size here is 24px, not 44, and that is unresolved ────────
 *
 * The crumb links measured 21px tall. They are now 24, which clears WCAG 2.2
 * SC 2.5.8 (Target Size Minimum) outright and leaves the trail on one line.
 *
 * MAG'S OWN FLOOR SAYS 44px FOR CONTROLS, and this does not meet it. Reaching
 * 44 would make the trail 44px tall, which is more than the two wrapped lines
 * this change removed — the fix would cost more vertical space than the defect
 * did. WCAG exempts links inline in a sentence from target sizing and a
 * breadcrumb is arguably that, but "arguably" is not a decision. Flagged for
 * the reviewer rather than settled here.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="مسیر" className="mag-breadcrumb-scroll text-meta text-text-muted">
      <ol className="flex w-max flex-nowrap items-center gap-1.5 lg:w-auto lg:flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {isLast ? (
                <span
                  aria-current="page"
                  /* `whitespace-nowrap` below lg so the title stays on the
                     scrolling line intact; the desktop clamp keeps a long
                     title from taking a second wrapped row. */
                  className="inline-block whitespace-nowrap leading-6 text-text-secondary lg:line-clamp-1 lg:whitespace-normal"
                >
                  {bidiTitle(item.name)}
                </span>
              ) : (
                <Link
                  href={item.href}
                  /* 24px, not 44 — see the note above the component.
                     `inline-block` with `leading-6`, NOT `inline-flex`. Flex
                     makes every child a flex item and DROPS whitespace-only
                     text nodes, and `bidiTitle` returns exactly that shape:
                     text, an isolate <span>, text. The first version used
                     inline-flex and the trail rendered
                     «نات کوین(Notcoin)چیست؟» — the spaces around the Latin run
                     gone. A 24px line box gets the same height with the text
                     nodes intact. */
                  className="inline-block whitespace-nowrap leading-6 transition-colors hover:text-text-primary"
                >
                  {bidiTitle(item.name)}
                </Link>
              )}

              {!isLast && (
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0 opacity-60"
                >
                  {/* Points left — forward in RTL. */}
                  <path
                    d="M10 3.5 5.5 8l4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
