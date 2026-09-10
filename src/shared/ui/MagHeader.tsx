import Link from 'next/link';
import { SECTION_NAV, SITE_EXIT } from '@/features/mag/lib/nav';
import { magPath } from '@/features/mag/lib/site';
import { NEWSLETTER_ENABLED } from '@/features/mag/lib/newsletter';
import type { Market } from '@/features/mag/types/mag.types';
import { MagHeaderShell } from './MagHeaderShell';
import { MagLogo } from './MagLogo';
import { MobileNav } from './MobileNav';
import { MarketMenu } from './MarketMenu';
import { ThemeToggle } from './ThemeToggle';

/**
 * Magazine header — 80px, one flex row.
 *
 * Logo is the official lockup, INLINE SVG — still markup rather than a network
 * request on the LCP path, so it keeps the property the 9×24 accent-bar
 * placeholder was chosen for and cannot 400 the way a misconfigured
 * `next/image` src did on the first real deployment. See MagLogo.
 *
 * THE LOGO LINKS TO `/mag`, NOT TO THE MAIN SITE. It used to be the other way
 * round, on the reasoning that a reader arriving from search needs a route back
 * to thefinance.ir. That route is still needed and still here — it is the
 * `SITE_EXIT` link at the end of the row — but it was never the masthead's job.
 * Every publication's masthead links to that publication's home; that is what a
 * masthead is. A reader three articles deep could reach the main site and could
 * not reach `/mag` except through a breadcrumb.
 *
 * TWO TAXONOMIES, TWO TREATMENTS. Content types are flat links; markets are
 * behind a labelled disclosure. The row used to mix them — «طلا و ارز · بورس
 * ایران · کریپتو · آموزش · اخبار», three markets then two types, with nothing
 * to say they are different axes. See MarketMenu.
 *
 * STICKY ON MOBILE ONLY, and hiding on scroll down — see MagHeaderShell.
 *
 * The original note here said NOT STICKY, on two grounds. The first — a fixed
 * bar costs vertical space on mobile — is what hide-on-scroll-down answers:
 * the header costs its height on the way in and again only when the reader
 * asks for it. The second still stands and is why desktop is untouched: the
 * `top-[76px]` on every sticky sidebar is measured against this header being
 * static, and at `lg` and up it still is.
 *
 * THE MOBILE STRIP IS GONE. It carried three groups and was cut off mid-item
 * at 390px — the sideways scroll it existed to avoid. See MobileNav for why
 * the argument that chose it over a drawer expired rather than being wrong.
 *
 * The search field is a real GET form, so it works with JavaScript off and the
 * browser's own history does what the reader expects. `magPath` is mandatory:
 * Next does not apply `basePath` to a native form action, so a bare
 * `action="/search"` posts to the main site and silently leaves the magazine.
 */
export function MagHeader({ markets }: { markets: Market[] }) {
  /* Markets go to both consumers unfiltered. Suppressing the empty ones —
     «مسکن ۰» is a promise of nothing — is done inside MarketMenu and MobileNav,
     from the same rule, so the header does not hold a copy of it. */
  return (
    <MagHeaderShell>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-5 md:h-20 md:gap-9 lg:px-10">
        <Link
          href="/"
          /* min-h-11: the masthead is a control, so it gets a 44px target
             rather than the 26px the lockup's own height gives. */
          className="flex min-h-11 shrink-0 items-center text-text-primary"
        >
          {/* The lockup carries its own accessible name, so no text node and
              no `aria-label` on the link — either would double it. */}
          {/* 28px at 390, 30px above. The brand rules put the floor for the
              full lockup at 24px — below that the mark goes alone — so this
              keeps headroom over it rather than sitting on it. */}
          <MagLogo className="h-[28px] w-auto md:h-[30px]" />
        </Link>

        {/* Sections at lg and up, then the markets disclosure. Below lg all of
            it is behind the hamburger at the end of this row. */}
        <nav aria-label="بخش‌های مجله" className="hidden items-center gap-6 lg:flex">
          {SECTION_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              /*
                `inline-flex min-h-11 items-center`, and it is a TARGET-SIZE fix
                rather than a layout one. These links were bare inline text:
                measured 28.5×22.5, 41.5×22.5 and 37.1×22.5 at 1440, all under
                WCAG 2.2 SC 2.5.8's 24px floor and well under this project's own
                44px floor for controls. The row they sit in is already 44px
                tall, so the box grows into space that was there and dead — the
                links do not move, the gaps between them do not change, and
                nothing else on the row reflows.
              */
              className="inline-flex min-h-11 items-center whitespace-nowrap text-[15px] text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
          <MarketMenu markets={markets} />
        </nav>

        <span className="flex-1" />

        <form
          action={magPath('/search')}
          method="get"
          role="search"
          className="hidden h-11 items-center gap-2.5 rounded-full border border-border-subtle bg-surface-raised px-3.5 focus-within:border-border-interactive md:flex"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-text-muted"
          >
            <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.6 10.6L14 14" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <label htmlFor="mag-header-search" className="sr-only">
            جست‌وجو در مجله
          </label>
          <input
            id="mag-header-search"
            name="q"
            type="search"
            placeholder="جست‌وجو در مجله"
            /* `h-full`: the FORM is 44px but the input was 21, so the control
               the reader taps was under the floor while its container was not. */
            className="h-full w-[150px] min-w-0 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-muted lg:w-[190px]"
          />
        </form>

        {/* Mobile: the search page itself, at a 44px target. */}
        <Link
          href="/search"
          aria-label="جست‌وجو در مجله"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.6 10.6L14 14" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>

        {/* Between search and the newsletter CTA: a utility control, so it sits
            with the other utilities rather than competing with the one
            conversion target in the bar. Visible at every breakpoint — on
            mobile the category nav and the search field both collapse, and
            this is small enough to stay. */}
        <ThemeToggle />

        {/*
          Gated on the same flag as the card it points at. `#newsletter` is the
          id on that <section>, so with the section unrendered this button
          would scroll to nothing — a primary header action that visibly does
          nothing is worse than no button. See NewsletterCta.tsx for why the
          form is off and what has to be true before this comes back.

          An external `/mag#newsletter` — an old link, a previous send — still
          degrades correctly on its own: an unknown fragment is a no-op and the
          reader lands at the top of the page.

          WHEN IT RETURNS IT CANNOT BE `sm:inline-flex` AGAIN. With this button
          the header row needs 1136px and overflows from 1024 to 1135.
        */}
        {NEWSLETTER_ENABLED && (
          <a
            href="#newsletter"
            className="hidden h-[42px] shrink-0 items-center rounded-full bg-accent px-5 text-[14px] font-medium text-accent-contrast transition-[filter] hover:brightness-110 motion-reduce:transition-none sm:inline-flex"
          >
            عضویت در خبرنامه
          </a>
        )}

        {/*
          THE WAY OUT, and it is deliberately the quietest thing in the row.

          It leaves the magazine rather than moving within it, so it does not
          get section styling — `text-muted`, no hover colour change beyond
          `text-secondary`, and a border-inline-start hairline separating it
          from the magazine's own controls. An exit is not a destination the
          magazine is promoting.

          ONE LINK, NOT A PRODUCT MENU. InChart, Academy and Paradigm are in the
          footer; repeating them here would trade the magazine's navigation for
          a product list.

          The arrow points at the inline-end — «forward, out» — and is drawn
          with a `scale-x-[-1]` rather than a different glyph so the same mark
          serves both directions. `aria-hidden`, because the link's text already
          names the destination and the direction is decoration.
        */}
        <a
          href={SITE_EXIT.href}
          /* `lg:`, NOT `sm:`. The mobile strip carries its own exit, and the
             strip is `lg:hidden` — at `sm:` the two overlapped and the header
             rendered the link twice between 640 and 1023px. Measured before
             the fix: `exit=true` in the top row AND «خروج از مجله» in the strip
             at both 768 and 1023. The two breakpoints have to be the same one. */
          className="hidden min-h-11 shrink-0 items-center gap-1.5 border-border-subtle ps-4 text-[14px] text-text-muted transition-colors hover:text-text-secondary motion-reduce:transition-none lg:inline-flex lg:border-s"
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

        {/* Last in the row, and only below lg — the sections, the markets and
            the exit are all visible up there. */}
        <MobileNav markets={markets} />
      </div>

    </MagHeaderShell>
  );
}
