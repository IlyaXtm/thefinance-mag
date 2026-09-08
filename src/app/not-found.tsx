import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_NAV } from '@/features/mag/lib/nav';
import { magPath, MAG_NAME, SITE_ORIGIN } from '@/features/mag/lib/site';
import { Section } from '@/features/mag/components';

/**
 * 404.
 *
 * WHAT WAS HERE BEFORE: nothing. Next's built-in fallback — «404 This page
 * could not be found.» — in English, left to right, with no header, no footer
 * and no way onward, on a Persian right-to-left magazine.
 *
 * That is not a cosmetic gap, and the reason is the cutover. 89% of `/mag`
 * organic clicks land on URLs WordPress no longer has a post for. The redirect
 * map covers the nine that were measured; anything it misses — a URL nobody
 * checked, a slug changed after the export, a link from an old newsletter —
 * arrives here. This is the page that decides whether a reader from Google
 * bounces or stays.
 *
 * So its only real job is to route the reader onward, and the design follows
 * from that rather than from decorating the number 404.
 *
 * ── Deliberately static ─────────────────────────────────────────────────
 *
 * It fetches nothing. The root not-found is rendered at build time, so a
 * «latest articles» list here would be frozen at whatever was newest when the
 * image was built and would silently rot. The category links come from a
 * constant and the search form is a native GET, so both are correct forever
 * and neither can fail when the CMS is down — which is one of the moments a
 * reader is most likely to see this page.
 *
 * The header and footer come from the root layout, so the full site navigation
 * is already around this content and does not need repeating.
 *
 * ── No JSON-LD, and noindex ─────────────────────────────────────────────
 *
 * A 404 must not describe itself as an Article or a Blog. The status code is
 * the primary signal and Next sends a real 404 here; `robots: noindex` is the
 * belt to that braces, for the case where a crawler renders the body anyway.
 * `follow` stays on so the links out are still crawled — the point of the page.
 */

export const metadata: Metadata = {
  title: 'صفحه پیدا نشد',
  /*
    No canonical. A canonical on a 404 asks Google to consolidate a URL that
    should simply be dropped, and a self-referencing one on an infinite space
    of wrong URLs is worse than none.
  */
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main>
      <Section>
        {/* max-w-prose: the 700px reading column, the same measure the article
            body uses. `Section` has no `prose` width of its own because every
            other page that needs it is an article. */}
        <div className="max-w-prose">
          {/*
          The number is set in Latin digits and isolated. «۴۰۴» in Persian
          digits is not what anyone recognises as an HTTP status, and a bare
          Latin run inside an RTL paragraph reorders around neighbouring
          punctuation without the isolate.
        */}
          <p
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className="text-[13px] font-medium tracking-[0.14em] text-text-muted"
          >
            404
          </p>

          <h1 className="mt-3 text-[28px] font-bold leading-[1.5] text-text-primary md:text-[34px]">
            این صفحه پیدا نشد
          </h1>

          <p className="mt-4 text-[16px] font-light leading-[1.9] text-text-secondary md:text-[17px]">
            نشانی‌ای که دنبال می‌کردید در {MAG_NAME} وجود ندارد. ممکن است مطلب
            با نشانی تازه‌ای منتشر شده باشد یا نشانی به‌درستی کپی نشده باشد.
          </p>

          {/*
          A real GET form, like the header's: it works with JavaScript off and
          the browser's own history behaves as the reader expects. `magPath` is
          mandatory — Next does not apply basePath to a native form action, so
          a bare action="/search" posts to the main site and silently leaves
          the magazine.
        */}
          <form
            action={magPath('/search')}
            method="get"
            role="search"
            className="mt-8 flex flex-col gap-2.5 sm:flex-row"
          >
            <label htmlFor="not-found-search" className="sr-only">
              جست‌وجو در مجله
            </label>
            <input
              id="not-found-search"
              name="q"
              type="search"
              placeholder="موضوعی را جست‌وجو کنید"
              className="h-[46px] min-w-0 flex-1 rounded-full border border-border-interactive bg-surface-raised px-4 text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent"
            />
            <button
              type="submit"
              className="h-[46px] shrink-0 rounded-full bg-accent px-6 text-[14px] font-medium text-accent-contrast transition-[filter] hover:brightness-110 motion-reduce:transition-none"
            >
              جست‌وجو
            </button>
          </form>

          <nav aria-labelledby="not-found-sections" className="mt-10">
            <h2
              id="not-found-sections"
              className="text-[15px] font-semibold text-text-primary"
            >
              یا از این بخش‌ها شروع کنید
            </h2>

            <ul className="mt-4 flex flex-wrap gap-2.5">
              {CATEGORY_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    /* border-interactive, not border-subtle: these are controls,
                     and a clickable boundary needs 3:1 — see CLAUDE.md. */
                    className="inline-flex h-11 items-center rounded-full border border-border-interactive px-4 text-[14px] text-text-secondary transition-colors hover:border-accent hover:text-text-primary motion-reduce:transition-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-10 text-[14px] leading-[1.9] text-text-muted">
            <Link href="/" className="text-accent hover:underline">
              تازه‌ترین مطالب مجله
            </Link>
            <span aria-hidden="true"> · </span>
            {/* Absolute: the app runs under basePath, so a relative href would
              resolve inside the magazine instead of leaving it. */}
            <a href={SITE_ORIGIN} className="text-accent hover:underline">
              بازگشت به فایننس
            </a>
          </p>
        </div>
      </Section>
    </main>
  );
}
