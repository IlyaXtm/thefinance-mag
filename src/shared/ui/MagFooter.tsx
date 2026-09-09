import Link from 'next/link';
import { MagLogo } from './MagLogo';
import {
  SECTION_NAV,
  FOOTER_MAG_LINKS,
  FOOTER_PRODUCT_LINKS,
  SOCIAL_LINKS,
} from '@/features/mag/lib/nav';
import { SITE_DISCLAIMER_TEXT } from '@/features/mag/types/mag-blocks.types';
import {
  ORGANIZATION,
  ORGANIZATION_DESCRIPTION,
  SITE_ORIGIN,
} from '@/features/mag/lib/site';
import { currentJalaliYear } from '@/features/mag/lib/format';
import type { Market } from '@/features/mag/types/mag.types';

/**
 * Footer — `1.4fr` brand column plus three link columns, then a bottom bar.
 *
 * Carries more than the header on purpose. With roughly thirty pages this is
 * how a crawler reaches market archives that are otherwise three clicks deep,
 * and internal linking is the main lever for topical authority on a site this
 * small.
 *
 * THE DISCLAIMER IS NOT DECORATION. It is the site-wide form of the string the
 * article
 * body block uses, and it is not editor-editable: signal-selling is prohibited
 * under Iranian securities law, so this is legal protection rather than brand
 * voice. It appears here on every page and again on the post page.
 */
export function MagFooter({ markets }: { markets: Market[] }) {
  const populated = markets.filter((market) => (market.count ?? 0) > 0);
  /* Was `toPersianDigits(1405)`, which rendered «۱٬۴۰۵» — a thousands
     separator inside a year — and was a literal that would have gone stale in
     Farvardin regardless. Both halves fixed at once; see lib/format.ts. */
  const year = currentJalaliYear();

  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface-raised">
      <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center text-text-primary">
              <MagLogo className="h-[32px] w-auto" />
            </div>
            {/*
              WHAT فایننس IS, replacing the magazine's one-line tagline rather
              than sitting above it — two descriptions stacked in a footer
              column is the wall of text the review warned about.

              13px and `text-muted`, a step down from the 14px `text-secondary`
              the tagline used. It is five times longer, so at the old size it
              would have out-weighed the three link columns beside it and made
              the brand column the loudest thing in the footer. Smaller and
              quieter, it reads as the boilerplate it is.

              46ch → 52ch: at 46 characters this sets seven lines on desktop
              and towers over the columns; 52 brings it to five.
            */}
            <p className="mt-4 max-w-[52ch] text-[13px] font-light leading-[1.9] text-text-muted">
              {ORGANIZATION_DESCRIPTION}
            </p>

            {SOCIAL_LINKS.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="inline-flex min-h-11 items-center rounded-full border border-border-interactive px-4 text-[13px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/*
            «بازارها», not «دسته‌بندی‌ها» — THIS COLUMN LISTS MARKETS.

            Same mislabel the review found on the home sidebar: the heading
            named one taxonomy and the list showed the other. It is not in the
            review's list, and it is corrected anyway: the header now draws the
            two axes apart explicitly, and a footer still calling markets
            «categories» contradicts the thing the header just taught.

            The title follows the content rather than being fixed, because the
            fallback is a different axis. With no market tagged, market links
            would be an empty column, so it falls back to the section links —
            and then it is not «بازارها» any more and does not say so.
          */}
          <FooterColumn title={populated.length > 0 ? 'بازارها' : 'بخش‌ها'}>
            {(populated.length > 0
              ? populated.map((market) => ({
                  label: market.name,
                  href: `/market/${market.slug}`,
                }))
              : SECTION_NAV
            ).map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="مجله">
            {FOOTER_MAG_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
            <FooterLink href="/news">اخبار</FooterLink>
            {/*
              «خبرخوان (RSS)», not «خوراک RSS». «خوراک» is the correct Persian
              term and is what publishing uses; the review did not recognise it,
              and a finance reader is not a publishing reader. «خبرخوان» is the
              word people actually use, with the Latin acronym in brackets for
              anyone scanning for it.

              The bracketed Latin run is isolated for the same reason article
              titles are — a bare `(RSS)` inside a Persian link reorders around
              its own brackets when the line wraps. See lib/bidi-title.tsx.
            */}
            <FooterLink href="/feed">
              خبرخوان{' '}
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                (RSS)
              </span>
            </FooterLink>
          </FooterColumn>

          <FooterColumn title="فایننس">
            {FOOTER_PRODUCT_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href} external>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-12 border-t border-border-subtle pt-8">
          <p className="max-w-[92ch] text-[13px] font-light leading-[1.85] text-text-muted">
            {SITE_DISCLAIMER_TEXT}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-text-muted">
            <span>
              © {year} {ORGANIZATION.name}
            </span>
            <span aria-hidden="true">·</span>
            <a href={SITE_ORIGIN} className="transition-colors hover:text-text-primary">
              thefinance.ir
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://paradigm.thefinance.ir"
              dir="ltr"
              rel="noopener noreferrer"
              target="_blank"
              className="transition-colors hover:text-text-primary"
              style={{ unicodeBidi: 'isolate' }}
            >
              Paradigm
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
      <ul className="mt-3 flex flex-col">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  external = false,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  /* inline-flex + min-h-11 keeps the footer's dense link columns at a 44px
     target without visibly loosening the 12px gap between them. */
  const className =
    'inline-flex min-h-11 items-center text-[14px] text-text-secondary transition-colors hover:text-text-primary';

  return (
    <li>
      {external ? (
        <a href={href} rel="noopener noreferrer" className={className}>
          {children}
        </a>
      ) : (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    </li>
  );
}
