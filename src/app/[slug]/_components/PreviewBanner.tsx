import { magPath } from '@/features/mag/lib/site';

/**
 * Draft Mode banner.
 *
 * WHY IT IS NOT OPTIONAL. Draft Mode is a cookie and it persists across every
 * page. An editor who previews once and then browses normally is served
 * uncached, unpublished content everywhere, with nothing on screen saying so —
 * and reports the site as broken, or that an unpublished article is live.
 *
 * So the banner does two jobs: it says "this is not what readers see", and it
 * is where the way out lives. `/mag/api/exit-draft` needs no secret precisely
 * so this escape hatch cannot fail when someone needs it.
 *
 * A plain `<a>`, not a Link — leaving draft mode is a full document request
 * that has to reach the server to clear the cookie.
 */
export function PreviewBanner() {
  return (
    <div
      role="status"
      className="border-b border-border-interactive bg-surface-raised px-5 py-3 lg:px-[100px]"
    >
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-text-primary">
          <strong className="font-semibold">حالت پیش‌نمایش.</strong>{' '}
          <span className="text-text-secondary">
            این نسخه منتشرنشده است و برای خوانندگان نمایش داده نمی‌شود.
          </span>
        </p>

        <a
          href={magPath('/api/exit-draft')}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-border-interactive px-4 text-[14px] text-text-primary transition-colors hover:bg-surface-hover"
        >
          خروج از پیش‌نمایش
        </a>
      </div>
    </div>
  );
}
