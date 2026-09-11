import Link from 'next/link';
import { SECTION_NAV } from '@/features/mag/lib/nav';
import { magPath, MAG_NAME, SITE_ORIGIN } from '@/features/mag/lib/site';
import { Section } from '@/features/mag/components';

/**
 * The 404 body, in one place because it now has two callers.
 *
 * `app/not-found.tsx` renders it for everything Next resolves to a not-found
 * boundary at BUILD time — `/mag/category/nope`, an unmatched path. The
 * `/not-found` route renders it for everything middleware rewrites there,
 * which is the case that was serving 58 bytes.
 *
 * Two copies of this markup would drift, and the drift would be invisible:
 * nobody looks at a 404 twice, and the two paths are reached by different
 * kinds of URL. So the body lives here and neither caller owns it.
 *
 * ── Deliberately static ─────────────────────────────────────────────────
 *
 * It fetches nothing. A «latest articles» list here would be frozen at build
 * time and would silently rot. The category links come from a constant and the
 * search form is a native GET, so both are correct forever and neither can
 * fail when the CMS is down — which is one of the moments a reader is most
 * likely to see this page.
 *
 * The header and footer come from the root layout, so the full site navigation
 * is already around this content and does not need repeating.
 */
export function NotFoundContent() {
  return (
    <main id="main-content" tabIndex={-1}>
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

          <h1 className="mt-3 text-h1 font-bold text-text-primary">
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
              /*
                `sm:flex-1`, NOT `flex-1`.
                The form is `flex-col` below `sm`, so on a phone the main axis
                is VERTICAL — and `flex-1` is `flex: 1 1 0%`, whose zero basis
                overrides `h-[46px]` on that axis. Measured at 390px: the input
                rendered 22px tall instead of 46, a squashed search box on the
                one page whose whole job is to offer a way out, and under both
                SC 2.5.8's 24px floor and this project's own 44px floor for
                controls. Growing to fill the row is only meaningful once the
                row exists, which is exactly what `sm:` says.
              */
              className="h-[46px] min-w-0 rounded-full border border-border-interactive bg-surface-raised px-4 text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent sm:flex-1"
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
              className="text-h5 font-semibold text-text-primary"
            >
              یا از این بخش‌ها شروع کنید
            </h2>

            <ul className="mt-4 flex flex-wrap gap-2.5">
              {SECTION_NAV.map((link) => (
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
