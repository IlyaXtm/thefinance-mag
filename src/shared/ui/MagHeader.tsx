import Image from 'next/image';
import Link from 'next/link';
import { HEADER_LINKS } from '@/features/mag/lib/nav';
import { SITE_ORIGIN } from '@/features/mag/lib/site';

/**
 * Magazine header.
 *
 * Lives in shared/ui rather than features/mag so that swapping in the
 * redesign's real site shell later is a single import change in layout.tsx,
 * not a hunt through the feature.
 *
 * THE ONE THING THIS MUST DO: give every page a visible route back to
 * thefinance.ir. Without it the magazine is a dead end — a reader arrives from
 * search, finishes an article, and has nowhere to go.
 *
 * The logo is that route. It links to the main site on every breakpoint, which
 * is why the product links can disappear on mobile without stranding anyone.
 *
 * NO HAMBURGER MENU. With two product links, a drawer is pure friction: an
 * extra tap, a JS bundle, a focus trap to get right, and an animation to
 * suppress under prefers-reduced-motion — all to hide two words.
 *
 * NOT STICKY. A fixed header costs vertical space on mobile and would compete
 * with the article page's sticky table of contents. Breadcrumbs at the top of
 * every article already carry the "where am I" job.
 */
export function MagHeader() {
  return (
    <header className="border-b border-border-subtle">
      <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-[100px]">
        {/* Reading-start side in RTL — where the eye lands first. */}
        <a
          href={SITE_ORIGIN}
          className="flex shrink-0 items-center gap-2.5"
          aria-label="فایننس — بازگشت به سایت اصلی"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
            /* Decorative: the accessible name comes from the link's aria-label,
               so alt is empty to avoid announcing it twice. */
            aria-hidden="true"
          />
          <span className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold text-text-primary">فایننس</span>
            <span className="text-[15px] text-text-muted">مجله</span>
          </span>
        </a>

        <nav aria-label="پیوندهای فایننس" className="flex items-center gap-1">
          {HEADER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              /* Hidden on mobile. The logo still returns to the main site, so
                 nobody is stranded — these are continuations, not escapes. */
              className="hidden min-h-11 items-center rounded-full px-3 text-[14px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary md:inline-flex"
            >
              {link.label}
            </a>
          ))}

          <Link
            href="/search"
            aria-label="جستجو در مجله"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="m13.5 13.5 3 3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}
