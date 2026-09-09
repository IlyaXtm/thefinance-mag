import Link from 'next/link';
import { SECTION_NAV, SITE_EXIT } from '@/features/mag/lib/nav';
import { magPath } from '@/features/mag/lib/site';
import { NEWSLETTER_ENABLED } from '@/features/mag/lib/newsletter';
import type { Market } from '@/features/mag/types/mag.types';
import { toPersianDigits } from '@/features/mag/lib/format';
import { MagLogo } from './MagLogo';
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
 * NOT STICKY. A fixed bar costs vertical space on mobile and would compete
 * with the article page's sticky table of contents, which is the one thing on
 * the site that genuinely benefits from staying put. The `top-[76px]` on every
 * sticky sidebar is measured against this header NOT being fixed.
 *
 * The search field is a real GET form, so it works with JavaScript off and the
 * browser's own history does what the reader expects. `magPath` is mandatory:
 * Next does not apply `basePath` to a native form action, so a bare
 * `action="/search"` posts to the main site and silently leaves the magazine.
 */
export function MagHeader({ markets }: { markets: Market[] }) {
  /* Empty markets are suppressed everywhere they appear. «مسکن ۰» is not a
     thin promise, it is a promise of nothing — a link whose page renders its
     own empty state. It returns on its own when it has an article. */
  const populated = markets.filter((market) => (market.count ?? 0) > 0);

  return (
    <header className="border-b border-border-subtle">
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

        {/* Sections at lg and up, then the markets disclosure. Below lg both
            move to the scrollable strip under this row — see the note on it. */}
        <nav aria-label="بخش‌های مجله" className="hidden items-center gap-6 lg:flex">
          {SECTION_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-[15px] text-text-secondary transition-colors hover:text-text-primary"
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
          className="hidden h-[42px] items-center gap-2.5 rounded-full border border-border-subtle bg-surface-raised px-3.5 focus-within:border-border-interactive md:flex"
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
            className="w-[150px] min-w-0 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-muted lg:w-[190px]"
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
      </div>

      {/*
        MOBILE NAVIGATION.

        Below lg the header carried the logo, a search icon and the theme
        toggle, and nothing else. Every section was reachable only from the
        footer — roughly 4,000px of scroll down the home page. The reasoning
        recorded against a hamburger («with two links, a drawer costs a tap, a
        JS bundle, a focus trap and a motion-preference case, all to hide two
        words») was sound when there were two links. There are five now, and
        that argument does not carry.

        A STRIP, NOT A DRAWER — and the old note is the reason why. Every cost
        it lists is a cost of hiding things: the tap, the JS, the focus trap,
        the motion-preference case. A scrollable row pays none of them, because
        it hides nothing. It is markup and one CSS property.

        Horizontal scroll and RTL: NO manual scrollLeft arithmetic — its sign
        differs across browsers, which CLAUDE.md rules out. Native overflow
        handles direction correctly on its own. The edge fade is a mask-image
        rather than a coloured gradient so it works on any theme's surface
        without knowing which one it is on.
      */}
      <div className="border-b border-border-subtle lg:hidden">
        <div
          /* THE SCROLLER IS THE OUTER BOX, and all three groups sit inside it.
             With `overflow-x-auto` on the first <nav> only, the markets and the
             exit fell outside the scrolling area and either wrapped or pushed
             the page sideways. `w-max` on the row is what lets it exceed the
             viewport and scroll rather than compress. */
          className="mx-auto max-w-[1440px] overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage:
              'linear-gradient(to left, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to left, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)',
          }}
        >
          <div className="flex w-max items-center gap-1.5">
          <nav aria-label="بخش‌های مجله">
          {/*
            TWO GROUPS IN ONE ROW, EACH NAMED — the same distinction the desktop
            header draws with a dropdown, drawn here with a caption instead.

            NOT a dropdown. A menu anchored inside a horizontal scroller either
            clips at the container's edge or scrolls away from its own trigger,
            and at 390px it would cover the row it belongs to. The markets are
            simply listed, with their counts, as a labelled section of the strip.

            Two <nav> elements rather than one list with a heading inside it: a
            caption that is a list item is a list item a screen reader reads as
            content, whereas two labelled navs announce the axis the way the
            desktop header's «بازارها» button does.
          */}
            <ul className="flex items-center gap-1.5 py-2">
            {SECTION_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  /* h-11: a control, so it takes the 44px target. */
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-full px-3.5 text-[14px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary motion-reduce:transition-none"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {populated.length > 0 && (
          <nav
            aria-label="بازارها"
            className="flex shrink-0 items-center gap-1.5 py-2"
          >
            <span
              aria-hidden="true"
              className="h-5 w-px shrink-0 bg-border-subtle"
            />
            {/* The caption names the axis. `aria-hidden` because the nav's own
                label already says «بازارها» to a screen reader, and reading it
                twice is noise. */}
            <span
              aria-hidden="true"
              className="shrink-0 whitespace-nowrap ps-1 text-[12px] text-text-muted"
            >
              بازارها
            </span>
            <ul className="flex w-max items-center gap-1.5">
              {populated.map((market) => (
                <li key={market.slug}>
                  <Link
                    href={`/market/${market.slug}`}
                    className="inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[14px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary motion-reduce:transition-none"
                  >
                    {market.name}
                    <span
                      dir="ltr"
                      style={{ unicodeBidi: 'isolate' }}
                      className="text-[11.5px] tabular-nums text-text-muted"
                    >
                      {toPersianDigits(market.count ?? 0)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* The exit, last in the strip. The mobile header had no route to the
            main site at all — the desktop one is `sm:inline-flex` and this is
            the only place below that breakpoint. */}
        <nav aria-label="خروج از مجله" className="flex shrink-0 items-center py-2">
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border-subtle" />
          <a
            href={SITE_EXIT.href}
            className="inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[14px] text-text-muted"
          >
            {SITE_EXIT.label}
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
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
        </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
