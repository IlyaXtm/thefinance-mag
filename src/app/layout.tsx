import type { Metadata } from 'next';
import '@/styles/globals.css';

/**
 * Root layout.
 *
 * dir="rtl" and lang="fa" are set here, not per-page. RTL is the base
 * direction for this product, not a mode toggled on top of an LTR default.
 *
 * FONT — not yet wired.
 * The Persian face must be self-hosted and subset via next/font, preloaded,
 * with font-display: swap. No Google Fonts and no foreign CDN: Cloudflare and
 * Google-hosted assets are intermittently unreachable from Iran, and the font
 * sits on the LCP path.
 *
 * Once the redesign's face is confirmed:
 *   import localFont from 'next/font/local';
 *   const vazir = localFont({
 *     src: [{ path: './fonts/Vazirmatn-Regular.woff2', weight: '400' }, ...],
 *     display: 'swap',
 *     preload: true,
 *     variable: '--font-fa',
 *   });
 */

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://thefinance.ir'),
  title: {
    default: 'مگ فایننس',
    template: '%s | مگ فایننس',
  },
  description: 'تحلیل، گزارش و آموزش برای بازارهای مالی',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme="v1">
      <body>{children}</body>
    </html>
  );
}
