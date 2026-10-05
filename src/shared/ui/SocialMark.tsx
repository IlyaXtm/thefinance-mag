/** The platforms a mark exists for. Lives here, in shared, so `features/`
    depends on `shared/` and never the reverse. */
export type SocialIcon = 'instagram' | 'telegram';

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
  }
}
