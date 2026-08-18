import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "مگ فایننس",
  description: "تحلیل، گزارش و آموزش برای بازارهای مالی",
  robots: {
    index: false,
    follow: false,
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <header className="site-header">
          <a className="brand" href="https://thefinance.ir/" aria-label="صفحه اصلی فایننس">
            <span className="brand-mark" aria-hidden="true">F</span>
            <span>فایننس</span>
          </a>
          <nav className="site-nav" aria-label="ناوبری اصلی">
            <a href="https://thefinance.ir/">بازارها</a>
            <a href="/mag/" aria-current="page">مگ</a>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <p>فایننس؛ داده و توضیح برای تصمیم‌های مالی آگاهانه‌تر.</p>
          <a href="https://thefinance.ir/">بازگشت به فایننس</a>
        </footer>
      </body>
    </html>
  );
}
