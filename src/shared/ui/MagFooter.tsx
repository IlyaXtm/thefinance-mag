import Link from 'next/link';
import {
  CATEGORY_NAV,
  FOOTER_MAG_LINKS,
  FOOTER_PRODUCT_LINKS,
  SOCIAL_LINKS,
} from '@/features/mag/lib/nav';
import { DISCLAIMER_TEXT } from '@/features/mag/types/mag-blocks.types';
import { MAG_DESCRIPTION, MAG_NAME, ORGANIZATION, SITE_ORIGIN } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';
import type { Market } from '@/features/mag/types/mag.types';

/**
 * Footer — `1.4fr` brand column plus three link columns, then a bottom bar.
 *
 * Carries more than the header on purpose. With roughly thirty pages this is
 * how a crawler reaches market archives that are otherwise three clicks deep,
 * and internal linking is the main lever for topical authority on a site this
 * small.
 *
 * THE DISCLAIMER IS NOT DECORATION. It is the same fixed string the article
 * body block uses, and it is not editor-editable: signal-selling is prohibited
 * under Iranian securities law, so this is legal protection rather than brand
 * voice. It appears here on every page and again on the post page.
 */
export function MagFooter({ markets }: { markets: Market[] }) {
  const populated = markets.filter((market) => (market.count ?? 0) > 0);
  const year = toPersianDigits(1405);

  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface-raised">
      <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="h-6 w-[9px] rounded-sm bg-accent" />
              <span className="text-[18px] font-bold text-text-primary">{MAG_NAME}</span>
            </div>
            <p className="mt-4 max-w-[46ch] text-[14px] font-light leading-[1.85] text-text-secondary">
              {MAG_DESCRIPTION}
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

          <FooterColumn title="دسته‌بندی‌ها">
            {(populated.length > 0
              ? populated.map((market) => ({
                  label: market.name,
                  href: `/market/${market.slug}`,
                }))
              : CATEGORY_NAV
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
            <FooterLink href="/feed">خوراک RSS</FooterLink>
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
            {DISCLAIMER_TEXT}
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
