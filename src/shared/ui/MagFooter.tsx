import Image from 'next/image';
import Link from 'next/link';
import type { Market } from '@/features/mag/types/mag.types';
import {
  FOOTER_MAG_LINKS,
  FOOTER_PRODUCT_LINKS,
  SOCIAL_LINKS,
} from '@/features/mag/lib/nav';
import { MAG_DESCRIPTION, SITE_ORIGIN } from '@/features/mag/lib/site';

/**
 * Magazine footer.
 *
 * Carries more links than the header deliberately. On a site of roughly thirty
 * pages, the footer is how a crawler reaches market archives and author pages
 * that are otherwise two or three clicks deep — and internal linking is the
 * main lever for topical authority at this scale.
 *
 * It is also where Paradigm and «درباره ما» live: present and findable, but not
 * pushed. Leading an editorial page with a paid subscription is what the
 * competitive category does and what the brand rules out.
 */
export function MagFooter({ markets = [] }: { markets?: Market[] }) {
  /* Same rule as everywhere else: a market with no articles is not linked.
     Sending a reader to an empty archive is the same failure as rendering an
     empty section, and it wastes crawl budget. */
  const populated = markets.filter((m) => (m.count ?? 0) > 0);

  const year = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    timeZone: 'Asia/Tehran',
  }).format(new Date());

  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface-raised">
      <div className="px-5 py-12 lg:px-[100px]">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href={SITE_ORIGIN} className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8" aria-hidden="true" />
              <span className="text-[17px] font-bold text-text-primary">فایننس</span>
            </a>
            <p className="mt-3 max-w-[34ch] text-[14px] leading-[1.9] text-text-secondary">
              {MAG_DESCRIPTION}
            </p>

            {SOCIAL_LINKS.length > 0 && (
              <ul className="mt-4 flex gap-2">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="inline-flex min-h-11 items-center rounded-full border border-border-interactive px-4 text-[13px] text-text-secondary transition-colors hover:bg-surface-hover"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {populated.length > 0 && (
            <nav aria-labelledby="footer-markets">
              <h2 id="footer-markets" className="text-[14px] font-semibold text-text-primary">
                بازارها
              </h2>
              <ul className="mt-3 space-y-2">
                {populated.map((market) => (
                  <li key={market.slug}>
                    <Link
                      href={`/market/${market.slug}`}
                      className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {market.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-labelledby="footer-mag">
            <h2 id="footer-mag" className="text-[14px] font-semibold text-text-primary">
              مجله
            </h2>
            <ul className="mt-3 space-y-2">
              {FOOTER_MAG_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-products">
            <h2 id="footer-products" className="text-[14px] font-semibold text-text-primary">
              فایننس
            </h2>
            <ul className="mt-3 space-y-2">
              {FOOTER_PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[14px] text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-border-subtle pt-6">
          {/*
            Standing disclaimer. Educational framing, no advice, no performance
            claim — signal-selling is prohibited by the brand book and by
            Iranian securities law, so this line is protection rather than
            decoration.
          */}
          <p className="max-w-prose text-[13px] leading-[1.9] text-text-muted">
            محتوای مجله فایننس جنبه آموزشی و اطلاع‌رسانی دارد و توصیه به خرید یا فروش نیست.
            مسئولیت هر تصمیم سرمایه‌گذاری بر عهده خود شماست.
          </p>
          <p className="mt-3 text-[13px] text-text-muted">© {year} فایننس</p>
        </div>
      </div>
    </footer>
  );
}
