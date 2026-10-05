/** The platforms a mark exists for. Lives here, in shared, so `features/`
    depends on `shared/` and never the reverse. */
export type SocialIcon = 'instagram' | 'telegram' | 'aparat';

/**
 * Platform glyphs, drawn inline.
 *
 * Inline SVG rather than an icon package or the platforms' own hosted badges:
 * no dependency for three paths, and no third-party request — the brand
 * badges are served from the platforms' CDNs, which is a foreign request on
 * the critical path from an Iranian server.
 *
 * `currentColor` throughout, so a mark takes its link's colour in every theme
 * and follows its hover state without a token of its own. Always
 * `aria-hidden`: the link's visible label is its accessible name, and an icon
 * announcing «Telegram» beside the word «تلگرام» would say it twice.
 */
export function SocialMark({ icon, className = 'h-[18px] w-[18px]' }: { icon: SocialIcon; className?: string }) {
  switch (icon) {
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M21.9 4.3 18.8 19c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9L18.4 6c.4-.3-.1-.5-.6-.2L7.7 12.2 3.1 10.7c-1-.3-1-1 .2-1.5l17.3-6.7c.8-.3 1.5.2 1.3 1.8Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          className={className}
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'aparat':
      /* The four-lobed Aparat mark, simplified to read at 18px: a ring with a
         lobe at each corner. */
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M12 5.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6Zm0 2.3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
          <circle cx="12" cy="12" r="1.6" />
          <ellipse cx="6.2" cy="5.4" rx="2.6" ry="2.2" transform="rotate(-15 6.2 5.4)" />
          <ellipse cx="17.8" cy="18.6" rx="2.6" ry="2.2" transform="rotate(-15 17.8 18.6)" />
          <ellipse cx="18.6" cy="6.2" rx="2.2" ry="2.6" transform="rotate(-15 18.6 6.2)" />
          <ellipse cx="5.4" cy="17.8" rx="2.2" ry="2.6" transform="rotate(-15 5.4 17.8)" />
        </svg>
      );
  }
}
