import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { getMarkets } from '@/features/mag/api/v1/mag.service';
import { feedAlternate, SITE_ORIGIN } from '@/features/mag/lib/site';
import { MagFooter, MagHeader } from '@/shared/ui';
import '@/styles/globals.css';

/**
 * Vazirmatn — self-hosted, two subsets, variable.
 *
 * The v4 design specifies Vazirmatn with IRANYekanX as fallback. It is loaded
 * from vendored woff2 rather than Google Fonts: CLAUDE.md rules out foreign
 * CDNs on the LCP path, and Google-hosted assets are unreachable from Iran.
 * The design's own asset note asks for the same thing.
 *
 * TWO FILES, because one subset does not cover Persian typography. Verified by
 * reading the cmap rather than assuming:
 *
 *   arabic (45 KB, 366 glyphs) — Persian letters, Persian digits ۰–۹, ZWNJ,
 *                                «،» and «؟». Missing the guillemets « ».
 *   latin  (34 KB, 229 glyphs) — Latin, Latin digits, and the guillemets.
 *
 * Persian body copy uses « » constantly, so both are needed and the browser
 * falls through per glyph. Only the Arabic face is preloaded: it carries the
 * script the page is actually written in, and preloading both would put two
 * fonts on the LCP path to serve a handful of Latin runs.
 *
 * One variable axis, wght 100–900, covers the 300/400/500/600/700/800 the
 * design uses — where IRANYekanX needed a separate file per weight.
 *
 * Vazirmatn is SIL OFL 1.1. IRANYekanX stays in the stack as the design's
 * named fallback and for anything neither subset covers.
 */
const vazirmatn = localFont({
  src: './fonts/Vazirmatn-arabic.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: true,
  variable: '--font-fa',
  adjustFontFallback: false,
  fallback: ['IRANYekanX', 'Tahoma', 'system-ui', 'sans-serif'],
});

const vazirmatnLatin = localFont({
  src: './fonts/Vazirmatn-latin.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  /* Not preloaded — see above. */
  preload: false,
  variable: '--font-latin',
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
    <html lang="fa" dir="rtl" data-theme="v1" className={`${vazirmatn.variable} ${vazirmatnLatin.variable}`}>
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
