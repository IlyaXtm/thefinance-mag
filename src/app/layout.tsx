import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { getMarkets } from '@/features/mag/api/v1/mag.service';
import { feedAlternate, SITE_ORIGIN } from '@/features/mag/lib/site';
import { MagFooter, MagHeader } from '@/shared/ui';
import { THEME_DARK, THEME_INIT_SCRIPT } from '@/features/mag/lib/theme';
import '@/styles/globals.css';

/**
 * IRANYekanX — variable font, self-hosted.
 *
 * ONE file covers weights 100–1000 (93 KB). Loading separate static weights
 * would cost several times that for the same result.
 *
 * Self-hosted deliberately, never a CDN: this sits on the LCP path and
 * Google-hosted and Cloudflare-fronted assets are intermittently unreachable
 * from Iran. next/font/local also inlines the @font-face and preloads it, so
 * there is no extra round trip to discover the file.
 *
 * Verified coverage: Persian letters, Persian digits ۰–۹, Arabic-Indic digits,
 * Latin letters and digits, ZWNJ (U+200C), and Persian punctuation. ZWNJ
 * matters most — «می‌شود» and «سرمایه‌گذاری» break visibly if the font falls
 * back mid-word.
 *
 * The font's own default weight is 100 (thin). Body copy therefore sets 400
 * explicitly in globals.css; without it, Persian text renders anaemic.
 *
 * BLOG v4 BRIEFLY SWITCHED THIS TO VAZIRMATN, AND THAT WAS REVERTED. The v4
 * handoff named Vazirmatn, and the two vendored subsets did work. But the
 * typeface is not the magazine's to choose: IRANYekanX is the design system's
 * face across the whole product, and changing it in Mag alone reproduces the
 * exact visual detachment this project exists to remove — the same reason
 * headless was chosen over Elementor. A face change is a product-wide decision.
 * See docs/changelog.md, 2026-08-29.
 */
const iranYekan = localFont({
  src: './fonts/IRANYekanX.woff2',
  weight: '100 1000',
  style: 'normal',
  display: 'swap',
  preload: true,
  variable: '--font-fa',
  /*
    Fallback metrics are adjusted automatically by next/font to reduce the
    layout shift when the webfont swaps in — this is what keeps CLS low while
    still using `swap` rather than blocking render.
  */
  adjustFontFallback: false,
  fallback: ['Tahoma', 'system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: 'مجله فایننس',
    template: '%s | مجله فایننس',
  },
  description: 'تحلیل، گزارش و آموزش برای بازارهای مالی',
  /*
    Feed autodiscovery. This is how a reader offered the site's URL finds the
    feed without being told where it is — and how the existing WordPress
    subscriptions keep resolving after the cutover.
  */
  alternates: { types: feedAlternate() },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /*
    Markets are fetched here so the footer can link every populated archive on
    every page. On a thirty-page site that footer is how a crawler reaches
    pages that are otherwise several clicks deep.

    A failure must not take the whole site down — the footer degrades to no
    market column rather than throwing.
  */
  const markets = await getMarkets().catch(() => []);

  return (
    /*
      dir and lang live here, not per page. RTL is the base direction for this
      product, not a mode layered on an LTR default.
    */
    <html
      lang="fa"
      dir="rtl"
      /*
        The DARK DEFAULT, always — this route is statically rendered and cached,
        so the server has no way to know what the reader chose. THEME_INIT_SCRIPT
        below corrects it before the first paint when they chose light.

        suppressHydrationWarning is required and is scoped to this one element:
        by the time React hydrates, that script may already have changed
        `data-theme`, and React would otherwise warn about an attribute it did
        not render. It suppresses the warning for attributes on <html> only —
        nothing inside it.
      */
      data-theme={THEME_DARK}
      suppressHydrationWarning
      className={iranYekan.variable}
    >
      <head>
        {/*
          Blocking, and first. A reader on light would otherwise see a dark
          flash on every navigation while waiting for hydration. Inline because
          an external file is a round trip before paint; allowed by the CSP,
          which already carries 'unsafe-inline' for Next's own bootstrap.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* flex column + mt-auto on the footer keeps it at the bottom on short
          pages without a fixed height or a viewport calculation. */}
      <body className="flex min-h-screen flex-col">
        <MagHeader />
        <div className="flex-1">{children}</div>
        <MagFooter markets={markets} />
      </body>
    </html>
  );
}
