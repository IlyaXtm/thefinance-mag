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
 *
 * ── Why the glyphs are drawings now ─────────────────────────────────────
 *
 * They were the text «TG», «WA» and «@». The first two are Latin abbreviations
 * on a Persian page, which is the kind of thing this project exists to remove.
 * «@» is the worse one: it is not an email icon anywhere and never has been —
 * it is the separator in an address. A reader scanning three round buttons has
 * to decode it, and the one they decode wrongly is the one that opens their
 * mail client.
 *
 * So all three are inline SVG marks: paper plane, the WhatsApp handset, and an
 * envelope that says "email" without being read. Inline rather than an icon
 * font or a sprite because CLAUDE.md allows no third-party request and these
 * are three paths.
 *
 * ── The accessible names were already there ─────────────────────────────
 *
 * Reported as missing; they were not. Every anchor carried an `aria-label` and
 * the glyph was `aria-hidden`, so a screen reader read «هم‌رسانی در تلگرام»,
 * never «TG». What changed is the wording: «اشتراک‌گذاری» is the term readers
 * actually use for sharing, and «هم‌رسانی» — correct Persian, and the word the
 * Iranian tech press adopted — is not what the button would be called out loud.
 *
 * ── Order ───────────────────────────────────────────────────────────────
 *
 * Telegram, WhatsApp, email, in that array order. The row is a flex row in an
 * RTL document, so the first child sits at the reading edge and the sequence
 * runs right to left. No `flex-row-reverse` and no `order` — the array order IS
 * the reading order here, and anything that decouples them is a bug waiting to
 * be reintroduced by whoever edits the array next.
 */

const ICON = 'h-[18px] w-[18px]';

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={ICON}>
      <path d="M21.9 4.3 18.8 19c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9L18.4 6c.4-.3-.1-.5-.6-.2L7.7 12.2 3.1 10.7c-1-.3-1-1 .2-1.5l17.3-6.7c.8-.3 1.5.2 1.3 1.8Z" />
    </svg>
  );
}

function WhatsappMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={ICON}>
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.2-.5v-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4H8.6c-.2 0-.5.1-.7.3-.9.9-1.1 2-.7 3.2a11 11 0 0 0 4.6 4.9c1.6.8 2.6.8 3.4.7.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2Z" />
    </svg>
  );
}

function EnvelopeMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={ICON}
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.5 7 7.3 5.2a2 2 0 0 0 2.4 0L20.5 7" />
    </svg>
  );
}

export function ShareRow({ slug, title }: { slug: string; title: string }) {
  const url = magUrl(`/${slug}`);
  const text = encodeURIComponent(title);
  const encoded = encodeURIComponent(url);

  const targets = [
    {
      label: 'اشتراک‌گذاری در تلگرام',
      href: `https://t.me/share/url?url=${encoded}&text=${text}`,
      Mark: TelegramMark,
    },
    {
      label: 'اشتراک‌گذاری در واتساپ',
      href: `https://wa.me/?text=${text}%20${encoded}`,
      Mark: WhatsappMark,
    },
    {
      label: 'اشتراک‌گذاری با ایمیل',
      href: `mailto:?subject=${text}&body=${encoded}`,
      Mark: EnvelopeMark,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/*
        A visible label, not just the buttons.

        Three unlabelled circles below an article are a guess. The row is also
        no longer directly under the h1, where a caption would have competed
        with it — see the note on where this moved to and why.
      */}
      <span className="text-[13px] text-text-muted">اشتراک‌گذاری</span>

      <ul className="flex items-center gap-1.5">
        {targets.map(({ label, href, Mark }) => (
          <li key={label}>
            <a
              href={href}
              aria-label={label}
              rel="noopener noreferrer"
              target="_blank"
              /*
                44px hit area, no resting border.

                The buttons used to carry `border-border-interactive` at all
                times, which made three controls as loud as the byline they sat
                beside. The touch target is unchanged — the accessibility floor
                is 44px and this is h-11 w-11 — only the resting weight is; the
                boundary appears on hover and focus, when it is doing work.
              */
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-text-muted transition-colors hover:border-border-interactive hover:text-accent focus-visible:border-border-interactive motion-reduce:transition-none"
            >
              <Mark />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
