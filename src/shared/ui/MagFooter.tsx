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
      {/*
        THE GAP BEFORE THE FOOTER LIVES HERE, AND ONLY HERE.

        It used to be the sum of two paddings: every page's <main> carried
        `pb-20 lg:pb-24` and this carried `py-12 lg:py-16`, so the void between
        the last content row and the footer's first line measured 96 + 64 = 160
        at desktop and 80 + 48 = 128 at mobile. The page's own section rhythm is
        96 / 60 (CLAUDE.md), and the sections on the home page measure 112, 64
        and 88, 56 — so the run-out to the footer was between 1.4× and 2.5× any
        real gap on the page, which is why it reads as the page having ended.

        Collapsed rather than trimmed: the four `<main>` elements lost their
        bottom padding entirely and this top padding is now the whole gap, set
        to the section rhythm. Subtracting a number from one side would have
        left two paddings that only add up correctly by coincidence, and the
        next person to change either one would not know that.

        The BOTTOM padding is unchanged — that one is the footer's own internal
        breathing room above the page edge, not a gap between two things.
      */}
      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-[60px] lg:px-10 lg:pb-16 lg:pt-24">
        {/*
          TWO COLUMNS ON A PHONE, NOT ONE.

          Reported from a device as "footer too long on mobile", and it was:
          one column meant the brand block, then three link groups stacked end
          to end, then the disclaimer, then the legal row — a screen and a half
          of footer under every article.

          The three link groups are short (4–6 items each) and narrow, so two
          of them fit side by side at 320px with room to spare. The brand block
          keeps the full width — its description is a paragraph and halving its
          measure would set it in a column two words wide.

          A `<details>` accordion per group was the other option and is worse
          here: it hides four links behind a tap to save a few hundred pixels
          in the one part of the page a reader reaches by choice, and it puts
          three more disclosures on a page that already has one.
        */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 md:gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
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
            {/*
              HIDDEN BELOW md, AND IT IS THE ONLY THING HERE THAT IS.

              The footer measured 1046px at 390 — a screen and a quarter under
              every article — and this paragraph is 125px of it. It is also the
              second long boilerplate paragraph in the same footer: the site
              disclaimer sits below the link groups and is COMPLIANCE COPY
              under Iranian securities law, so if one of the two goes on a
              phone it is not that one.

              The note above already says two stacked descriptions are "the
              wall of text the review warned about" at desktop width. On a
              350px column they stack five lines and four lines deep, which is
              the same objection with less room to absorb it.

              It stays at md and up, where there is a column to put it in and
              it reads as the boilerplate it is rather than as a wall.
            */}
            <p className="mt-4 hidden max-w-[52ch] text-[13px] font-light leading-[1.9] text-text-muted md:block">
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

          <FooterColumn title="فایننس" wide>
            {FOOTER_PRODUCT_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href} external>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-8 border-t border-border-subtle pt-6 lg:mt-12 lg:pt-8">
          <p className="max-w-[92ch] text-[13px] font-light leading-[1.85] text-text-muted">
            {SITE_DISCLAIMER_TEXT}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-text-muted">
            <span>
              © {year} {ORGANIZATION.name}
            </span>
            <span aria-hidden="true">·</span>
            {/* `min-h-6` clears WCAG 2.2 SC 2.5.8's 24px on the two links in
                the legal row, which measured 20. The rest of the footer's
                links already carry `min-h-11`; these sit inline in a sentence
                with the copyright, where a 44px box would break the line. */}
            <a
              href={SITE_ORIGIN}
              className="inline-flex min-h-6 items-center transition-colors hover:text-text-primary"
            >
              thefinance.ir
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://paradigm.thefinance.ir"
              dir="ltr"
              rel="noopener noreferrer"
              target="_blank"
              className="inline-flex min-h-6 items-center transition-colors hover:text-text-primary"
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

/**
 * `wide` is for the LAST column, and it exists because three groups do not
 * divide into two columns.
 *
 * At mobile the grid is two columns, so the third group used to land alone on
 * a row with the other half of that row empty — about 500px of blank beside
 * four links, in the footer that was just reported as too long. Spanning both
 * columns and putting its own links two-up uses the space instead of leaving
 * it, and turns four stacked rows into two.
 *
 * At `lg` the footer is four real columns and this is an ordinary one again.
 */
function FooterColumn({
  title,
  wide = false,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? 'col-span-2 lg:col-span-1' : undefined}>
      <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
      <ul className={`mt-3 grid ${wide ? 'grid-cols-2 lg:grid-cols-1' : 'grid-cols-1'}`}>
        {children}
      </ul>
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
