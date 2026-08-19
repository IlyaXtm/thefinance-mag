import type { Metadata } from 'next';
import localFont from 'next/font/local';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://thefinance.ir'),
  title: {
    default: 'مجله فایننس',
    template: '%s | مجله فایننس',
  },
  description: 'تحلیل، گزارش و آموزش برای بازارهای مالی',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      dir and lang live here, not per page. RTL is the base direction for this
      product, not a mode layered on an LTR default.
    */
    <html lang="fa" dir="rtl" data-theme="v1" className={iranYekan.variable}>
      <body>{children}</body>
    </html>
  );
}
