import Link from 'next/link';
import { CATEGORY_NAV } from '@/features/mag/lib/nav';
import { magPath, MAG_NAME, SITE_ORIGIN } from '@/features/mag/lib/site';
import { ThemeToggle } from './ThemeToggle';

/**
 * Magazine header — 80px, one flex row.
 *
 * Logo mark is a 9×24 accent bar, not an image: it is two DOM nodes instead of
 * a network request on the LCP path, and it cannot 400 the way a misconfigured
 * `next/image` src did on the first real deployment.
 *
 * The logo links to the MAIN SITE, which is the one thing this header must do.
 * A reader arrives from search, finishes an article, and needs a route back to
 * thefinance.ir — without it the magazine is a dead end.
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
export function MagHeader() {
  return (
    <header className="border-b border-border-subtle">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-5 md:h-20 md:gap-9 lg:px-10">
        <a
          href={SITE_ORIGIN}
          /* min-h-11: this is the route back to the main site, so it is a control
             and gets a 44px target rather than the 26px the text alone gives. */
          className="flex min-h-11 shrink-0 items-center gap-2.5 text-text-primary"
        >
          <span aria-hidden="true" className="h-6 w-[9px] rounded-sm bg-accent" />
          <span className="text-[17px] font-bold md:text-[18px]">{MAG_NAME}</span>
        </a>

        {/* The five category links. Hidden below lg — the design collapses the
            header to logo + search there, and these are continuations rather
            than escapes, so nobody is stranded without them. */}
        <nav aria-label="دسته‌بندی‌ها" className="hidden items-center gap-6 lg:flex">
          {CATEGORY_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-[15px] text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
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

        <a
          href="#newsletter"
          className="hidden h-[42px] shrink-0 items-center rounded-full bg-accent px-5 text-[14px] font-medium text-accent-contrast transition-[filter] hover:brightness-110 motion-reduce:transition-none sm:inline-flex"
        >
          عضویت در خبرنامه
        </a>
      </div>
    </header>
  );
}
