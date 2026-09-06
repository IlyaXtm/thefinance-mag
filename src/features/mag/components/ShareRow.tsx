import { magUrl } from '../lib/site';

/**
 * Share links — native URLs only, no third-party widgets.
 *
 * Widgets are render-blocking, leak the reader to a tracker on page load, and
 * several are unreachable from Iran (`decisions.md`). These are plain anchors:
 * nothing loads until the reader chooses to share.
 *
 * Telegram and WhatsApp are the two that matter for this audience; the third
 * is a mailto, which needs no service at all.
 */
export function ShareRow({ slug, title }: { slug: string; title: string }) {
  const url = magUrl(`/${slug}`);
  const text = encodeURIComponent(title);
  const encoded = encodeURIComponent(url);

  const targets = [
    { label: 'هم‌رسانی در تلگرام', href: `https://t.me/share/url?url=${encoded}&text=${text}`, glyph: 'TG' },
    { label: 'هم‌رسانی در واتساپ', href: `https://wa.me/?text=${text}%20${encoded}`, glyph: 'WA' },
    { label: 'هم‌رسانی با ایمیل', href: `mailto:?subject=${text}&body=${encoded}`, glyph: '@' },
  ];

  return (
    <ul className="flex items-center gap-2">
      {targets.map((target) => (
        <li key={target.label}>
          <a
            href={target.href}
            aria-label={target.label}
            rel="noopener noreferrer"
            target="_blank"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-interactive text-[12px] text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            <span aria-hidden="true" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              {target.glyph}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
